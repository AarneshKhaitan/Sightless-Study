import { useEffect, useRef } from "react";
import type { FlowchartData } from "../types";

interface Props {
  data: FlowchartData;
  width: number;
  height: number;
}

export default function FlowchartRenderer({ data, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = "#1e1e3a";
    ctx.fillRect(0, 0, width, height);

    // Draw edges
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 2;
    for (const [fromId, toId] of data.edges) {
      const from = data.nodes.find((n) => n.id === fromId);
      const to = data.nodes.find((n) => n.id === toId);
      if (!from || !to) continue;

      const fx = from.x * width;
      const fy = from.y * height;
      const tx = to.x * width;
      const ty = to.y * height;

      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(ty - fy, tx - fx);
      const r = to.r * Math.min(width, height);
      const ax = tx - Math.cos(angle) * r;
      const ay = ty - Math.sin(angle) * r;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - 10 * Math.cos(angle - 0.3),
        ay - 10 * Math.sin(angle - 0.3)
      );
      ctx.lineTo(
        ax - 10 * Math.cos(angle + 0.3),
        ay - 10 * Math.sin(angle + 0.3)
      );
      ctx.closePath();
      ctx.fillStyle = "#666";
      ctx.fill();
    }

    // Draw nodes
    for (const node of data.nodes) {
      const cx = node.x * width;
      const cy = node.y * height;
      const r = node.r * Math.min(width, height);

      const isKey = data.keyNodes.includes(node.id);

      // Circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = isKey ? "#2a4a6a" : "#2a2a4a";
      ctx.fill();
      ctx.strokeStyle = isKey ? "#4cc9f0" : "#666";
      ctx.lineWidth = isKey ? 3 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = "#eee";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(node.label, cx, cy);
    }
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
}
