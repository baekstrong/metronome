# CLAUDE.md

<!-- GIT-WORKFLOW-RULE:START -->
## ⚠️ Git 작업 규칙 (필수)

이 저장소에서 작업할 때는 아래 순서를 **반드시** 지킨다.

### 1. 작업 시작 시 — 가장 먼저 `git pull`
원격의 최신 변경사항을 받아온 뒤에 작업을 시작한다.
```bash
git pull
```
- 충돌(conflict)이 나면 작업 전에 먼저 해결한다.
- pull 없이 곧바로 코드를 수정하지 않는다.

### 2. 작업 종료 시 — `add` → `commit` → `push`
변경사항을 반드시 커밋하고 원격에 푸시한 뒤 작업을 마친다.
```bash
git add -A
git commit -m "<한글 커밋 메시지>"
git push
```
- 커밋 메시지는 **한글**로, 무엇을·왜 바꿨는지 알 수 있게 작성한다.
- 변경사항이 있는데 커밋/푸시하지 않고 작업을 끝내지 않는다.
<!-- GIT-WORKFLOW-RULE:END -->


## 개요
BPM이 아니라 **초 단위 간격**으로 반복음(비프)을 재생하는 인터벌 메트로놈. 동일 개념을 **정적 웹 앱(JS)** 과 **Swift Package(SwiftUI/macOS)** 두 가지로 각각 구현해 둔 저장소다.

## 기술 스택
- **웹 구현(주 배포 대상)**: 의존성 없는 바닐라 JS + Web Audio API, `index.html` / `app.js` / `styles.css`. PWA(`site.webmanifest`), GitHub Pages 배포.
- **Swift 구현**: Swift 6.1 tools / macOS 14+, SwiftUI 앱 + 별도 코어 라이브러리. AVFoundation으로 톤 생성.

두 구현은 코드 공유가 전혀 없는 **독립 포팅**이다. 같은 "초 간격 메트로놈" 개념만 공유하며, 한쪽을 고쳐도 다른 쪽에 자동 반영되지 않는다. 기능 범위도 다르다(아래 주의사항 참고).

## 자주 쓰는 명령어
웹: 빌드 과정 없음. `index.html`을 브라우저로 직접 열면 동작한다. (배포는 GitHub Pages, `main` 브랜치 `/ (root)`)

Swift:
```sh
swift build
swift test          # MetronomeCoreTests (스케줄 로직 단위 테스트)
swift run IntervalMetronomeApp   # SwiftUI 앱 실행 (macOS GUI)
```

## 아키텍처
### 오디오 타이밍 (핵심)
양쪽 모두 "setInterval로 N초마다" 식의 누적 드리프트 방식을 **쓰지 않는다.** 절대 시각(틱 목표 시각)을 기준으로 다음 틱을 계산한다.
- **웹(`app.js`)**: `nextTickAt`을 `performance.now()` 기준 절대 시각으로 잡고, 매 틱마다 `nextTickAt += intervalSeconds * 1000`으로 누적해 드리프트를 막는다. 실제 비프는 `scheduleNextTick()`의 `setTimeout` + Web Audio의 `currentTime + 0.02` 스케줄링으로 낸다. 카운트다운/남은시간 표시는 별도 `requestAnimationFrame` 루프(`startCountdownLoop`)가 담당한다.
- **Swift(`MetronomeViewModel`)**: `ContinuousClock` + `clock.sleep(until:tolerance:)`로 절대 시각 틱을 기다린다. 재생 Task와 카운트다운 Task(50ms 폴링)가 분리되어 있다.

### Swift Package 구성
- `Sources/MetronomeCore/MetronomeSchedule.swift`: 순수 타이밍 로직(`Sendable` struct). `Duration` 기반 first/next 틱 계산. **테스트 대상은 여기뿐**.
- `Sources/IntervalMetronomeApp/`: 실행 앱. `MetronomeViewModel`(상태/스케줄), `TonePlayer`(AVAudioEngine으로 1320Hz 톤 PCM 버퍼 미리 생성 후 재생), `ContentView`, `IntervalMetronomeApp`(@main).

### 웹 UI 특징
- iOS 스타일 휠 피커(`wheel-column`)로 Interval / Run Time(min·sec) 선택. 스크롤이 멈추면(`onWheelSettle`, 130ms 디바운스) 값이 확정되고 clamp된다.
- `localStorage`에 interval / volume / duration 저장.
- 화면 꺼짐 방지로 `navigator.wakeLock` 사용, 탭 visibility 변경 시 `AudioContext.resume()`.

## 컨벤션
- 웹: 외부 라이브러리/프레임워크/번들러 없음. 새 의존성 추가 금지, 바닐라 JS 유지. UI 텍스트는 한국어, 코드 식별자는 영어.
- Swift: 코어 타이밍 로직은 `MetronomeCore`에 두고 단위 테스트로 커버. UI/오디오 부수효과는 `IntervalMetronomeApp`에 격리. `@MainActor` 모델 + Swift Concurrency `Task` 사용.

## 주의사항·함정
- **두 구현의 기능 범위가 다르다.** 웹에는 Volume 조절, Run Time(자동 정지), 휠 피커, 누적 Played 카운트가 있으나 Swift 구현에는 interval + preview 정도만 있고 volume/duration 개념이 없다. "메트로놈 기능을 바꿔달라"는 요청은 **어느 구현인지 먼저 확인**할 것.
- **README.md가 일부 옛 상태다.** README는 "0.5~30초"라고 적혀 있으나 실제 `app.js`는 interval `1~60초`(`MIN_INTERVAL=1`, `MAX_INTERVAL=60`)다. 또 README의 "미리 듣기 버튼"은 현재 웹 UI에 없다(미리듣기는 Swift `playPreview`에만 존재). 동작 기준은 README가 아니라 코드.
- 웹 볼륨은 `masterGain`이 아니라 틱마다 `getPeakGain()`(비선형 곡선)으로 적용한다. `applyVolume()`는 사실상 마스터 게인을 1로 고정만 한다.
- `swift run`은 macOS GUI 앱이라 headless 환경에서는 실행되지 않을 수 있다. 로직 검증은 `swift test`로.
