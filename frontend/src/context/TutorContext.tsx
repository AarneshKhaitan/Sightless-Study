import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useMemo,
  type ReactNode,
} from "react";
import type {
  Chunk,
  DocumentManifest,
  FormulaModule,
  GuideState,
  TutorAction,
  VisualModule,
} from "../types";
import { createInitialState, tutorReducer, type TutorData } from "./tutorReducer";

interface TutorContextValue {
  state: GuideState;
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
  dispatch: (action: TutorAction) => void;
  currentChunk: Chunk | null;
  pageChunks: Chunk[];
}

const TutorCtx = createContext<TutorContextValue | null>(null);

interface Props {
  manifest: DocumentManifest;
  chunks: Chunk[];
  formulas: FormulaModule[];
  visuals: VisualModule[];
  children: ReactNode;
}

export function TutorProvider({
  manifest,
  chunks,
  formulas,
  visuals,
  children,
}: Props) {
  const data: TutorData = useMemo(
    () => ({ manifest, chunks }),
    [manifest, chunks]
  );

  const [state, rawDispatch] = useReducer(
    (s: GuideState, a: TutorAction) => tutorReducer(s, a, data),
    manifest.docId,
    createInitialState
  );

  const dispatch = useCallback(
    (action: TutorAction) => rawDispatch(action),
    []
  );

  const pageChunks = useMemo(
    () =>
      chunks
        .filter((c) => c.pageNo === state.pageNo)
        .sort((a, b) => a.order - b.order),
    [chunks, state.pageNo]
  );

  const currentChunk = pageChunks[state.chunkIndex] ?? null;

  const value: TutorContextValue = useMemo(
    () => ({
      state,
      manifest,
      chunks,
      formulas,
      visuals,
      dispatch,
      currentChunk,
      pageChunks,
    }),
    [state, manifest, chunks, formulas, visuals, dispatch, currentChunk, pageChunks]
  );

  return <TutorCtx.Provider value={value}>{children}</TutorCtx.Provider>;
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorCtx);
  if (!ctx) throw new Error("useTutor must be used within TutorProvider");
  return ctx;
}
