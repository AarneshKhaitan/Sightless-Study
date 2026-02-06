import { useEffect, useRef } from "react";
import { useTutor } from "../context/TutorContext";
import type { FormulaModule } from "../types";
import { formulaToSpeech } from "../services/formulaToSpeech";
import { explainFormula } from "../api/client";

interface Props {
  speak: (text: string) => Promise<void>;
}

export default function FormulaView({ speak }: Props) {
  const { state, formulas } = useTutor();
  const spokenRef = useRef<string | null>(null);

  const formula: FormulaModule | undefined = formulas.find(
    (f) => f.formulaId === state.modeId
  );

  // Deterministic fallback text for each step
  function fallbackText(f: FormulaModule, step: string | null): string {
    const spoken = formulaToSpeech(f.expression);
    switch (step) {
      case "symbols": {
        const symbolText = f.symbols
          .map((s) => `${s.sym} means ${s.meaning}`)
          .join(". ");
        return `Symbols: ${symbolText}.`;
      }
      case "example":
        return `Example: ${f.example}`;
      case "intuition":
        return `In other words, ${f.purpose}`;
      case "purpose":
      default:
        return `A formula is here. ${spoken}. ${f.purpose}. Say Symbols, Example, Intuition, Repeat, or Continue.`;
    }
  }

  // Speak on entry or when formulaStep changes
  useEffect(() => {
    if (!formula) return;
    const step = state.formulaStep ?? "purpose";
    const key = `${formula.formulaId}-${step}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;

    // Try AI explanation, fall back to deterministic
    explainFormula(state.docId, formula.formulaId, step)
      .then((res) => speak(res.text))
      .catch(() => speak(fallbackText(formula, step)));
  }, [formula, state.formulaStep, state.docId, speak]);

  if (!formula) {
    return (
      <p style={{ fontSize: "1.5rem", color: "#888" }}>
        Formula not found.
      </p>
    );
  }

  return (
    <div>
      <div
        style={{
          background: "#2a2a4a",
          padding: "2rem",
          borderRadius: "12px",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ fontSize: "1.3rem", color: "#4cc9f0", marginBottom: "0.5rem" }}>
          Formula
        </p>
        <p style={{ fontSize: "2rem", fontFamily: "monospace" }}>
          {formula.expression}
        </p>
      </div>

      <p style={{ fontSize: "1.3rem", lineHeight: 1.6 }}>
        {formula.purpose}
      </p>

      {state.formulaStep === "symbols" && (
        <div style={{ marginTop: "1rem" }}>
          {formula.symbols.map((s) => (
            <p key={s.sym} style={{ fontSize: "1.2rem", marginBottom: "0.3rem" }}>
              <strong style={{ color: "#4cc9f0" }}>{s.sym}</strong>: {s.meaning}
            </p>
          ))}
        </div>
      )}

      {state.formulaStep === "example" && (
        <p style={{ marginTop: "1rem", fontSize: "1.2rem", color: "#ccc" }}>
          {formula.example}
        </p>
      )}

      <p style={{ color: "#888", marginTop: "1.5rem", fontSize: "1rem" }}>
        Step: {state.formulaStep ?? "purpose"} &middot; {formula.formulaId}
      </p>
    </div>
  );
}
