const intervalSlider = document.querySelector("#intervalSlider");
const intervalValue = document.querySelector("#intervalValue");
const volumeSlider = document.querySelector("#volumeSlider");
const volumeValue = document.querySelector("#volumeValue");
const durationSlider = document.querySelector("#durationSlider");
const durationValue = document.querySelector("#durationValue");
const countdownValue = document.querySelector("#countdownValue");
const runRemainingValue = document.querySelector("#runRemainingValue");
const playedValue = document.querySelector("#playedValue");
const startStopButton = document.querySelector("#startStopButton");
const resetPlayedButton = document.querySelector("#resetPlayedButton");
const statusText = document.querySelector("#statusText");

const INTERVAL_STORAGE_KEY = "interval-metronome-seconds";
const VOLUME_STORAGE_KEY = "interval-metronome-volume";
const DURATION_STORAGE_KEY = "interval-metronome-duration";
const MIN_INTERVAL = 0.5;
const DEFAULT_INTERVAL = Number(localStorage.getItem(INTERVAL_STORAGE_KEY) ?? 5);
const DEFAULT_VOLUME = Number(localStorage.getItem(VOLUME_STORAGE_KEY) ?? 50);
const DEFAULT_DURATION = Number(localStorage.getItem(DURATION_STORAGE_KEY) ?? 300);

let audioContext = null;
let masterGain = null;
let intervalSeconds = clampInterval(DEFAULT_INTERVAL);
let volumePercent = clampVolume(DEFAULT_VOLUME);
let durationSeconds = clampDuration(DEFAULT_DURATION);
let isRunning = false;
let tickCount = 0;
let nextTickAt = 0;
let stopAt = 0;
let timeoutId = null;
let rafId = null;

intervalSlider.value = String(intervalSeconds);
volumeSlider.value = String(volumePercent);
durationSlider.value = String(durationSeconds);
renderInterval();
renderVolume();
renderDuration();
renderCountdown(intervalSeconds);
renderRunRemaining(durationSeconds);
renderPlayed();
setStatus("브라우저에서 사용할 준비가 됐습니다.");

intervalSlider.addEventListener("input", () => {
  intervalSeconds = clampInterval(Number(intervalSlider.value));
  localStorage.setItem(INTERVAL_STORAGE_KEY, String(intervalSeconds));
  renderInterval();

  if (!isRunning) {
    renderCountdown(intervalSeconds);
  }
});

volumeSlider.addEventListener("input", () => {
  volumePercent = clampVolume(Number(volumeSlider.value));
  localStorage.setItem(VOLUME_STORAGE_KEY, String(volumePercent));
  applyVolume();
  renderVolume();
});

durationSlider.addEventListener("input", () => {
  durationSeconds = clampDuration(Number(durationSlider.value));
  localStorage.setItem(DURATION_STORAGE_KEY, String(durationSeconds));
  renderDuration();

  if (!isRunning) {
    renderRunRemaining(durationSeconds);
  }
});

startStopButton.addEventListener("click", async () => {
  if (isRunning) {
    stopMetronome();
    return;
  }

  await ensureAudioReady();
  startMetronome();
});

resetPlayedButton.addEventListener("click", () => {
  tickCount = 0;
  renderPlayed();
  setStatus("Played 카운트 초기화됨");
});

window.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setStatus(isRunning ? "백그라운드 상태에서도 현재 탭 기준으로 계속 진행 중" : "탭이 비활성화됨");
  } else if (isRunning) {
    setStatus(`${intervalSeconds.toFixed(1)}초 간격으로 재생 중`);
  }
});

function clampInterval(value) {
  return Math.min(30, Math.max(MIN_INTERVAL, Number.isFinite(value) ? value : 5));
}

function clampVolume(value) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 50));
}

function clampDuration(value) {
  return Math.min(1800, Math.max(10, Number.isFinite(value) ? value : 300));
}

async function ensureAudioReady() {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioContext.destination);
  }

  applyVolume();

  if (audioContext.state === "suspended") {
    await audioContext.resume();
  }

  setStatus("오디오 엔진 준비 완료");
}

function startMetronome() {
  stopMetronome(false);

  isRunning = true;
  tickCount = 0;
  nextTickAt = performance.now() + intervalSeconds * 1000;
  stopAt = performance.now() + durationSeconds * 1000;

  renderPlayed();
  renderCountdown(intervalSeconds);
  renderRunRemaining(durationSeconds);
  startStopButton.textContent = "Stop";
  setStatus(`${formatClock(durationSeconds)} 동안 ${intervalSeconds.toFixed(1)}초 간격으로 재생 중`);

  scheduleNextTick();
  startCountdownLoop();
}

function stopMetronome(resetCount = true) {
  isRunning = false;

  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  nextTickAt = 0;
  stopAt = 0;
  startStopButton.textContent = "Start";
  renderCountdown(intervalSeconds);
  renderRunRemaining(durationSeconds);

  if (resetCount) {
    setStatus("정지됨");
  }
}

function scheduleNextTick() {
  if (!isRunning) {
    return;
  }

  const delay = Math.max(0, nextTickAt - performance.now());
  timeoutId = window.setTimeout(() => {
    if (!isRunning) {
      return;
    }

    if (performance.now() >= stopAt) {
      finishMetronome();
      return;
    }

    playTick();
    tickCount += 1;
    renderPlayed();

    nextTickAt += intervalSeconds * 1000;
    scheduleNextTick();
  }, delay);
}

function startCountdownLoop() {
  const loop = () => {
    if (!isRunning) {
      return;
    }

    const runRemaining = Math.max(0, (stopAt - performance.now()) / 1000);
    renderRunRemaining(runRemaining);

    if (runRemaining <= 0) {
      finishMetronome();
      return;
    }

    const remaining = Math.max(0, (nextTickAt - performance.now()) / 1000);
    renderCountdown(remaining);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

function finishMetronome() {
  stopMetronome(false);
  renderRunRemaining(0);
  setStatus("설정한 시간이 끝나서 자동 정지됨");
}

function playTick() {
  if (!audioContext || !masterGain) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const peakGain = getPeakGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(1320, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  oscillator.connect(gain);
  gain.connect(masterGain);

  oscillator.start(now);
  oscillator.stop(now + 0.13);
}

function applyVolume() {
  if (!masterGain) {
    return;
  }

  masterGain.gain.value = 1;
}

function getPeakGain() {
  if (volumePercent <= 0) {
    return 0.0001;
  }

  const normalized = volumePercent / 100;
  return 0.08 + normalized * normalized * 6.4;
}

function renderInterval() {
  intervalValue.textContent = intervalSeconds.toFixed(intervalSeconds < 10 ? 1 : 0);
}

function renderVolume() {
  volumeValue.textContent = String(volumePercent);
}

function renderDuration() {
  durationValue.textContent = formatClock(durationSeconds);
}

function renderCountdown(value) {
  countdownValue.textContent = value.toFixed(1);
}

function renderRunRemaining(value) {
  runRemainingValue.textContent = formatClock(value);
}

function renderPlayed() {
  playedValue.textContent = String(tickCount);
}

function setStatus(message) {
  statusText.textContent = message;
}

function formatClock(value) {
  const safeValue = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
