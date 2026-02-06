import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getManifest, getChunks, getFormulas, getVisuals, uploadPDF } from "../api/client";
import type { Chunk, DocumentManifest, FormulaModule, VisualModule } from "../types";
import { colors, radius, shadows, spacing, typography } from "../theme";

interface LoadedData {
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
}

interface Props {
  onLoaded: (data: LoadedData) => void;
}

const LOADING_STEPS = [
  { label: "Uploading PDF...", icon: "📄" },
  { label: "Extracting text from pages...", icon: "📝" },
  { label: "Chunking content...", icon: "✂️" },
  { label: "Detecting formulas and visuals...", icon: "🔍" },
  { label: "Preparing lecture...", icon: "✨" },
];

export default function HomePage({ onLoaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setLoadingStep(0);

    try {
      const stepDelay = (step: number) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            setLoadingStep(step);
            resolve();
          }, 800 + Math.random() * 400);
        });

      await stepDelay(0);
      const uploadResult = await uploadPDF(file);
      const docId = uploadResult.docId;

      await stepDelay(1);
      await stepDelay(2);

      const [manifest, chunksRes, formulasRes, visualsRes] = await Promise.all([
        getManifest(docId),
        getChunks(docId),
        getFormulas(docId),
        getVisuals(docId),
      ]);

      await stepDelay(3);
      await stepDelay(4);

      onLoaded({
        manifest,
        chunks: chunksRes.chunks,
        formulas: formulasRes.formulas,
        visuals: visualsRes.visuals,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
      setLoadingStep(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: spacing.xl,
        background: `radial-gradient(ellipse at 50% 0%, ${colors.bg.tertiary} 0%, ${colors.bg.primary} 70%)`,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ textAlign: "center", marginBottom: spacing.xxl }}
      >
        <h1
          style={{
            fontSize: typography.size.display,
            fontWeight: typography.weight.bold,
            background: `linear-gradient(135deg, ${colors.accent.primary}, ${colors.accent.pink})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: spacing.md,
            letterSpacing: "-0.02em",
          }}
        >
          Sightless Study
        </h1>
        <p
          style={{
            fontSize: typography.size.lg,
            color: colors.text.secondary,
            maxWidth: "480px",
            lineHeight: 1.6,
          }}
        >
          Voice-first lecture tutor for visually impaired students.
          Upload a PDF to begin.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            style={{
              textAlign: "center",
              background: colors.bg.card,
              padding: spacing.xl,
              borderRadius: radius.lg,
              boxShadow: shadows.lg,
              minWidth: "360px",
            }}
          >
            <div
              style={{
                fontSize: "2.5rem",
                marginBottom: spacing.lg,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              {LOADING_STEPS[loadingStep]?.icon}
            </div>
            <p
              style={{
                fontSize: typography.size.md,
                color: colors.text.primary,
                marginBottom: spacing.lg,
                fontWeight: typography.weight.medium,
              }}
            >
              {LOADING_STEPS[loadingStep]?.label}
            </p>
            <div
              style={{
                width: "100%",
                height: "4px",
                background: colors.bg.tertiary,
                borderRadius: radius.full,
                overflow: "hidden",
              }}
            >
              <motion.div
                animate={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{
                  height: "100%",
                  background: `linear-gradient(90deg, ${colors.accent.primary}, ${colors.accent.pink})`,
                  borderRadius: radius.full,
                }}
              />
            </div>
            <p
              style={{
                fontSize: typography.size.sm,
                color: colors.text.muted,
                marginTop: spacing.md,
              }}
            >
              Step {loadingStep + 1} of {LOADING_STEPS.length}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: spacing.lg }}
          >
            <motion.button
              whileHover={{ scale: 1.03, boxShadow: shadows.glow(colors.accent.primaryGlow) }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: `${spacing.lg} ${spacing.xxl}`,
                fontSize: typography.size.xl,
                fontWeight: typography.weight.bold,
                borderRadius: radius.lg,
                border: "none",
                background: `linear-gradient(135deg, ${colors.accent.primary}, #3aa8d0)`,
                color: colors.text.inverse,
                cursor: "pointer",
                minWidth: "300px",
                boxShadow: shadows.md,
                fontFamily: typography.family,
                letterSpacing: "-0.01em",
              }}
            >
              Upload PDF
            </motion.button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              color: colors.status.error,
              fontSize: typography.size.md,
              marginTop: spacing.lg,
              padding: `${spacing.sm} ${spacing.lg}`,
              background: colors.status.errorGlow,
              borderRadius: radius.sm,
            }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
