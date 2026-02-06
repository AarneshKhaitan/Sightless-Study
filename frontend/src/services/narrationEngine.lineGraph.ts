import type { LineGraphData } from "../types";

export interface LineGraphNarration {
  text: string;
  region: string; // unique key for throttle dedup
}

function interpolateY(points: [number, number][], xNorm: number, xMin: number, xMax: number): number {
  const x = xMin + xNorm * (xMax - xMin);
  // Find surrounding points
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  // Beyond range, clamp
  if (points.length > 0) {
    if (x <= points[0]![0]) return points[0]![1];
    return points[points.length - 1]![1];
  }
  return 0;
}

function getTrend(points: [number, number][], xNorm: number, xMin: number, xMax: number): string {
  const x = xMin + xNorm * (xMax - xMin);
  // Find local slope
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    if (x >= x0 && x <= x1) {
      const slope = (y1 - y0) / (x1 - x0);
      if (Math.abs(slope) < 0.002) return "flat";
      return slope > 0 ? "increasing" : "decreasing";
    }
  }
  return "flat";
}

function nearFeature(
  data: LineGraphData,
  xNorm: number,
  yNorm: number,
  threshold: number = 0.12
): { name: string; dist: number } | null {
  // Compute y-range for normalization
  const yValues = data.points.map((p) => p[1]);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax > yMin ? yMax - yMin : 1;

  const allFeatures: { name: string; fx: number; fy: number }[] = [];
  for (const [name, pts] of Object.entries(data.features)) {
    if (pts) {
      for (const pt of pts) {
        allFeatures.push({ name, fx: pt.x, fy: pt.y });
      }
    }
  }

  let closest: { name: string; dist: number } | null = null;
  for (const f of allFeatures) {
    // Normalize feature x and y to 0-1
    const fxNorm = (f.fx - data.xMin) / (data.xMax - data.xMin);
    const fyNorm = 1 - (f.fy - yMin) / yRange; // invert for screen coords
    const dx = xNorm - fxNorm;
    const dy = yNorm - fyNorm;
    // Euclidean distance using both axes
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < threshold && (!closest || dist < closest.dist)) {
      closest = { name: f.name, dist };
    }
  }

  return closest;
}

export function narrateLineGraph(
  data: LineGraphData,
  xNorm: number,
  yNorm: number,
  isDwell: boolean
): LineGraphNarration | null {
  const x = data.xMin + xNorm * (data.xMax - data.xMin);
  const y = interpolateY(data.points, xNorm, data.xMin, data.xMax);
  const trend = getTrend(data.points, xNorm, data.xMin, data.xMax);

  // Check proximity to features using both X and Y axes
  const feature = nearFeature(data, xNorm, yNorm);

  // Region key: bucket x into segments for transition detection
  const bucket = Math.floor(xNorm * 10);
  const region = feature ? `feature-${feature.name}` : `segment-${bucket}`;

  if (feature && feature.dist < 0.03) {
    // Very close to feature
    return {
      text: `${data.xLabel} ${Math.round(x)}, ${data.yLabel} ${y.toFixed(2)}. This is the ${feature.name}.`,
      region,
    };
  }

  if (isDwell) {
    let text = `${data.xLabel} ${Math.round(x)}, ${data.yLabel} ${y.toFixed(2)}, ${trend}.`;
    if (feature) {
      text += ` Near the ${feature.name}.`;
    }
    return { text, region };
  }

  // On region transition (handled by throttle), give brief info
  if (feature) {
    return {
      text: `Approaching ${feature.name}.`,
      region,
    };
  }

  return { text: `${data.xLabel} ${Math.round(x)}, ${trend}.`, region };
}

export function getFeaturePosition(
  data: LineGraphData,
  featureName: string
): { xNorm: number; yNorm: number } | null {
  const features = data.features as Record<string, { x: number; y: number }[] | undefined>;
  const pts = features[featureName];
  if (!pts || pts.length === 0) return null;
  const pt = pts[0]!;
  const xNorm = (pt.x - data.xMin) / (data.xMax - data.xMin);
  // For yNorm we'd need yMin/yMax but we approximate from data range
  const yValues = data.points.map((p) => p[1]);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yNorm = yMax > yMin ? (pt.y - yMin) / (yMax - yMin) : 0.5;
  return { xNorm, yNorm: 1 - yNorm }; // invert y for screen coords
}
