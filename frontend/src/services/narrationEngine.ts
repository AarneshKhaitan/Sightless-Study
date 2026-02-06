import type { VisualModule, LineGraphData, FlowchartData } from "../types";
import { narrateLineGraph } from "./narrationEngine.lineGraph";
import { narrateFlowchart } from "./narrationEngine.flowchart";

export interface NarrationResult {
  text: string;
  region: string;
}

export function narrate(
  visual: VisualModule,
  xNorm: number,
  yNorm: number,
  isDwell: boolean
): NarrationResult | null {
  if (visual.type === "line_graph") {
    return narrateLineGraph(visual.data as LineGraphData, xNorm, yNorm, isDwell);
  }
  if (visual.type === "flowchart") {
    return narrateFlowchart(visual.data as FlowchartData, xNorm, yNorm, isDwell);
  }
  return null;
}
