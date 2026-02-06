import type { TutorAction, TutorMode } from "../types";

export interface ParsedIntent {
  action: TutorAction | null;
  // For special intents that aren't reducer actions
  special:
    | "WHERE_AM_I"
    | "REPEAT"
    | "HELP"
    | "STOP"
    | "QUESTION"
    | "SUMMARIZE"
    | "WHAT_IS_HERE"
    | "MARK_THIS"
    | "GUIDE_TO"
    | "START_EXPLORING"
    | "IM_DONE"
    | "NEXT_KEY_POINT"
    | null;
  payload?: string; // e.g., question text, guidance target
}

export function parseIntent(
  transcript: string,
  mode: TutorMode
): ParsedIntent {
  const t = transcript.toLowerCase().trim();

  // --- Global commands (work in all modes) ---
  if (t === "help" || t === "list options") {
    return { action: null, special: "HELP" };
  }
  if (t === "where am i" || t === "where am i?") {
    return { action: null, special: "WHERE_AM_I" };
  }
  if (t === "repeat") {
    return { action: null, special: "REPEAT" };
  }
  if (t === "stop") {
    return { action: null, special: "STOP" };
  }
  if (t === "continue" || t === "next") {
    if (mode === "FORMULA") {
      return { action: { type: "SET_MODE", mode: "READING", modeId: null }, special: null };
    }
    if (mode === "VISUAL") {
      return { action: null, special: "IM_DONE" };
    }
    return { action: { type: "NEXT_CHUNK" }, special: null };
  }
  if (t === "go back" || t === "back" || t === "previous") {
    return { action: { type: "PREV_CHUNK" }, special: null };
  }

  // --- Reading mode commands ---
  if (mode === "READING") {
    if (t.startsWith("question:") || t.startsWith("question ")) {
      const questionText = t.replace(/^question:?\s*/, "").trim();
      return { action: { type: "ENTER_QA" }, special: "QUESTION", payload: questionText };
    }
    if (t === "summarize" || t === "summarize this page") {
      return { action: null, special: "SUMMARIZE" };
    }
  }

  // --- Formula mode commands ---
  if (mode === "FORMULA") {
    if (t === "symbols") {
      return { action: { type: "FORMULA_SYMBOLS" }, special: null };
    }
    if (t === "example") {
      return { action: { type: "FORMULA_EXAMPLE" }, special: null };
    }
    if (t === "intuition") {
      return { action: { type: "FORMULA_INTUITION" }, special: null };
    }
  }

  // --- Visual Explorer commands ---
  if (mode === "VISUAL") {
    if (t === "start exploring") {
      return { action: { type: "ENTER_EXPLORE" }, special: "START_EXPLORING" };
    }
    if (t === "what is here" || t === "what is here?" || t === "what's here") {
      return { action: null, special: "WHAT_IS_HERE" };
    }
    if (t === "mark this" || t === "mark") {
      return { action: { type: "MARK_POINT" }, special: "MARK_THIS" };
    }
    if (
      t.startsWith("guide me to") ||
      t.startsWith("take me to") ||
      t.startsWith("find the")
    ) {
      const target = t
        .replace(/^(guide me to|take me to|find the)\s*/, "")
        .trim();
      return {
        action: { type: "START_GUIDANCE", target },
        special: "GUIDE_TO",
        payload: target,
      };
    }
    if (t === "next key point" || t === "next feature") {
      return { action: null, special: "NEXT_KEY_POINT" };
    }
    if (
      t === "i'm done" ||
      t === "im done" ||
      t === "i am done" ||
      t === "done" ||
      t === "explain what i did"
    ) {
      return { action: null, special: "IM_DONE" };
    }
  }

  // Not recognized
  return { action: null, special: null };
}
