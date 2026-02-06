import { useCallback, useState } from "react";
import { getManifest, getChunks, getFormulas, getVisuals } from "../api/client";
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

export default function HomePage({ onLoaded }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docId = "demo-001";
      const [manifest, chunksRes, formulasRes, visualsRes] = await Promise.all([
        getManifest(docId),
        getChunks(docId),
        getFormulas(docId),
        getVisuals(docId),
      ]);
      onLoaded({
        manifest,
        chunks: chunksRes.chunks,
        formulas: formulasRes.formulas,
        visuals: visualsRes.visuals,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo");
    } finally {
      setLoading(false);
    }
  }, [onLoaded]);

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
      <h1 style={{ fontSize: "2.5rem", textAlign: "center" }}>GuidedNotes</h1>
      <p style={{ fontSize: "1.2rem", textAlign: "center", maxWidth: "500px" }}>
        Voice-first lecture tutor for visually impaired students.
      </p>

      <button
        onClick={loadDemo}
        disabled={loading}
        style={{
          padding: "1.5rem 3rem",
          fontSize: "1.5rem",
          fontWeight: "bold",
          borderRadius: "12px",
          border: "3px solid #4cc9f0",
          background: "#4cc9f0",
          color: "#1a1a2e",
          cursor: loading ? "wait" : "pointer",
          minWidth: "280px",
        }}
      >
        {loading ? "Loading..." : "Load Demo"}
      </button>

      <button
        disabled
        style={{
          padding: "1.5rem 3rem",
          fontSize: "1.5rem",
          fontWeight: "bold",
          borderRadius: "12px",
          border: "3px solid #555",
          background: "#333",
          color: "#888",
          cursor: "not-allowed",
          minWidth: "280px",
        }}
      >
        Upload PDF (coming soon)
      </button>

      {error && (
        <p style={{ color: "#f07070", fontSize: "1.1rem" }}>{error}</p>
      )}
    </div>
  );
}
