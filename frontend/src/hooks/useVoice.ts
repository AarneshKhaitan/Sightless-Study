import { useCallback, useRef, useState } from "react";
import { useTutor } from "../context/TutorContext";
import * as tts from "../services/tts";
import * as recorder from "../services/recorder";
import { sendVoice, type VoiceResult } from "../api/client";
import { muteNarration, unmuteNarration } from "../services/narrationThrottle";

export type VoiceState = "IDLE" | "RECORDING" | "PROCESSING" | "SPEAKING";

export interface UseVoiceReturn {
  voiceState: VoiceState;
  speak: (text: string) => Promise<void>;
  lastTranscript: string;
  interrupt: () => void;
}

export function useVoice(
  onVoiceResult: (result: VoiceResult) => void,
  enabled = true
): UseVoiceReturn {
  const { state } = useTutor();
  const [voiceState, setVoiceState] = useState<VoiceState>("IDLE");
  const [lastTranscript, setLastTranscript] = useState("");
  const onResultRef = useRef(onVoiceResult);
  onResultRef.current = onVoiceResult;
  const stateRef = useRef(state);
  stateRef.current = state;
  const busyRef = useRef(false);

  const speak = useCallback(async (text: string) => {
    setVoiceState("SPEAKING");
    muteNarration();
    try {
      await tts.speak(text);
    } finally {
      setVoiceState("IDLE");
      unmuteNarration();
    }
  }, []);

  const processRecording = useCallback(async () => {
    if (!recorder.isRecording()) return;

    try {
      const blob = await recorder.stopRecording();
      setVoiceState("PROCESSING");

      const s = stateRef.current;
      const result = await sendVoice(blob, {
        docId: s.docId,
        pageNo: s.pageNo,
        chunkIndex: s.chunkIndex,
        mode: s.mode,
        modeId: s.modeId,
        formulaStep: s.formulaStep,
      });

      setLastTranscript(result.transcript);
      onResultRef.current(result);
    } catch (err) {
      console.error("Voice processing error:", err);
      setVoiceState("IDLE");
      unmuteNarration();
    }
  }, []);

  const startRecordingFlow = useCallback(async () => {
    if (!enabled || busyRef.current) return;
    busyRef.current = true;

    try {
      muteNarration();
      await recorder.startRecording();
      setVoiceState("RECORDING");
    } catch (err) {
      console.error("Mic error:", err);
      setVoiceState("IDLE");
    } finally {
      busyRef.current = false;
    }
  }, [enabled]);

  const interrupt = useCallback(() => {
    if (!enabled) return;

    if (voiceState === "SPEAKING") {
      // Cancel TTS and start recording
      tts.stop();
      startRecordingFlow();
    } else if (voiceState === "IDLE") {
      // Start recording
      startRecordingFlow();
    } else if (voiceState === "RECORDING") {
      // Stop recording and process
      processRecording();
    }
    // If PROCESSING, ignore tap (waiting for backend)
  }, [voiceState, enabled, startRecordingFlow, processRecording]);

  return {
    voiceState,
    speak,
    lastTranscript,
    interrupt,
  };
}
