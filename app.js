const intervalSlider = document.querySelector("#intervalSlider");
const intervalValue = document.querySelector("#intervalValue");
const countdownValue = document.querySelector("#countdownValue");
const playedValue = document.querySelector("#playedValue");
const startStopButton = document.querySelector("#startStopButton");
const previewButton = document.querySelector("#previewButton");
const statusText = document.querySelector("#statusText");

const STORAGE_KEY = "interval-metronome-seconds";
const MIN_INTERVAL = 0.5;
const DEFAULT_INTERVAL = Number(localStorage.getItem(STORAGE_KEY) ?? 5);

let audioContext = null;
let masterGain = null;
let intervalSeconds = clampInterval(DEFAULT_INTERVAL);
let isRunning = false;
let tickCount = 0;
let nextTickAt = 0;
let timeoutId = null;
let rafId = null;

intervalSlider.value = String(intervalSeconds);
renderInterval();
renderCountdown(intervalSeconds);
renderPlayed();
setStatus("브라우저에서 사용할 준비가 됐습니다.");

intervalSlider.addEventListener("input", () => {
  intervalSeconds = clampInterval(Number(intervalSlider.value));
  localStorage.setItem(STORAGE_KEY, String(intervalSeconds));
  renderInterval();

  if (!isRunning) {
    renderCountdown(intervalSeconds);
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

previewButton.addEventListener("click", async () => {
  await ensureAudioReady();
  playTick();
  setStatus("미리 듣기 재생");
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

async function ensureAudioReady() {
  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(audioContext.destination);
  }

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

  renderPlayed();
  renderCountdown(intervalSeconds);
  startStopButton.textContent = "Stop";
  setStatus(`${intervalSeconds.toFixed(1)}초 간격으로 재생 중`);

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
  startStopButton.textContent = "Start";
  renderCountdown(intervalSeconds);

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

    const remaining = Math.max(0, (nextTickAt - performance.now()) / 1000);
    renderCountdown(remaining);
    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
}

function playTick() {
  if (!audioContext || !masterGain) {
    return;
  }

  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(1320, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(1.0, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

  oscillator.connect(gain);
  gain.connect(masterGain);

  oscillator.start(now);
  oscillator.stop(now + 0.13);
}

function renderInterval() {
  intervalValue.textContent = intervalSeconds.toFixed(intervalSeconds < 10 ? 1 : 0);
}

function renderCountdown(value) {
  countdownValue.textContent = value.toFixed(1);
}

function renderPlayed() {
  playedValue.textContent = String(tickCount);
}

function setStatus(message) {
  statusText.textContent = message;
}
