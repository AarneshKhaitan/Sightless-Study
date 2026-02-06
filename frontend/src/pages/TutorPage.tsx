import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Chunk, DocumentManifest, FormulaModule, TutorMode, VisualModule } from "../types";
import { TutorProvider, useTutor } from "../context/TutorContext";
import { useVoice } from "../hooks/useVoice";
import type { VoiceResult } from "../api/client";
import VoiceStatus from "../components/VoiceStatus";
import ReadingView from "../components/ReadingView";
import FormulaView from "../components/FormulaView";
import VisualView, { type VisualViewHandle } from "../components/VisualView";
import BigButtons from "../components/BigButtons";
import { colors, radius, shadows, spacing, typography } from "../theme";

interface Props {
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
  onExit?: () => void;
}

// Map orchestrator action strings to reducer dispatch calls
const SIMPLE_ACTIONS = new Set([
  "NEXT_CHUNK",
  "PREV_CHUNK",
  "ENTER_QA",
  "EXIT_QA",
  "FORMULA_SYMBOLS",
  "FORMULA_EXAMPLE",
  "FORMULA_INTUITION",
  "FORMULA_NEXT_STEP",
  "FORMULA_PREV_STEP",
  "ENTER_EXPLORE",
  "EXIT_EXPLORE",
  "MARK_POINT",
]);

// Visual-mode special commands handled by VisualView
const VISUAL_SPECIALS = new Set([
  "START_EXPLORING",
  "WHAT_IS_HERE",
  "DESCRIBE_VISUAL",
  "MARK_THIS",
  "GUIDE_TO",
  "IM_DONE",
  "NEXT_KEY_POINT",
  "QUICK_EXIT_VISUAL",
]);

const MODE_LABELS: Record<string, { label: string; color: string }> = {
  READING: { label: "Reading", color: colors.accent.primary },
  FORMULA: { label: "Formula", color: colors.accent.secondary },
  VISUAL: { label: "Explorer", color: colors.accent.pink },
};

