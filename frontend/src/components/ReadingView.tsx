import { useEffect, useRef } from "react";
import { useTutor } from "../context/TutorContext";

interface Props {
  speak: (text: string) => Promise<void>;
}

export default function ReadingView({ speak }: Props) {
  const { currentChunk, pageChunks, state, manifest } = useTutor();
  const spokenChunkRef = useRef<string | null>(null);

  const totalPages = manifest.pages.length;
  const isLastPage = state.pageNo >= totalPages;
  const isLastChunk = state.chunkIndex >= pageChunks.length - 1;

  // Speak the current chunk when it changes
  useEffect(() => {
    if (!currentChunk) return;
    if (spokenChunkRef.current === currentChunk.chunkId) return;
    spokenChunkRef.current = currentChunk.chunkId;

    let suffix: string;
    if (isLastPage && isLastChunk) {
      suffix = "This is the end of the document. Say End to finish, or Go back to review.";
    } else {
      suffix = `Chunk ${state.chunkIndex + 1} of ${pageChunks.length}. Say Continue or ask a question.`;
    }
    speak(`${currentChunk.text}. ${suffix}`);
  }, [currentChunk, speak, isLastPage, isLastChunk, state.chunkIndex, pageChunks.length]);

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
