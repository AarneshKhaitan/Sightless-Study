export interface PointerSample {
  x: number; // 0-1 normalized within canvas
  y: number; // 0-1 normalized within canvas
  isDwell: boolean;
  velocity: number;
  timestamp: number;
}

type SampleCallback = (sample: PointerSample) => void;

const SAMPLE_INTERVAL_MS = 100; // ~10 Hz
const DWELL_SPEED_THRESHOLD = 0.005; // normalized units per sample
const DWELL_TIME_MS = 500;

let lastX = 0;
let lastY = 0;
let lowSpeedSince = 0;
let animFrameId = 0;
let currentCallback: SampleCallback | null = null;
let rawX = 0;
let rawY = 0;
let lastSampleTime = 0;
let canvasRect: DOMRect | null = null;

function handlePointerMove(e: PointerEvent) {
  if (!canvasRect) return;
  rawX = (e.clientX - canvasRect.left) / canvasRect.width;
  rawY = (e.clientY - canvasRect.top) / canvasRect.height;
  // Clamp to 0-1
  rawX = Math.max(0, Math.min(1, rawX));
  rawY = Math.max(0, Math.min(1, rawY));
}

function sampleLoop() {
  const now = performance.now();
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS && currentCallback) {
    const dx = rawX - lastX;
    const dy = rawY - lastY;
    const velocity = Math.sqrt(dx * dx + dy * dy);

    if (velocity < DWELL_SPEED_THRESHOLD) {
      if (lowSpeedSince === 0) lowSpeedSince = now;
    } else {
      lowSpeedSince = 0;
    }

    const isDwell =
      lowSpeedSince > 0 && now - lowSpeedSince >= DWELL_TIME_MS;

    currentCallback({
      x: rawX,
      y: rawY,
      isDwell,
      velocity,
      timestamp: now,
    });

    lastX = rawX;
    lastY = rawY;
    lastSampleTime = now;
  }

  animFrameId = requestAnimationFrame(sampleLoop);
}

export function startSampling(
  canvas: HTMLElement,
  callback: SampleCallback
) {
  stopSampling();
  canvasRect = canvas.getBoundingClientRect();
  currentCallback = callback;
  lastSampleTime = performance.now();
  lowSpeedSince = 0;

  canvas.addEventListener("pointermove", handlePointerMove);
  // Update rect on resize
  const resizeObserver = new ResizeObserver(() => {
    canvasRect = canvas.getBoundingClientRect();
  });
  resizeObserver.observe(canvas);

  animFrameId = requestAnimationFrame(sampleLoop);

  return () => {
    stopSampling();
    canvas.removeEventListener("pointermove", handlePointerMove);
    resizeObserver.disconnect();
  };
}

export function stopSampling() {
  currentCallback = null;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = 0;
  }
}
