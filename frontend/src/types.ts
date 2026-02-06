// --- API response types (match backend models) ---

export interface ModuleRef {
  type: "formula" | "visual";
  id: string;
}

export interface Page {
  pageNo: number;
  modules: ModuleRef[];
}

export interface OutlineSection {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
}

export interface Source {
  type: string;
  displayName: string;
  externalId: string | null;
  lastSyncedAt: string | null;
}

export interface DocumentManifest {
  docId: string;
  title: string;
  pages: Page[];
  outline: OutlineSection[];
  source: Source;
}

export interface Chunk {
  chunkId: string;
  pageNo: number;
  order: number;
  type: "heading" | "paragraph" | "bullets" | "caption";
  text: string;
}

export interface Symbol {
  sym: string;
  meaning: string;
}

export interface FormulaModule {
  formulaId: string;
  pageNo: number;
  expression: string;
  purpose: string;
  symbols: Symbol[];
  example: string;
}

export interface VisualFeaturePoint {
  x: number;
  y: number;
}

export interface FlowchartNode {
  id: string;
  label: string;
  x: number;
  y: number;
  r: number;
  desc: string;
}

export interface LineGraphData {
  xMin: number;
  xMax: number;
  xLabel: string;
  yLabel: string;
  points: [number, number][];
  features: {
    min?: VisualFeaturePoint[];
    peak?: VisualFeaturePoint[];
    inflection?: VisualFeaturePoint[];
  };
}

export interface FlowchartData {
  nodes: FlowchartNode[];
  edges: [string, string][];
  keyNodes: string[];
}

export interface VisualModule {
  visualId: string;
  pageNo: number;
  type: "line_graph" | "flowchart";
  title: string;
  description: string;
  data: LineGraphData | FlowchartData;
}

// --- Tutor state ---

export type TutorMode = "READING" | "FORMULA" | "VISUAL";

export type FormulaStep = "purpose" | "symbols" | "example" | "intuition";

export interface GuideState {
  docId: string;
  pageNo: number;
  chunkIndex: number;
  mode: TutorMode;
  modeId: string | null;
  formulaStep: FormulaStep | null;
  returnPosition: { pageNo: number; chunkIndex: number } | null;
}

// --- Exploration trace ---

export interface ExplorationEvent {
  type: "enter_feature" | "dwell_read" | "mark" | "guide_step";
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ExplorationTrace {
  visualId: string;
  startedAt: string;
  durationSec: number;
  events: ExplorationEvent[];
  marked: Record<string, unknown>[];
  visited: string[];
}

// --- Actions ---

export type TutorAction =
  | { type: "NEXT_CHUNK" }
  | { type: "PREV_CHUNK" }
  | { type: "GO_TO_CHUNK"; pageNo: number; chunkIndex: number }
  | { type: "SET_MODE"; mode: TutorMode; modeId: string | null }
  | { type: "SET_PAGE"; pageNo: number }
  | { type: "ENTER_QA" }
  | { type: "EXIT_QA" }
  | { type: "FORMULA_SYMBOLS" }
  | { type: "FORMULA_EXAMPLE" }
  | { type: "FORMULA_INTUITION" }
  | { type: "FORMULA_NEXT_STEP" }
  | { type: "FORMULA_PREV_STEP" }
  | { type: "ENTER_EXPLORE" }
  | { type: "EXIT_EXPLORE" }
  | { type: "MARK_POINT" }
  | { type: "START_GUIDANCE"; target: string }
  | { type: "STOP_GUIDANCE" };
