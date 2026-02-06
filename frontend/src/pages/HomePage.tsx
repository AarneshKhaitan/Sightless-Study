import { useRef, useState } from "react";
import { getManifest, getChunks, getFormulas, getVisuals, uploadPDF } from "../api/client";
import type { Chunk, DocumentManifest, FormulaModule, VisualModule } from "../types";

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
  "Uploading PDF...",
  "Extracting text from pages...",
  "Chunking content...",
  "Detecting formulas and visuals...",
  "Preparing lecture...",
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
      // Show progress steps with delays for a realistic feel
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
        gap: "2rem",
        padding: "2rem",
        background: "#1a1a2e",
        color: "#eee",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", textAlign: "center" }}>Sightless Study</h1>
      <p style={{ fontSize: "1.2rem", textAlign: "center", maxWidth: "500px" }}>
        Voice-first lecture tutor for visually impaired students.
      </p>

      {loading ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              border: "4px solid #333",
              borderTop: "4px solid #4cc9f0",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1.5rem",
            }}
          />
          <p style={{ fontSize: "1.3rem", color: "#4cc9f0" }}>
            {LOADING_STEPS[loadingStep]}
          </p>
          <div
            style={{
              width: "300px",
              height: "6px",
              background: "#333",
              borderRadius: "3px",
              marginTop: "1rem",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%`,
                height: "100%",
                background: "#4cc9f0",
                borderRadius: "3px",
                transition: "width 0.5s ease",
              }}
            />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "1.5rem 3rem",
              fontSize: "1.5rem",
              fontWeight: "bold",
              borderRadius: "12px",
              border: "3px solid #4cc9f0",
              background: "#4cc9f0",
              color: "#1a1a2e",
              cursor: "pointer",
              minWidth: "280px",
            }}
          >
            Upload PDF
          </button>
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
        </>
      )}

      {error && (
        <p style={{ color: "#f07070", fontSize: "1.1rem" }}>{error}</p>
      )}
    </div>
  );
}
