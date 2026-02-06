import { useEffect, useRef } from "react";
import type { LineGraphData } from "../types";

interface Props {
  data: LineGraphData;
  width: number;
  height: number;
}

const PADDING = 60;

export default function LineGraphRenderer({ data, width, height }: Props) {
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

    const plotW = width - PADDING * 2;
    const plotH = height - PADDING * 2;

    const yValues = data.points.map((p) => p[1]);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);

    function toScreen(x: number, y: number): [number, number] {
      const sx = PADDING + ((x - data.xMin) / (data.xMax - data.xMin)) * plotW;
      const sy = PADDING + (1 - (y - yMin) / (yMax - yMin)) * plotH;
      return [sx, sy];
    }

    // Background
    ctx.fillStyle = "#1e1e3a";
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 5; i++) {
      const y = PADDING + (i / 5) * plotH;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(width - PADDING, y);
      ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, height - PADDING);
    ctx.lineTo(width - PADDING, height - PADDING);
    ctx.stroke();

    // Labels
    ctx.fillStyle = "#aaa";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.xLabel, width / 2, height - 10);
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(data.yLabel, 0, 0);
    ctx.restore();

    // Line
    ctx.strokeStyle = "#4cc9f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.points.length; i++) {
      const [x, y] = data.points[i]!;
      const [sx, sy] = toScreen(x, y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();

    // Feature markers
    const featureColors: Record<string, string> = {
      min: "#00ff88",
      peak: "#ff4444",
      inflection: "#ffaa00",
    };
    for (const [name, pts] of Object.entries(data.features)) {
      if (!pts) continue;
      ctx.fillStyle = featureColors[name] ?? "#fff";
      for (const pt of pts) {
        const [sx, sy] = toScreen(pt.x, pt.y);
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, Math.PI * 2);
        ctx.fill();
        // Label
        ctx.fillStyle = featureColors[name] ?? "#fff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(name, sx, sy - 12);
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
