const intervalSlider = document.querySelector("#intervalSlider");
const intervalValue = document.querySelector("#intervalValue");
const volumeSlider = document.querySelector("#volumeSlider");
const volumeValue = document.querySelector("#volumeValue");
const minColumn = document.querySelector("#minColumn");
const secColumn = document.querySelector("#secColumn");
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
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_PAD_COUNT = 2;
const MIN_DURATION = 10;
const MAX_DURATION = 1800;
const MAX_MINUTE = 30;
const MAX_SECOND = 59;

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
let wakeLock = null;

intervalSlider.value = String(intervalSeconds);
volumeSlider.value = String(volumePercent);
setupDurationWheel();
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

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    setStatus(isRunning ? "백그라운드 상태에서도 현재 탭 기준으로 계속 진행 중" : "탭이 비활성화됨");
    return;
  }

  if (isRunning) {
    acquireWakeLock();
    if (audioContext && audioContext.state !== "running") {
      audioContext.resume().catch(() => {});
    }
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
  if (audioContext) {
    if (audioContext.state !== "running") {
      try {
        await audioContext.resume();
      } catch {}
    }
    if (audioContext.state !== "running") {
      try {
        await audioContext.close();
      } catch {}
      audioContext = null;
      masterGain = null;
    }
  }

  if (!audioContext) {
    audioContext = new AudioContext();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioContext.destination);
  }

  applyVolume();

  if (audioContext.state !== "running") {
    try {
      await audioContext.resume();
    } catch {}
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

  acquireWakeLock();
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
  releaseWakeLock();

  if (resetCount) {
    setStatus("정지됨");
  }
}

function scheduleNextTick() {
  if (!isRunning) {
    return;
  }

  const delay = Math.max(0, nextTickAt - performance.now());
  timeoutId = window.setTimeout(async () => {
    if (!isRunning) {
      return;
    }

    if (performance.now() >= stopAt) {
      finishMetronome();
      return;
    }

    if (audioContext && audioContext.state !== "running") {
      try {
        await audioContext.resume();
      } catch {}
    }
    if (!isRunning) {
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

  const start = audioContext.currentTime + 0.02;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const peakGain = getPeakGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(1320, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

  oscillator.connect(gain);
  gain.connect(masterGain);

  oscillator.start(start);
  oscillator.stop(start + 0.13);
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
  return 1.28 + normalized * normalized * 102.4;
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

let minWheelTimer = null;
let secWheelTimer = null;

function setupDurationWheel() {
  buildWheelColumn(minColumn, MAX_MINUTE);
  buildWheelColumn(secColumn, MAX_SECOND);

  const initialMin = Math.min(MAX_MINUTE, Math.floor(durationSeconds / 60));
  const initialSec = Math.min(MAX_SECOND, durationSeconds - initialMin * 60);

  requestAnimationFrame(() => {
    setWheelScroll(minColumn, initialMin);
    setWheelScroll(secColumn, initialSec);
    updateSelectedItem(minColumn);
    updateSelectedItem(secColumn);
  });

  attachWheelListener(minColumn, "min");
  attachWheelListener(secColumn, "sec");
}

function buildWheelColumn(column, max) {
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < WHEEL_PAD_COUNT; i += 1) {
    fragment.appendChild(createWheelItem("", true));
  }
  for (let i = 0; i <= max; i += 1) {
    fragment.appendChild(createWheelItem(String(i).padStart(2, "0"), false, i));
  }
  for (let i = 0; i < WHEEL_PAD_COUNT; i += 1) {
    fragment.appendChild(createWheelItem("", true));
  }
  column.appendChild(fragment);
}

function createWheelItem(text, isSpacer, value) {
  const item = document.createElement("div");
  item.className = isSpacer ? "wheel-item wheel-spacer" : "wheel-item";
  item.textContent = text;
  if (!isSpacer) {
    item.dataset.value = String(value);
  }
  return item;
}

function setWheelScroll(column, value) {
  column.scrollTop = value * WHEEL_ITEM_HEIGHT;
}

function smoothScrollWheel(column, value) {
  column.scrollTo({ top: value * WHEEL_ITEM_HEIGHT, behavior: "smooth" });
}

function getWheelValue(column) {
  return Math.round(column.scrollTop / WHEEL_ITEM_HEIGHT);
}

function updateSelectedItem(column) {
  const centerIndex = Math.round(column.scrollTop / WHEEL_ITEM_HEIGHT) + WHEEL_PAD_COUNT;
  const items = column.children;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    item.classList.remove("is-selected", "is-near");
    if (i === centerIndex) {
      item.classList.add("is-selected");
    } else if (Math.abs(i - centerIndex) === 1) {
      item.classList.add("is-near");
    }
  }
}

function attachWheelListener(column, kind) {
  column.addEventListener("scroll", () => {
    updateSelectedItem(column);
    const timerRef = kind === "min" ? minWheelTimer : secWheelTimer;
    if (timerRef) {
      clearTimeout(timerRef);
    }
    const next = window.setTimeout(() => onWheelSettle(kind), 130);
    if (kind === "min") {
      minWheelTimer = next;
    } else {
      secWheelTimer = next;
    }
  });
}

function onWheelSettle(kind) {
  const rawMin = clampWheel(getWheelValue(minColumn), MAX_MINUTE);
  const rawSec = clampWheel(getWheelValue(secColumn), MAX_SECOND);
  let min = rawMin;
  let sec = rawSec;
  let total = min * 60 + sec;

  if (total < MIN_DURATION) {
    if (min === 0) {
      sec = MIN_DURATION;
    } else {
      total = min * 60 + sec;
    }
  } else if (total > MAX_DURATION) {
    min = MAX_MINUTE;
    sec = 0;
  }

  total = min * 60 + sec;

  if (min !== rawMin) {
    smoothScrollWheel(minColumn, min);
  }
  if (sec !== rawSec) {
    smoothScrollWheel(secColumn, sec);
  }

  durationSeconds = clampDuration(total);
  localStorage.setItem(DURATION_STORAGE_KEY, String(durationSeconds));
  renderDuration();

  if (!isRunning) {
    renderRunRemaining(durationSeconds);
  }
}

function clampWheel(value, max) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, value));
}

async function acquireWakeLock() {
  if (!("wakeLock" in navigator) || wakeLock) {
    return;
  }

  try {
    const lock = await navigator.wakeLock.request("screen");
    wakeLock = lock;
    lock.addEventListener("release", () => {
      if (wakeLock === lock) {
        wakeLock = null;
      }
    });
  } catch {}
}

function releaseWakeLock() {
  if (!wakeLock) return;
  const lock = wakeLock;
  wakeLock = null;
  lock.release().catch(() => {});
}
