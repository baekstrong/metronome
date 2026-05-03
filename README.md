# Interval Metronome

`BPM` 대신 `초 단위 간격`으로 반복음을 재생하는 SwiftUI 메트로놈 앱입니다.

## MVP 기능

- 0.5초부터 30초까지 간격 설정
- 시작 / 정지
- 다음 소리까지 남은 시간 표시
- 누적 재생 횟수 표시
- 미리 듣기 버튼

## 구조

- `Sources/MetronomeCore`
  - 간격 기반 스케줄 계산 로직
- `Sources/IntervalMetronomeApp`
  - SwiftUI 화면
  - 재생 상태 관리
  - 짧은 비프 톤 생성 및 재생

## 참고

현재 저장소는 Swift Package 기반으로 구성되어 있습니다. 로컬 환경에 Xcode 전체가 설치되어 있지 않으면 앱 실행 검증은 제한될 수 있습니다.
