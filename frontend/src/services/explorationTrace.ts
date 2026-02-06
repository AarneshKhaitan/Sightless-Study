import type { ExplorationTrace } from "../types";

let trace: ExplorationTrace | null = null;

export function startTrace(visualId: string) {
  trace = {
    visualId,
    startedAt: new Date().toISOString(),
    durationSec: 0,
    events: [],
    marked: [],
    visited: [],
  };
}

export function addEvent(
  type: "enter_feature" | "dwell_read" | "mark" | "guide_step",
  data: Record<string, unknown> = {}
) {
  if (!trace) return;
  trace.events.push({
    type,
    timestamp: Date.now(),
    data,
  });
}

export function addMark(markData: Record<string, unknown>) {
  if (!trace) return;
  trace.marked.push(markData);
  addEvent("mark", markData);
}

export function addVisited(label: string) {
  if (!trace) return;
  if (!trace.visited.includes(label)) {
    trace.visited.push(label);
  }
}

export function finishTrace(): ExplorationTrace | null {
  if (!trace) return null;
  const start = new Date(trace.startedAt).getTime();
  trace.durationSec = (Date.now() - start) / 1000;
  const result = { ...trace };
  trace = null;
  return result;
}

export function getTrace(): ExplorationTrace | null {
  return trace;
}
