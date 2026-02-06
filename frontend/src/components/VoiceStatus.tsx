import { useEffect, useRef } from "react";
import type { VoiceState } from "../hooks/useVoice";
import { earconListening, earconSpeaking } from "../services/earcons";

interface Props {
  state: VoiceState;
  lastTranscript: string;
}

const stateStyles: Record<VoiceState, { bg: string; label: string }> = {
  SPEAKING: { bg: "#f07070", label: "Speaking" },
  LISTENING: { bg: "#4cc9f0", label: "Listening" },
  EXECUTING: { bg: "#f0c040", label: "Executing" },
  IDLE: { bg: "#555", label: "Idle" },
};

export default function VoiceStatus({ state, lastTranscript }: Props) {
  const { bg, label } = stateStyles[state];
  const prevState = useRef<VoiceState>(state);

  useEffect(() => {
    if (prevState.current === state) return;
    if (state === "LISTENING") earconListening();
    else if (state === "SPEAKING") earconSpeaking();
    prevState.current = state;
  }, [state]);

  return (
    <div
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "0.5rem",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: bg,
          color: "#111",
          padding: "0.6rem 1.2rem",
          borderRadius: "8px",
          fontSize: "1.1rem",
          fontWeight: "bold",
        }}
      >
        {label}
      </div>
      {lastTranscript && (
        <div
          style={{
            background: "#222",
            color: "#aaa",
            padding: "0.4rem 0.8rem",
            borderRadius: "6px",
            fontSize: "0.85rem",
            maxWidth: "300px",
            textAlign: "right",
          }}
        >
          "{lastTranscript}"
        </div>
      )}
    </div>
  );
}
