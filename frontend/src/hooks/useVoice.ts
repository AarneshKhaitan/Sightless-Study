import { useCallback, useEffect, useRef, useState } from "react";
import { useTutor } from "../context/TutorContext";
import * as tts from "../services/tts";
import * as asr from "../services/asr";
import { parseIntent, type ParsedIntent } from "../services/intentParser";

export type VoiceState = "SPEAKING" | "LISTENING" | "EXECUTING" | "IDLE";

interface UseVoiceReturn {
  voiceState: VoiceState;
  speak: (text: string) => Promise<void>;
  lastTranscript: string;
}

export function useVoice(
  onIntent: (intent: ParsedIntent, transcript: string) => void,
  enabled = true
): UseVoiceReturn {
  const { state } = useTutor();
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [lastTranscript, setLastTranscript] = useState("");
  const onIntentRef = useRef(onIntent);
  onIntentRef.current = onIntent;
  const stateRef = useRef(state);
  stateRef.current = state;

  const speakAndResume = useCallback(async (text: string) => {
    asr.pauseListening();
    setVoiceState("SPEAKING");
    try {
      await tts.speak(text);
    } finally {
      // Wait 500ms after TTS finishes before resuming ASR
      // to prevent the microphone from picking up the tail end of speech
      await new Promise((r) => setTimeout(r, 500));
      setVoiceState("LISTENING");
      asr.resumeListening();
    }
  }, []);

  // Handle ASR results
  const handleTranscript = useCallback(
    (transcript: string) => {
      setLastTranscript(transcript);
      const intent = parseIntent(transcript, stateRef.current.mode);

      if (!intent.action && !intent.special) {
        // Not recognized
        speakAndResume(
          "I didn't catch that. Say Help to hear your options."
        );
        return;
      }

      setVoiceState("EXECUTING");
      onIntentRef.current(intent, transcript);
    },
    [speakAndResume]
  );

  // Start ASR when enabled
  useEffect(() => {
    if (!enabled) return;
    if (asr.isASRSupported()) {
      asr.startListening(handleTranscript);
      setVoiceState("LISTENING");
    }
    return () => {
      asr.stopListening();
      tts.stop();
    };
  }, [handleTranscript, enabled]);

  return {
    voiceState,
    speak: speakAndResume,
    lastTranscript,
  };
}
