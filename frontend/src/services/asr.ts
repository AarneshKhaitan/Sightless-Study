// Web Speech API ASR wrapper
// Handles browser compat, continuous listening, auto-restart

type ASRCallback = (transcript: string) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any = null;
let isListening = false;
let shouldBeListening = false;
let callback: ASRCallback | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognitionClass(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function createRecognition() {
  const SpeechRecognitionClass = getSpeechRecognitionClass();
  if (!SpeechRecognitionClass) return null;

  const rec = new SpeechRecognitionClass();
  rec.lang = "en-US";
  rec.continuous = true;
  rec.interimResults = false;

  rec.onresult = (event: { results: SpeechRecognitionResultList }) => {
    const last = event.results[event.results.length - 1];
    if (last?.isFinal) {
      const transcript = last[0]?.transcript?.trim().toLowerCase() ?? "";
      if (transcript && callback) {
        callback(transcript);
      }
    }
  };

  rec.onend = () => {
    isListening = false;
    // Auto-restart if we should still be listening
    if (shouldBeListening) {
      setTimeout(() => {
        if (shouldBeListening) {
          try {
            rec.start();
            isListening = true;
          } catch {
            // Already started or other error
          }
        }
      }, 100);
    }
  };

  rec.onerror = (event: { error: string }) => {
    // "no-speech" and "aborted" are normal, ignore them
    if (event.error !== "no-speech" && event.error !== "aborted") {
      console.warn("ASR error:", event.error);
    }
  };

  return rec;
}

export function isASRSupported(): boolean {
  return getSpeechRecognitionClass() !== null;
}

export function startListening(onResult: ASRCallback) {
  callback = onResult;
  shouldBeListening = true;

  if (!recognition) {
    recognition = createRecognition();
  }
  if (!recognition) {
    console.warn("SpeechRecognition not supported in this browser");
    return;
  }

  if (!isListening) {
    try {
      recognition.start();
      isListening = true;
    } catch {
      // Already started
    }
  }
}

export function stopListening() {
  shouldBeListening = false;
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch {
      // Already stopped
    }
    isListening = false;
  }
}

export function pauseListening() {
  if (recognition && isListening) {
    shouldBeListening = false;
    try {
      recognition.stop();
    } catch {
      // Already stopped
    }
    isListening = false;
  }
}

export function resumeListening() {
  if (callback) {
    startListening(callback);
  }
}
