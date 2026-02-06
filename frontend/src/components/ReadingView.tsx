import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutor } from "../context/TutorContext";
import { colors, radius, shadows, spacing, typography } from "../theme";

interface Props {
  speak: (text: string) => Promise<void>;
}

const chunkTypeStyles: Record<string, React.CSSProperties> = {
  heading: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    borderLeft: `4px solid ${colors.accent.primary}`,
    paddingLeft: spacing.lg,
    marginBottom: spacing.md,
  },
  paragraph: {
    fontSize: typography.size.lg,
    lineHeight: 1.7,
    color: colors.text.primary,
  },
  bullets: {
    fontSize: typography.size.lg,
    lineHeight: 1.7,
    paddingLeft: spacing.xl,
    borderLeft: `2px solid ${colors.bg.tertiary}`,
  },
  caption: {
    fontSize: typography.size.md,
    fontStyle: "italic",
    color: colors.text.secondary,
    borderLeft: `2px solid ${colors.accent.primary}40`,
    paddingLeft: spacing.md,
  },
};

export default function ReadingView({ speak }: Props) {
  const { currentChunk, pageChunks, state, manifest } = useTutor();
  const spokenChunkRef = useRef<string | null>(null);

  const totalPages = manifest.pages.length;
  const isLastPage = state.pageNo >= totalPages;
  const isLastChunk = state.chunkIndex >= pageChunks.length - 1;

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
      <p style={{ fontSize: typography.size.xl, color: colors.text.muted }}>
        No content on this page.
      </p>
    );
  }

  const typeStyle = chunkTypeStyles[currentChunk.type] ?? chunkTypeStyles.paragraph;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentChunk.chunkId}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
      >
        <div
          style={{
            background: colors.bg.card,
            borderRadius: radius.md,
            padding: spacing.xl,
            boxShadow: shadows.sm,
            maxWidth: "800px",
          }}
        >
          <p style={{ ...typeStyle, margin: 0 }}>
            {currentChunk.text}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: spacing.md,
            padding: `0 ${spacing.xs}`,
          }}
        >
          <span style={{ color: colors.text.muted, fontSize: typography.size.sm }}>
            {currentChunk.chunkId}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
            {pageChunks.map((_, i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: radius.full,
                  background: i === state.chunkIndex ? colors.accent.primary : colors.bg.tertiary,
                  transition: "background 0.2s ease",
                }}
              />
            ))}
          </div>
          <span style={{ color: colors.text.muted, fontSize: typography.size.sm }}>
            {state.chunkIndex + 1} / {pageChunks.length}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
