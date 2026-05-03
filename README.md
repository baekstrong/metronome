# Interval Metronome

`BPM` 대신 `초 단위 간격`으로 반복음을 재생하는 정적 웹 앱입니다.

## 기능

- 0.5초부터 30초까지 간격 설정
- 시작 / 정지
- 다음 소리까지 남은 시간 표시
- 누적 재생 횟수 표시
- 미리 듣기 버튼
- 브라우저 `localStorage` 기반 간격 저장

## 파일 구조

- `index.html`
  - 앱 마크업
- `styles.css`
  - 반응형 UI 스타일
- `app.js`
  - Web Audio API 기반 비프 사운드
  - 초 단위 스케줄링 로직

## GitHub Pages 배포

1. GitHub 저장소의 `Settings`로 이동
2. 왼쪽 메뉴에서 `Pages` 선택
3. `Build and deployment`에서 `Deploy from a branch` 선택
4. 브랜치를 `main`, 폴더를 `/ (root)`로 선택
5. 저장 후 몇 분 기다리면 사이트가 배포됨

예상 주소:

`https://baekstrong.github.io/metronome/`

## 로컬 실행

정적 파일만 사용하므로 브라우저에서 `index.html`을 바로 열어도 동작합니다.
