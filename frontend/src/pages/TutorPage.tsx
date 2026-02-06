import { useCallback, useRef } from "react";
import type { Chunk, DocumentManifest, FormulaModule, VisualModule } from "../types";
import { TutorProvider, useTutor } from "../context/TutorContext";
import { useVoice } from "../hooks/useVoice";
import type { ParsedIntent } from "../services/intentParser";
import * as tts from "../services/tts";
import { askQuestion } from "../api/client";
import VoiceStatus from "../components/VoiceStatus";
import ReadingView from "../components/ReadingView";
import FormulaView from "../components/FormulaView";

interface Props {
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
}

function TutorContent() {
  const { state, currentChunk, pageChunks, manifest, dispatch } = useTutor();

  // Use a ref for speak so handleIntent always has the latest version
  const speakRef = useRef<(text: string) => Promise<void>>(async () => {});

  const handleIntent = useCallback(
    (intent: ParsedIntent, _transcript: string) => {
      const doSpeak = speakRef.current;

      // Dispatch reducer action if present
      if (intent.action) {
        dispatch(intent.action);
      }

      // Handle special intents
      switch (intent.special) {
        case "WHERE_AM_I":
          doSpeak(
            `Page ${state.pageNo}, chunk ${state.chunkIndex + 1} of ${pageChunks.length}. ${currentChunk?.text ?? "No content here."}`
          );
          break;
        case "REPEAT":
          if (currentChunk) {
            doSpeak(currentChunk.text);
          }
          break;
        case "HELP":
          if (state.mode === "READING") {
            doSpeak(
              "You can say Continue, Repeat, Question, Summarize this page, Where am I, Go back, or Stop."
            );
          } else if (state.mode === "FORMULA") {
            doSpeak(
              "You can say Symbols, Example, Intuition, Repeat, or Continue."
            );
          } else if (state.mode === "VISUAL") {
            doSpeak(
              "You can say Start exploring, What is here, Mark this, Guide me to minimum or peak, Next key point, or I'm done."
            );
          }
          break;
        case "STOP":
          tts.stop();
          break;
        case "QUESTION":
          {
            const questionText = intent.payload ?? "what does this mean?";
            const chunkId = currentChunk?.chunkId ?? "p1-c1";
            doSpeak("Let me look that up.");
            askQuestion(state.docId, state.pageNo, chunkId, questionText)
              .then((res) => {
                const citationStr = res.citations
                  .map((c) => c.chunkId)
                  .join(", ");
                speakRef.current(
                  `${res.answer}. Citations: ${citationStr}. Say Continue to return to your reading.`
                );
              })
              .catch(() => {
                speakRef.current(
                  "Sorry, I couldn't find an answer. Say Continue to go back."
                );
              });
          }
          break;
        case "SUMMARIZE":
          {
            const pageText = pageChunks.map((c) => c.text).join(" ");
            doSpeak(`Summary of this page: ${pageText}`);
          }
          break;
        default:
          break;
      }
    },
    [state, currentChunk, pageChunks, dispatch]
  );

  const voice = useVoice(handleIntent);

  // Keep speakRef in sync
  speakRef.current = voice.speak;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#eee",
        padding: "2rem",
        paddingBottom: "6rem",
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
          <div>
            <p style={{ fontSize: "1.5rem", color: "#4cc9f0" }}>
              Visual Explorer — {state.modeId}
            </p>
          </div>
        )}
      </main>
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
