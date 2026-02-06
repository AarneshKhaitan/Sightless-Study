import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutor } from "../context/TutorContext";
import type { FormulaModule } from "../types";
import { formulaToSpeech } from "../services/formulaToSpeech";
import { explainFormula } from "../api/client";
import { colors, radius, shadows, spacing, typography } from "../theme";

interface Props {
  speak: (text: string) => Promise<void>;
}

const STEPS = ["purpose", "symbols", "example", "intuition"] as const;
const STEP_LABELS: Record<string, string> = {
  purpose: "Purpose",
  symbols: "Symbols",
  example: "Example",
  intuition: "Intuition",
};

export default function FormulaView({ speak }: Props) {
  const { state, formulas } = useTutor();
  const spokenRef = useRef<string | null>(null);

  const formula: FormulaModule | undefined = formulas.find(
    (f) => f.formulaId === state.modeId
  );

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

  useEffect(() => {
    if (!formula) return;
    const step = state.formulaStep ?? "purpose";
    const key = `${formula.formulaId}-${step}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;

    explainFormula(state.docId, formula.formulaId, step)
      .then((res) => speak(res.text))
      .catch(() => speak(fallbackText(formula, step)));
  }, [formula, state.formulaStep, state.docId, speak]);

  if (!formula) {
    return (
      <p style={{ fontSize: typography.size.xl, color: colors.text.muted }}>
        Formula not found.
      </p>
    );
  }

  const currentStep = state.formulaStep ?? "purpose";

  return (
    <div>
      {/* Step indicator tabs */}
      <div
        style={{
          display: "flex",
          gap: spacing.xs,
          marginBottom: spacing.lg,
        }}
      >
        {STEPS.map((step) => (
          <div
            key={step}
            style={{
              flex: 1,
              textAlign: "center",
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: radius.sm,
              fontSize: typography.size.sm,
              fontWeight: currentStep === step ? typography.weight.bold : typography.weight.normal,
              color: currentStep === step ? colors.accent.primary : colors.text.muted,
              background: currentStep === step ? `${colors.accent.primary}15` : "transparent",
              borderBottom: currentStep === step ? `2px solid ${colors.accent.primary}` : `2px solid transparent`,
              transition: "all 0.2s ease",
            }}
          >
            {STEP_LABELS[step]}
          </div>
        ))}
      </div>

      {/* Formula card */}
      <div
        style={{
          background: colors.bg.elevated,
          padding: spacing.xl,
          borderRadius: radius.md,
          marginBottom: spacing.lg,
          boxShadow: shadows.sm,
          border: `1px solid ${colors.accent.primary}20`,
        }}
      >
        <p
          style={{
            fontSize: typography.size.sm,
            color: colors.accent.primary,
            fontWeight: typography.weight.semibold,
            marginBottom: spacing.sm,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Formula
        </p>
        <p
          style={{
            fontSize: typography.size.xxl,
            fontFamily: "'Courier New', monospace",
            color: colors.text.primary,
            textShadow: `0 0 20px ${colors.accent.primaryGlow}`,
          }}
        >
          {formula.expression}
        </p>
      </div>

      {/* Purpose (always shown) */}
      <p
        style={{
          fontSize: typography.size.lg,
          lineHeight: 1.6,
          color: colors.text.primary,
          marginBottom: spacing.lg,
        }}
      >
        {formula.purpose}
      </p>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {currentStep === "symbols" && (
          <motion.div
            key="symbols"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              background: colors.bg.card,
              borderRadius: radius.md,
              padding: spacing.lg,
            }}
          >
            {formula.symbols.map((s) => (
              <div
                key={s.sym}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: spacing.md,
                  padding: `${spacing.sm} 0`,
                  borderBottom: `1px solid ${colors.bg.tertiary}`,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: typography.size.lg,
                    fontWeight: typography.weight.bold,
                    color: colors.accent.primary,
                    minWidth: "60px",
                  }}
                >
                  {s.sym}
                </span>
                <span style={{ fontSize: typography.size.md, color: colors.text.secondary }}>
                  {s.meaning}
                </span>
              </div>
            ))}
          </motion.div>
        )}

        {currentStep === "example" && (
          <motion.div
            key="example"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            style={{
              background: colors.bg.card,
              borderRadius: radius.md,
              padding: spacing.lg,
            }}
          >
            <p style={{ fontSize: typography.size.lg, lineHeight: 1.7, color: colors.text.secondary }}>
              {formula.example}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
