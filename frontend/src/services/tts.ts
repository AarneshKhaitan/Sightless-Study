type TTSState = "IDLE" | "SPEAKING";

let state: TTSState = "IDLE";
let onStateChange: ((s: TTSState) => void) | null = null;

function setState(s: TTSState) {
  state = s;
  onStateChange?.(s);
}

export function getState(): TTSState {
  return state;
}

export function isSpeaking(): boolean {
  return state === "SPEAKING";
}

export function onTTSStateChange(cb: (s: TTSState) => void) {
  onStateChange = cb;
}

export function stop() {
  window.speechSynthesis.cancel();
  setState("IDLE");
}

export function speak(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    stop();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1.0;

    // Try to pick a natural-sounding voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Microsoft"))
    );
    if (preferred) {
      utterance.voice = preferred;
    }

    utterance.onstart = () => setState("SPEAKING");

    utterance.onend = () => {
      setState("IDLE");
      resolve();
    };

    utterance.onerror = (e) => {
      setState("IDLE");
      // "interrupted" and "canceled" are normal when we call stop()
      if (e.error === "interrupted" || e.error === "canceled") {
        resolve();
      } else {
        reject(new Error(`TTS error: ${e.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

// Cancel speech on page unload/reload
window.addEventListener("beforeunload", () => {
  window.speechSynthesis.cancel();
});
