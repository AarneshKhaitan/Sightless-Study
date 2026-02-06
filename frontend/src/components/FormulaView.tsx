import { useEffect, useRef } from "react";
import { useTutor } from "../context/TutorContext";
import type { FormulaModule } from "../types";

interface Props {
  speak: (text: string) => Promise<void>;
}

export default function FormulaView({ speak }: Props) {
  const { state, formulas } = useTutor();
  const spokenRef = useRef<string | null>(null);

  const formula: FormulaModule | undefined = formulas.find(
    (f) => f.formulaId === state.modeId
  );

  // Speak on entry or when formulaStep changes
  useEffect(() => {
    if (!formula) return;
    const key = `${formula.formulaId}-${state.formulaStep}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;

    switch (state.formulaStep) {
      case "purpose":
        speak(
          `A formula is here. ${formula.expression}. ${formula.purpose}. Say Symbols, Example, Intuition, Repeat, or Continue.`
        );
        break;
      case "symbols":
        {
          const symbolText = formula.symbols
            .map((s) => `${s.sym} means ${s.meaning}`)
            .join(". ");
          speak(`Symbols: ${symbolText}.`);
        }
        break;
      case "example":
        speak(`Example: ${formula.example}`);
        break;
      case "intuition":
        speak(`In other words, ${formula.purpose}`);
        break;
      default:
        speak(
          `A formula is here. ${formula.expression}. Say Symbols, Example, Intuition, Repeat, or Continue.`
        );
    }
  }, [formula, state.formulaStep, speak]);

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
