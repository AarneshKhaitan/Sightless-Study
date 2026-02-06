import { useCallback } from "react";
import { useTutor } from "../context/TutorContext";
import type { VisualViewHandle } from "./VisualView";
import styles from "./BigButtons.module.css";

interface Props {
  speak: (text: string) => Promise<void>;
  visualRef: React.RefObject<VisualViewHandle | null>;
}

export default function BigButtons({ speak, visualRef }: Props) {
  const { state, dispatch } = useTutor();

  const onNext = useCallback(() => {
    switch (state.mode) {
      case "READING":
        dispatch({ type: "NEXT_CHUNK" });
        break;
      case "FORMULA":
        dispatch({ type: "FORMULA_NEXT_STEP" });
        break;
      case "VISUAL":
        visualRef.current?.handleVisualIntent("NEXT_KEY_POINT");
        break;
    }
  }, [state.mode, dispatch, visualRef]);

  const onRepeat = useCallback(() => {
    speak("Repeating.");
    switch (state.mode) {
      case "READING":
        // ReadingView auto-speaks on chunk change; dispatch same chunk to re-trigger
        dispatch({ type: "GO_TO_CHUNK", pageNo: state.pageNo, chunkIndex: state.chunkIndex });
        break;
      case "FORMULA":
        // Re-trigger current formula step
        if (state.formulaStep === "symbols") dispatch({ type: "FORMULA_SYMBOLS" });
        else if (state.formulaStep === "example") dispatch({ type: "FORMULA_EXAMPLE" });
        else if (state.formulaStep === "intuition") dispatch({ type: "FORMULA_INTUITION" });
        else dispatch({ type: "FORMULA_SYMBOLS" }); // default to purpose re-entry
        break;
      case "VISUAL":
        visualRef.current?.handleVisualIntent("WHAT_IS_HERE");
        break;
    }
  }, [state, dispatch, speak, visualRef]);

  const onHelp = useCallback(() => {
    switch (state.mode) {
      case "READING":
        speak(
          "You can say Continue, Repeat, Question, Summarize this page, Where am I, Go back, or Stop."
        );
        break;
      case "FORMULA":
        speak("You can say Symbols, Example, Intuition, Repeat, or Continue.");
        break;
      case "VISUAL":
        visualRef.current?.handleVisualIntent("WHAT_IS_HERE");
        break;
    }
  }, [state.mode, speak, visualRef]);

  const onBack = useCallback(() => {
    switch (state.mode) {
      case "READING":
        dispatch({ type: "PREV_CHUNK" });
        break;
      case "FORMULA":
        dispatch({ type: "FORMULA_PREV_STEP" });
        break;
      case "VISUAL":
        visualRef.current?.handleVisualIntent("IM_DONE");
        break;
    }
  }, [state.mode, dispatch, visualRef]);

  const nextLabel = state.mode === "VISUAL" ? "NEXT FEATURE" : "NEXT";
  const helpLabel = state.mode === "VISUAL" ? "WHAT'S HERE" : "HELP";
  const backLabel = state.mode === "VISUAL" ? "DONE" : "BACK";

  return (
    <div className={styles.bar}>
      <button className={`${styles.btn} ${styles.back}`} onClick={onBack}>
        {backLabel}
      </button>
      <button className={`${styles.btn} ${styles.repeat}`} onClick={onRepeat}>
        REPEAT
      </button>
      <button className={`${styles.btn} ${styles.help}`} onClick={onHelp}>
        {helpLabel}
      </button>
      <button className={`${styles.btn} ${styles.next}`} onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}
