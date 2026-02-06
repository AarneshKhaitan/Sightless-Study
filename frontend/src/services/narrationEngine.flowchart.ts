import type { FlowchartData, FlowchartNode } from "../types";

export interface FlowchartNarration {
  text: string;
  region: string;
}

function findNearestNode(
  data: FlowchartData,
  xNorm: number,
  yNorm: number
): FlowchartNode | null {
  let nearest: FlowchartNode | null = null;
  let nearestDist = Infinity;

  for (const node of data.nodes) {
    const dx = xNorm - node.x;
    const dy = yNorm - node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < node.r && dist < nearestDist) {
      nearest = node;
      nearestDist = dist;
    }
  }

  return nearest;
}

function getAdjacentNodes(
  data: FlowchartData,
  nodeId: string
): string[] {
  const adjacent: string[] = [];
  for (const [from, to] of data.edges) {
    if (from === nodeId) {
      const node = data.nodes.find((n) => n.id === to);
      if (node) adjacent.push(node.label);
    }
    if (to === nodeId) {
      const node = data.nodes.find((n) => n.id === from);
      if (node) adjacent.push(node.label);
    }
  }
  return adjacent;
}

export function narrateFlowchart(
  data: FlowchartData,
  xNorm: number,
  yNorm: number,
  isDwell: boolean
): FlowchartNarration | null {
  const node = findNearestNode(data, xNorm, yNorm);

  if (!node) {
    return null; // Not near any node, stay silent
  }

  const region = `node-${node.id}`;

  if (isDwell) {
    const adjacent = getAdjacentNodes(data, node.id);
    let text = `${node.label}: ${node.desc}`;
    if (adjacent.length > 0) {
      text += ` Connected to: ${adjacent.join(", ")}.`;
    }
    return { text, region };
  }

  // Region entry: just speak name and description
  return {
    text: `${node.label}: ${node.desc}`,
    region,
  };
}

export function getKeyNodePosition(
  data: FlowchartData,
  visitedNodeIds: string[]
): { xNorm: number; yNorm: number; nodeId: string } | null {
  // Find next key node not yet visited
  for (const keyId of data.keyNodes) {
    if (!visitedNodeIds.includes(keyId)) {
      const node = data.nodes.find((n) => n.id === keyId);
      if (node) {
        return { xNorm: node.x, yNorm: node.y, nodeId: node.id };
      }
    }
  }
  // All key nodes visited — try any unvisited node
  for (const node of data.nodes) {
    if (!visitedNodeIds.includes(node.id)) {
      return { xNorm: node.x, yNorm: node.y, nodeId: node.id };
    }
  }
  return null;
}
