import type { TutorAction, TutorMode } from "../types";

export interface ParsedIntent {
  action: TutorAction | null;
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
    | "QUICK_EXIT_VISUAL"
    | "UNRECOGNIZED"
    | null;
  payload?: string;
}

// --- Synonym helpers ---

function matchesAny(t: string, phrases: string[]): boolean {
  return phrases.some((p) => t === p);
}

function startsWithAny(t: string, prefixes: string[]): string | null {
  for (const p of prefixes) {
    if (t.startsWith(p)) return t.slice(p.length).trim();
  }
  return null;
}

function includesAny(t: string, keywords: string[]): boolean {
  return keywords.some((k) => t.includes(k));
}

// --- Synonym arrays ---

const HELP_SYNONYMS = [
  "help", "list options", "what can i say", "what can i do",
  "options", "commands", "what are my options",
];

const WHERE_AM_I_SYNONYMS = [
  "where am i", "where am i?", "current position",
  "what page", "what page am i on",
];

const REPEAT_SYNONYMS = [
  "repeat", "say that again", "again", "repeat that",
  "say again", "one more time", "pardon",
];

const STOP_SYNONYMS = [
  "stop", "be quiet", "quiet", "shut up", "silence", "pause",
  "stop talking", "stop speaking",
];

const CONTINUE_SYNONYMS = [
  "continue", "next", "keep going", "go on", "move on",
  "go ahead", "next one", "carry on",
];

const BACK_SYNONYMS = [
  "go back", "back", "previous", "go to previous",
  "go backwards", "before",
];

const QUESTION_PREFIXES = [
  "question:", "question ", "ask ", "what does ",
  "what is ", "what are ", "explain ", "tell me about ",
  "how does ", "why does ", "can you explain ",
];

const SUMMARIZE_SYNONYMS = [
  "summarize", "summarize this page", "summary", "give me a summary",
  "summarise", "summarise this page", "what's on this page",
  "overview",
];

const SYMBOLS_SYNONYMS = [
  "symbols", "what are the symbols", "explain the symbols",
  "variables", "what do the symbols mean", "show symbols",
];

const EXAMPLE_SYNONYMS = [
  "example", "give me an example", "show an example",
  "give an example", "worked example", "try an example",
];

const INTUITION_SYNONYMS = [
  "intuition", "explain it simply", "in simple terms",
  "what does it mean", "plain english", "in other words",
  "break it down",
];

const START_EXPLORING_SYNONYMS = [
  "start exploring", "begin exploring", "explore",
  "let's explore", "start", "begin",
];

const WHAT_IS_HERE_SYNONYMS = [
  "what is here", "what is here?", "what's here", "what's here?",
  "describe this", "what am i looking at", "tell me about this",
  "what do i see",
];

const MARK_SYNONYMS = [
  "mark this", "mark", "save this", "remember this",
  "pin this", "bookmark",
];

const GUIDE_PREFIXES = [
  "guide me to ", "take me to ", "find the ", "go to the ",
  "show me the ", "navigate to ",
];

const NEXT_KEY_POINT_SYNONYMS = [
  "next key point", "next feature", "next point",
  "next important point", "what's next",
];

const IM_DONE_SYNONYMS = [
  "i'm done", "im done", "i am done", "done", "finished",
  "explain what i did", "wrap up", "that's it", "all done",
];

const QUICK_EXIT_SYNONYMS = [
  "go back", "back", "exit", "leave", "close",
];

export function parseIntent(
  transcript: string,
  mode: TutorMode
): ParsedIntent {
  const t = transcript.toLowerCase().trim();

  // --- Global commands (work in all modes) ---
  if (matchesAny(t, HELP_SYNONYMS)) {
    return { action: null, special: "HELP" };
  }
  if (matchesAny(t, WHERE_AM_I_SYNONYMS)) {
    return { action: null, special: "WHERE_AM_I" };
  }
  if (matchesAny(t, REPEAT_SYNONYMS)) {
    return { action: null, special: "REPEAT" };
  }
  if (matchesAny(t, STOP_SYNONYMS)) {
    return { action: null, special: "STOP" };
  }

  // Continue / next — mode-dependent
  if (matchesAny(t, CONTINUE_SYNONYMS)) {
    if (mode === "FORMULA") {
      return { action: { type: "SET_MODE", mode: "READING", modeId: null }, special: null };
    }
    if (mode === "VISUAL") {
      return { action: null, special: "IM_DONE" };
    }
    return { action: { type: "NEXT_CHUNK" }, special: null };
  }

  // Back — in VISUAL mode, quick exit without reflection
  if (mode === "VISUAL" && matchesAny(t, QUICK_EXIT_SYNONYMS)) {
    return { action: null, special: "QUICK_EXIT_VISUAL" };
  }
  if (matchesAny(t, BACK_SYNONYMS)) {
    return { action: { type: "PREV_CHUNK" }, special: null };
  }

  // --- Reading mode commands ---
  if (mode === "READING") {
    const questionPayload = startsWithAny(t, QUESTION_PREFIXES);
    if (questionPayload !== null) {
      return { action: { type: "ENTER_QA" }, special: "QUESTION", payload: questionPayload || "what does this mean?" };
    }
    if (matchesAny(t, SUMMARIZE_SYNONYMS)) {
      return { action: null, special: "SUMMARIZE" };
    }
  }

  // --- Formula mode commands ---
  if (mode === "FORMULA") {
    if (matchesAny(t, SYMBOLS_SYNONYMS) || includesAny(t, ["symbol"])) {
      return { action: { type: "FORMULA_SYMBOLS" }, special: null };
    }
    if (matchesAny(t, EXAMPLE_SYNONYMS) || includesAny(t, ["example"])) {
      return { action: { type: "FORMULA_EXAMPLE" }, special: null };
    }
    if (matchesAny(t, INTUITION_SYNONYMS) || includesAny(t, ["intuition", "simple"])) {
      return { action: { type: "FORMULA_INTUITION" }, special: null };
    }
  }

  // --- Visual Explorer commands ---
  if (mode === "VISUAL") {
    if (matchesAny(t, START_EXPLORING_SYNONYMS)) {
      return { action: { type: "ENTER_EXPLORE" }, special: "START_EXPLORING" };
    }
    if (matchesAny(t, WHAT_IS_HERE_SYNONYMS) || includesAny(t, ["what is here", "what's here"])) {
      return { action: null, special: "WHAT_IS_HERE" };
    }
    if (matchesAny(t, MARK_SYNONYMS)) {
      return { action: { type: "MARK_POINT" }, special: "MARK_THIS" };
    }
    const guideTarget = startsWithAny(t, GUIDE_PREFIXES);
    if (guideTarget !== null) {
      return {
        action: { type: "START_GUIDANCE", target: guideTarget },
        special: "GUIDE_TO",
        payload: guideTarget,
      };
    }
    if (matchesAny(t, NEXT_KEY_POINT_SYNONYMS)) {
      return { action: null, special: "NEXT_KEY_POINT" };
    }
    if (matchesAny(t, IM_DONE_SYNONYMS)) {
      return { action: null, special: "IM_DONE" };
    }
  }

  // Not recognized — return UNRECOGNIZED for chat fallback
  return { action: null, special: "UNRECOGNIZED", payload: t };
}
