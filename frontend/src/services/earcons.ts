/**
 * Simple earcon tones using the Web Audio API.
 * Short sounds to signal voice state transitions.
 */

let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext();
  }
  return ctx;
}

function playTone(frequency: number, durationMs: number, type: OscillatorType = "sine") {
  try {
    const ac = getContext();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + durationMs / 1000);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + durationMs / 1000);
  } catch {
    // AudioContext may not be available
  }
}

/** Short rising tone: ASR started listening */
export function earconListening() {
  playTone(440, 120);
  setTimeout(() => playTone(660, 120), 80);
}

/** Short falling tone: TTS started speaking */
export function earconSpeaking() {
  playTone(660, 120);
  setTimeout(() => playTone(440, 120), 80);
}

/** Single click: action confirmed */
export function earconConfirm() {
  playTone(880, 80, "triangle");
}