function TutorContent({ onExit }: { onExit?: () => void }) {
  const { state, pageChunks, manifest, dispatch } = useTutor();
  const visualRef = useRef<VisualViewHandle>(null);
  const [hasStarted, setHasStarted] = useState(false);

  const speakRef = useRef<(text: string) => Promise<void>>(async () => {});

  const handleVoiceResult = useCallback(
    (result: VoiceResult) => {
      const doSpeak = speakRef.current;
      const { action, payload, speech } = result;

      // Dispatch reducer action
      if (action) {
        if (SIMPLE_ACTIONS.has(action)) {
          if (action === "NEXT_CHUNK" && state.returnPosition) {
            dispatch({ type: "EXIT_QA" });
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dispatch({ type: action } as any);
          }
        } else if (action === "SET_MODE" && payload && typeof payload === "object") {
          const p = payload as Record<string, unknown>;
          dispatch({
            type: "SET_MODE",
            mode: ((p.mode as string) ?? "READING") as TutorMode,
            modeId: (p.modeId as string) ?? null,
          });
        } else if (action === "START_GUIDANCE" && payload) {
          dispatch({ type: "START_GUIDANCE", target: String(payload) });
        } else if (action === "SUMMARIZE") {
          const pageText = pageChunks.map((c) => c.text).join(" ");
          doSpeak(`Summary of this page: ${pageText}`);
          return;
        } else if (action === "END_LECTURE") {
          if (speech) doSpeak(speech);
          setTimeout(() => onExit?.(), 3000);
          return;
        }
      }

      // Handle visual-mode special commands via payload
      if (payload && typeof payload === "string" && VISUAL_SPECIALS.has(payload)) {
        if (payload === "QUICK_EXIT_VISUAL") {
          dispatch({ type: "SET_MODE", mode: "READING", modeId: null });
          doSpeak("Returning to reading mode.");
          return;
        }
        visualRef.current?.handleVisualIntent(
          payload as "START_EXPLORING" | "WHAT_IS_HERE" | "DESCRIBE_VISUAL" | "MARK_THIS" | "GUIDE_TO" | "IM_DONE" | "NEXT_KEY_POINT",
          typeof result.payload === "string" ? undefined : String(result.payload)
        );
      }

      // Speak the response
      if (speech) {
        doSpeak(speech);
      }
    },
    [state, pageChunks, dispatch, onExit]
  );

  const voice = useVoice(handleVoiceResult, hasStarted);
  speakRef.current = voice.speak;

  const handleTap = useCallback(
    (e: React.PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("[data-no-tap]")) {
        return;
      }
      voice.interrupt();
    },
    [voice]
  );

  const totalPages = manifest.pages.length;
  const progress = totalPages > 0 ? (state.pageNo / totalPages) * 100 : 0;
  const modeInfo = MODE_LABELS[state.mode] ?? { label: "READING", color: colors.accent.primary };

  if (!hasStarted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(ellipse at 50% 30%, ${colors.bg.tertiary} 0%, ${colors.bg.primary} 70%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.lg,
        }}
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: typography.size.lg,
            color: colors.text.secondary,
            marginBottom: spacing.sm,
          }}
        >
          {manifest.title}
        </motion.p>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          whileHover={{ scale: 1.05, boxShadow: shadows.glow(colors.accent.primaryGlow) }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setHasStarted(true)}
          style={{
            padding: `${spacing.xl} ${spacing.xxl}`,
            fontSize: typography.size.xxl,
            fontWeight: typography.weight.bold,
            background: `linear-gradient(135deg, ${colors.accent.primary}, #3aa8d0)`,
            color: colors.text.inverse,
            border: "none",
            borderRadius: radius.lg,
            cursor: "pointer",
            boxShadow: shadows.md,
            fontFamily: typography.family,
          }}
        >
          Tap to Begin
        </motion.button>
      </div>
    );
  }

  return (
    <div
      onPointerDown={handleTap}
      style={{
        minHeight: "100vh",
        background: colors.bg.primary,
        color: colors.text.primary,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: colors.bg.tertiary,
          zIndex: 200,
        }}
      >
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{
            height: "100%",
            background: `linear-gradient(90deg, ${colors.accent.primary}, ${colors.accent.pink})`,
          }}
        />
      </div>

      <VoiceStatus state={voice.voiceState} lastTranscript={voice.lastTranscript} />

      <div style={{ padding: `${spacing.xl} ${spacing.xl} 120px` }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.xl,
            paddingRight: "180px",
          }}
        >
          <h1
            style={{
              fontSize: typography.size.xl,
              fontWeight: typography.weight.semibold,
              color: colors.text.primary,
            }}
          >
            {manifest.title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
            <span
              style={{
                fontSize: typography.size.sm,
                color: colors.text.secondary,
              }}
            >
              Page {state.pageNo} of {totalPages}
            </span>
            <span
              style={{
                fontSize: typography.size.sm,
                fontWeight: typography.weight.semibold,
                color: modeInfo.color,
                background: `${modeInfo.color}18`,
                padding: `${spacing.xs} ${spacing.md}`,
                borderRadius: radius.full,
                border: `1px solid ${modeInfo.color}40`,
              }}
            >
              {modeInfo.label}
            </span>
          </div>
        </header>

        <main>
          <AnimatePresence mode="wait">
            {state.mode === "READING" && (
              <motion.div
                key="reading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <ReadingView speak={voice.speak} />
              </motion.div>
            )}

            {state.mode === "FORMULA" && (
              <motion.div
                key="formula"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <FormulaView speak={voice.speak} />
              </motion.div>
            )}

            {state.mode === "VISUAL" && (
              <motion.div
                key="visual"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <VisualView ref={visualRef} speak={voice.speak} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <BigButtons speak={voice.speak} visualRef={visualRef} />
    </div>
  );
}

export default function TutorPage({ manifest, chunks, formulas, visuals, onExit }: Props) {
  return (
    <TutorProvider
      manifest={manifest}
      chunks={chunks}
      formulas={formulas}
      visuals={visuals}
    >
      <TutorContent onExit={onExit} />
    </TutorProvider>
  );
}
