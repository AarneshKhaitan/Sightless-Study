import { useEffect, useRef } from "react";
import { useTutor } from "../context/TutorContext";

interface Props {
  speak: (text: string) => Promise<void>;
}

export default function ReadingView({ speak }: Props) {
  const { currentChunk, pageChunks, state } = useTutor();
  const spokenChunkRef = useRef<string | null>(null);

  // Speak the current chunk when it changes
  useEffect(() => {
    if (!currentChunk) return;
    if (spokenChunkRef.current === currentChunk.chunkId) return;
    spokenChunkRef.current = currentChunk.chunkId;

    const prompt =
      "Say Continue, Repeat, Question, Summarize, Where am I, or Help.";
    speak(`${currentChunk.text}. ${prompt}`);
  }, [currentChunk, speak]);

  if (!currentChunk) {
    return (
      <p style={{ fontSize: "1.5rem", color: "#888" }}>
        No content on this page.
      </p>
    );
  }

  return (
    <div>
      <p
        style={{
          fontSize: "1.8rem",
          lineHeight: 1.6,
          maxWidth: "800px",
        }}
      >
        {currentChunk.text}
      </p>
      <p style={{ color: "#888", marginTop: "1rem", fontSize: "1.1rem" }}>
        Chunk {state.chunkIndex + 1} of {pageChunks.length} &middot;{" "}
        {currentChunk.chunkId}
      </p>
    </div>
  );
}
