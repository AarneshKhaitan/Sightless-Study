import * as tts from "./tts";

const MIN_GAP_MS = 1500;
let lastSpokenRegion: string | null = null;
let lastSpokeAt = 0;

export function shouldNarrate(
  region: string,
  isDwell: boolean
): boolean {
  const now = performance.now();

  // Never narrate while TTS is busy
  if (tts.isSpeaking()) return false;

  // Minimum gap between narrations
  if (now - lastSpokeAt < MIN_GAP_MS) return false;

  // New region: always narrate
  if (region !== lastSpokenRegion) return true;

  // Same region: only on dwell
  if (isDwell) return true;

  return false;
}

export function markSpoken(region: string) {
  lastSpokenRegion = region;
  lastSpokeAt = performance.now();
}

export function resetThrottle() {
  lastSpokenRegion = null;
  lastSpokeAt = 0;
}
