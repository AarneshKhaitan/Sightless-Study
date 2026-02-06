import { useEffect, useRef } from "react";
import type { FlowchartData } from "../types";
import { colors } from "../theme";

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

    const minDim = Math.min(width, height);

    // Background
    ctx.fillStyle = colors.bg.card;
    ctx.fillRect(0, 0, width, height);

    // Draw edges
    for (const [fromId, toId] of data.edges) {
      const from = data.nodes.find((n) => n.id === fromId);
      const to = data.nodes.find((n) => n.id === toId);
      if (!from || !to) continue;

      const fx = from.x * width;
      const fy = from.y * height;
      const tx = to.x * width;
      const ty = to.y * height;

      // Edge line
      ctx.strokeStyle = colors.text.muted;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(ty - fy, tx - fx);
      const nodeW = to.r * minDim * 1.8;
      const nodeH = to.r * minDim * 1.1;
      // Approximate edge of rounded rect
      const dist = Math.max(nodeW, nodeH) * 0.6;
      const ax = tx - Math.cos(angle) * dist;
      const ay = ty - Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - 12 * Math.cos(angle - 0.35),
        ay - 12 * Math.sin(angle - 0.35)
      );
      ctx.lineTo(
        ax - 12 * Math.cos(angle + 0.35),
        ay - 12 * Math.sin(angle + 0.35)
      );
      ctx.closePath();
      ctx.fillStyle = colors.text.muted;
      ctx.fill();
    }

    // Draw nodes as rounded rectangles
    for (const node of data.nodes) {
      const cx = node.x * width;
      const cy = node.y * height;
      const r = node.r * minDim;
      const isKey = data.keyNodes.includes(node.id);

      const nodeW = r * 3.6;
      const nodeH = r * 2.2;
      const rx = cx - nodeW / 2;
      const ry = cy - nodeH / 2;
      const cornerR = 10;

      // Glow for key nodes
      if (isKey) {
        ctx.save();
        ctx.shadowColor = colors.accent.primaryGlow;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.roundRect(rx, ry, nodeW, nodeH, cornerR);
        ctx.fillStyle = "transparent";
        ctx.fill();
        ctx.restore();
      }

      // Node fill with gradient
      const gradient = ctx.createLinearGradient(rx, ry, rx, ry + nodeH);
      if (isKey) {
        gradient.addColorStop(0, "#1a3a5a");
        gradient.addColorStop(1, "#142a44");
      } else {
        gradient.addColorStop(0, colors.bg.elevated);
        gradient.addColorStop(1, colors.bg.tertiary);
      }

      ctx.beginPath();
      ctx.roundRect(rx, ry, nodeW, nodeH, cornerR);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Border
      ctx.strokeStyle = isKey ? colors.accent.primary : colors.text.muted;
      ctx.lineWidth = isKey ? 2.5 : 1.5;
      ctx.stroke();

      // Label
      ctx.fillStyle = isKey ? colors.accent.primary : colors.text.primary;
      ctx.font = `${isKey ? "bold " : ""}13px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Word-wrap label if too long
      const words = node.label.split(" ");
      if (words.length > 2 && ctx.measureText(node.label).width > nodeW - 16) {
        const mid = Math.ceil(words.length / 2);
        const line1 = words.slice(0, mid).join(" ");
        const line2 = words.slice(mid).join(" ");
        ctx.fillText(line1, cx, cy - 8);
        ctx.fillText(line2, cx, cy + 8);
      } else {
        ctx.fillText(node.label, cx, cy);
      }
    }
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
}
