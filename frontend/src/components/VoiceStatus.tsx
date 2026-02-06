import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { VoiceState } from "../hooks/useVoice";
import { earconListening, earconSpeaking } from "../services/earcons";
import { colors, radius, shadows, spacing, typography } from "../theme";

interface Props {
  state: VoiceState;
  lastTranscript: string;
}

const stateConfig: Record<VoiceState, { bg: string; label: string; icon: string }> = {
  SPEAKING: { bg: colors.accent.primary, label: "Speaking", icon: "🔊" },
  RECORDING: { bg: colors.status.error, label: "Recording", icon: "🎙️" },
  PROCESSING: { bg: colors.status.warning, label: "Processing", icon: "⏳" },
  IDLE: { bg: colors.bg.elevated, label: "Tap to speak", icon: "🎤" },
};

export default function VoiceStatus({ state, lastTranscript }: Props) {
  const { bg, label, icon } = stateConfig[state];
  const prevState = useRef<VoiceState>(state);

  useEffect(() => {
    if (prevState.current === state) return;
    if (state === "RECORDING") earconListening();
    else if (state === "SPEAKING") earconSpeaking();
    prevState.current = state;
  }, [state]);

  return (
    <div
      style={{
        position: "fixed",
        top: spacing.md,
        right: spacing.md,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: spacing.sm,
        zIndex: 100,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={state}
          initial={{ opacity: 0, scale: 0.9, y: -5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 5 }}
          transition={{ duration: 0.2 }}
          style={{
            background: state === "IDLE" ? colors.bg.elevated : bg,
            color: state === "IDLE" ? colors.text.secondary : colors.text.inverse,
            padding: `${spacing.sm} ${spacing.md}`,
            borderRadius: radius.full,
            fontSize: typography.size.sm,
            fontWeight: typography.weight.semibold,
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            boxShadow: shadows.md,
            animation: state === "RECORDING" ? "pulse 1s infinite" : undefined,
          }}
        >
          <span style={{ fontSize: "1rem" }}>{icon}</span>
          {label}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {lastTranscript && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            style={{
              background: colors.bg.card,
              color: colors.text.secondary,
              padding: `${spacing.xs} ${spacing.md}`,
              borderRadius: radius.sm,
              fontSize: typography.size.xs,
              maxWidth: "280px",
              textAlign: "right",
              boxShadow: shadows.sm,
              border: `1px solid ${colors.bg.tertiary}`,
            }}
          >
            &ldquo;{lastTranscript}&rdquo;
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
