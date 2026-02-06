import * as tts from "./tts";

const MIN_GAP_MS = 3000;
let lastSpokenRegion: string | null = null;
let lastSpokeAt = 0;
let muted = false;

export function shouldNarrate(
  region: string,
  isDwell: boolean
): boolean {
  if (muted) return false;

  const now = performance.now();

  // Never narrate while TTS is busy
  if (tts.isSpeaking()) return false;

  // Minimum gap between narrations
  if (now - lastSpokeAt < MIN_GAP_MS) return false;

  // Only narrate on dwell — no auto-fire on region entry
  if (!isDwell) return false;

  // Don't repeat the same region on consecutive dwells
  if (region === lastSpokenRegion) return false;

  return true;
}

export function markSpoken(region: string) {
  lastSpokenRegion = region;
  lastSpokeAt = performance.now();
}

export function resetThrottle() {
  lastSpokenRegion = null;
  lastSpokeAt = 0;
}

export function muteNarration() {
  muted = true;
}

export function unmuteNarration() {
  muted = false;
}
