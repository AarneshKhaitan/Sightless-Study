import type {
  Chunk,
  DocumentManifest,
  GuideState,
  TutorAction,
} from "../types";

export interface TutorData {
  manifest: DocumentManifest;
  chunks: Chunk[];
}

function chunksForPage(chunks: Chunk[], pageNo: number): Chunk[] {
  return chunks
    .filter((c) => c.pageNo === pageNo)
    .sort((a, b) => a.order - b.order);
}

function getModuleOnPage(manifest: DocumentManifest, pageNo: number) {
  const page = manifest.pages.find((p) => p.pageNo === pageNo);
  if (!page || page.modules.length === 0) return null;
  return page.modules[0]!;
}

export function createInitialState(docId: string): GuideState {
  return {
    docId,
    pageNo: 1,
    chunkIndex: 0,
    mode: "READING",
    modeId: null,
    formulaStep: null,
    returnPosition: null,
  };
}

export function tutorReducer(
  state: GuideState,
  action: TutorAction,
  data: TutorData
): GuideState {
  const { manifest, chunks } = data;
  const pageChunks = chunksForPage(chunks, state.pageNo);
  const totalPages = manifest.pages.length;

  switch (action.type) {
    case "NEXT_CHUNK": {
      const nextIndex = state.chunkIndex + 1;
      if (nextIndex < pageChunks.length) {
        return { ...state, chunkIndex: nextIndex };
      }
      // Advance to next page
      const nextPage = state.pageNo + 1;
      if (nextPage > totalPages) {
        return state; // at the end
      }
      // Check if next page has a module → auto-switch mode
      const mod = getModuleOnPage(manifest, nextPage);
      if (mod?.type === "formula") {
        return {
          ...state,
          pageNo: nextPage,
          chunkIndex: 0,
          mode: "FORMULA",
          modeId: mod.id,
          formulaStep: "purpose",
        };
      }
      if (mod?.type === "visual") {
        return {
          ...state,
          pageNo: nextPage,
          chunkIndex: 0,
          mode: "VISUAL",
          modeId: mod.id,
        };
      }
      return { ...state, pageNo: nextPage, chunkIndex: 0 };
    }

    case "PREV_CHUNK": {
      if (state.chunkIndex > 0) {
        return { ...state, chunkIndex: state.chunkIndex - 1 };
      }
      // Go to previous page
      const prevPage = state.pageNo - 1;
      if (prevPage < 1) return state;
      const prevChunks = chunksForPage(chunks, prevPage);
      return {
        ...state,
        pageNo: prevPage,
        chunkIndex: Math.max(0, prevChunks.length - 1),
        mode: "READING",
        modeId: null,
        formulaStep: null,
      };
    }

    case "GO_TO_CHUNK":
      return {
        ...state,
        pageNo: action.pageNo,
        chunkIndex: action.chunkIndex,
        mode: "READING",
        modeId: null,
        formulaStep: null,
      };

    case "SET_MODE":
      return { ...state, mode: action.mode, modeId: action.modeId };

    case "SET_PAGE": {
      const mod = getModuleOnPage(manifest, action.pageNo);
      if (mod?.type === "formula") {
        return {
          ...state,
          pageNo: action.pageNo,
          chunkIndex: 0,
          mode: "FORMULA",
          modeId: mod.id,
          formulaStep: "purpose",
        };
      }
      if (mod?.type === "visual") {
        return {
          ...state,
          pageNo: action.pageNo,
          chunkIndex: 0,
          mode: "VISUAL",
          modeId: mod.id,
        };
      }
      return {
        ...state,
        pageNo: action.pageNo,
        chunkIndex: 0,
        mode: "READING",
        modeId: null,
      };
    }

    case "ENTER_QA":
      return {
        ...state,
        returnPosition: {
          pageNo: state.pageNo,
          chunkIndex: state.chunkIndex,
        },
      };

    case "EXIT_QA": {
      if (!state.returnPosition) return state;
      const { pageNo, chunkIndex } = state.returnPosition;
      return {
        ...state,
        pageNo,
        chunkIndex,
        returnPosition: null,
      };
    }

    case "FORMULA_SYMBOLS":
      return { ...state, formulaStep: "symbols" };

    case "FORMULA_EXAMPLE":
      return { ...state, formulaStep: "example" };

    case "FORMULA_INTUITION":
      return { ...state, formulaStep: "intuition" };

    case "FORMULA_NEXT_STEP": {
      const steps = ["purpose", "symbols", "example", "intuition"] as const;
      const idx = steps.indexOf(state.formulaStep ?? "purpose");
      const next = steps[Math.min(idx + 1, steps.length - 1)] ?? "intuition";
      return { ...state, formulaStep: next };
    }

    case "FORMULA_PREV_STEP": {
      const steps = ["purpose", "symbols", "example", "intuition"] as const;
      const idx = steps.indexOf(state.formulaStep ?? "purpose");
      if (idx <= 0) {
        // Exit formula mode
        return { ...state, mode: "READING", modeId: null, formulaStep: null };
      }
      return { ...state, formulaStep: steps[idx - 1] ?? "purpose" };
    }

    case "ENTER_EXPLORE":
      return { ...state };

    case "EXIT_EXPLORE": {
      // Advance to next page in reading mode
      const nextPage = state.pageNo + 1;
      if (nextPage > totalPages) {
        return { ...state, mode: "READING", modeId: null };
      }
      return {
        ...state,
        pageNo: nextPage,
        chunkIndex: 0,
        mode: "READING",
        modeId: null,
      };
    }

    case "MARK_POINT":
    case "START_GUIDANCE":
    case "STOP_GUIDANCE":
      // Handled by VisualView component, not reducer
      return state;

    default:
      return state;
  }
}
