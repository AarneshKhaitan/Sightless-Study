import { useCallback, useRef, useState } from "react";
import type { Chunk, DocumentManifest, FormulaModule, TutorMode, VisualModule } from "../types";
import { TutorProvider, useTutor } from "../context/TutorContext";
import { useVoice } from "../hooks/useVoice";
import type { VoiceResult } from "../api/client";
import VoiceStatus from "../components/VoiceStatus";
import ReadingView from "../components/ReadingView";
import FormulaView from "../components/FormulaView";
import VisualView, { type VisualViewHandle } from "../components/VisualView";
import BigButtons from "../components/BigButtons";

interface Props {
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
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

function TutorContent() {
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
          // Handle QA exit on NEXT_CHUNK if returnPosition exists
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
          return; // Don't speak again below
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
    [state, pageChunks, dispatch]
  );

  const voice = useVoice(handleVoiceResult, hasStarted);
  speakRef.current = voice.speak;

  const handleTap = useCallback(
    (e: React.PointerEvent) => {
      // Don't intercept clicks on buttons or interactive elements
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("[data-no-tap]")) {
        return;
      }
      voice.interrupt();
    },
    [voice]
  );

  if (!hasStarted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setHasStarted(true)}
          style={{
            padding: "2rem 4rem",
            fontSize: "2rem",
            fontWeight: "bold",
            background: "#4cc9f0",
            color: "#1a1a2e",
            border: "none",
            borderRadius: "1rem",
            cursor: "pointer",
          }}
        >
          Tap to Begin
        </button>
      </div>
    );
  }

  return (
    <div
      onPointerDown={handleTap}
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#eee",
        padding: "2rem",
        paddingBottom: "6rem",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <VoiceStatus state={voice.voiceState} lastTranscript={voice.lastTranscript} />

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          paddingRight: "200px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem" }}>{manifest.title}</h1>
        <span style={{ fontSize: "1.2rem", color: "#4cc9f0" }}>
          Page {state.pageNo} &middot; Mode: {state.mode}
        </span>
      </header>

      <main>
        {state.mode === "READING" && (
          <ReadingView speak={voice.speak} />
        )}

        {state.mode === "FORMULA" && (
          <FormulaView speak={voice.speak} />
        )}

        {state.mode === "VISUAL" && (
          <VisualView ref={visualRef} speak={voice.speak} />
        )}
      </main>

      <BigButtons speak={voice.speak} visualRef={visualRef} />
    </div>
  );
}

export default function TutorPage({ manifest, chunks, formulas, visuals }: Props) {
  return (
    <TutorProvider
      manifest={manifest}
      chunks={chunks}
      formulas={formulas}
      visuals={visuals}
    >
      <TutorContent />
    </TutorProvider>
  );
}
