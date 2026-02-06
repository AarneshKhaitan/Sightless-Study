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
    switch (state.mode) {
      case "READING":
        // ReadingView auto-speaks on chunk change; dispatch same chunk to re-trigger
        dispatch({ type: "GO_TO_CHUNK", pageNo: state.pageNo, chunkIndex: state.chunkIndex });
        break;
      case "FORMULA":
        // Re-trigger current formula step (including purpose)
        if (state.formulaStep === "symbols") dispatch({ type: "FORMULA_SYMBOLS" });
        else if (state.formulaStep === "example") dispatch({ type: "FORMULA_EXAMPLE" });
        else if (state.formulaStep === "intuition") dispatch({ type: "FORMULA_INTUITION" });
        else {
          // Purpose step: re-enter formula mode to re-speak
          dispatch({ type: "SET_MODE", mode: "FORMULA", modeId: state.modeId });
        }
        break;
      case "VISUAL":
        visualRef.current?.handleVisualIntent("WHAT_IS_HERE");
        break;
    }
  }, [state, dispatch, visualRef]);

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
        speak(
          "You can say Start exploring, What is here, Mark this, Guide me to minimum or peak, Next key point, or I'm done."
        );
        break;
    }
  }, [state.mode, speak]);

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

  const nextIcon = state.mode === "VISUAL" ? "\u25B6" : "\u25B6";
  const nextLabel = state.mode === "VISUAL" ? "NEXT" : "NEXT";
  const backIcon = state.mode === "VISUAL" ? "\u2716" : "\u25C0";
  const backLabel = state.mode === "VISUAL" ? "DONE" : "BACK";

  return (
    <div className={styles.bar}>
      <button className={`${styles.btn} ${styles.back}`} onClick={onBack}>
        <span className={styles.icon}>{backIcon}</span>
        <span className={styles.label}>{backLabel}</span>
      </button>
      <button className={`${styles.btn} ${styles.repeat}`} onClick={onRepeat}>
        <span className={styles.icon}>{"\u27F3"}</span>
        <span className={styles.label}>REPEAT</span>
      </button>
      <button className={`${styles.btn} ${styles.help}`} onClick={onHelp}>
        <span className={styles.icon}>?</span>
        <span className={styles.label}>HELP</span>
      </button>
      <button className={`${styles.btn} ${styles.next}`} onClick={onNext}>
        <span className={styles.icon}>{nextIcon}</span>
        <span className={styles.label}>{nextLabel}</span>
      </button>
    </div>
  );
}
