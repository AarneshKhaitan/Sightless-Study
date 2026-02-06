import { useEffect, useRef } from "react";
import type { LineGraphData } from "../types";
import { colors } from "../theme";

interface Props {
  data: LineGraphData;
  width: number;
  height: number;
}

const PADDING = 70;

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
    ctx.fillStyle = colors.bg.card;
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.strokeStyle = colors.graph.grid;
    ctx.lineWidth = 0.5;
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const y = PADDING + (i / gridCount) * plotH;
      ctx.beginPath();
      ctx.moveTo(PADDING, y);
      ctx.lineTo(width - PADDING, y);
      ctx.stroke();

      // Y-axis tick labels
      const yVal = yMax - (i / gridCount) * (yMax - yMin);
      ctx.fillStyle = colors.text.muted;
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(yVal.toFixed(2), PADDING - 8, y);
    }

    // X-axis tick labels
    const xTickCount = 5;
    for (let i = 0; i <= xTickCount; i++) {
      const xVal = data.xMin + (i / xTickCount) * (data.xMax - data.xMin);
      const sx = PADDING + (i / xTickCount) * plotW;
      ctx.fillStyle = colors.text.muted;
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(xVal.toFixed(0), sx, height - PADDING + 8);
    }

    // Axes
    ctx.strokeStyle = colors.graph.axis;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PADDING, PADDING);
    ctx.lineTo(PADDING, height - PADDING);
    ctx.lineTo(width - PADDING, height - PADDING);
    ctx.stroke();

    // Axis labels
    ctx.fillStyle = colors.text.secondary;
    ctx.font = "13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.xLabel, width / 2, height - 8);
    ctx.save();
    ctx.translate(14, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(data.yLabel, 0, 0);
    ctx.restore();

    // Line with glow
    ctx.save();
    ctx.shadowColor = colors.accent.primaryGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = colors.graph.line;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < data.points.length; i++) {
      const [x, y] = data.points[i]!;
      const [sx, sy] = toScreen(x, y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.restore();

    // Feature markers and legend data
    const featureColors: Record<string, string> = {
      min: colors.graph.min,
      peak: colors.graph.peak,
      inflection: colors.graph.inflection,
    };

    const legendEntries: { name: string; color: string }[] = [];

    for (const [name, pts] of Object.entries(data.features)) {
      if (!pts || !Array.isArray(pts) || pts.length === 0) continue;
      const markerColor = featureColors[name] ?? colors.text.primary;
      legendEntries.push({ name, color: markerColor });

      for (const pt of pts) {
        const [sx, sy] = toScreen(pt.x, pt.y);

        // Glow ring
        ctx.save();
        ctx.shadowColor = markerColor;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fillStyle = markerColor;
        ctx.fill();
        ctx.restore();

        // Inner dot
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx.fillStyle = colors.bg.card;
        ctx.fill();

        // Label
        ctx.fillStyle = markerColor;
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(name, sx, sy - 14);
      }
    }

    // Legend box (top-right)
    if (legendEntries.length > 0) {
      const legendX = width - PADDING - 10;
      const legendY = PADDING + 10;
      const lineH = 18;
      const legendW = 110;
      const legendH = legendEntries.length * lineH + 12;

      ctx.fillStyle = `${colors.bg.primary}cc`;
      ctx.strokeStyle = colors.graph.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(legendX - legendW, legendY, legendW, legendH, 6);
      ctx.fill();
      ctx.stroke();

      legendEntries.forEach((entry, i) => {
        const ey = legendY + 10 + i * lineH;
        const ex = legendX - legendW + 10;

        // Color dot
        ctx.beginPath();
        ctx.arc(ex + 4, ey + 4, 4, 0, Math.PI * 2);
        ctx.fillStyle = entry.color;
        ctx.fill();

        // Label
        ctx.fillStyle = colors.text.secondary;
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(entry.name, ex + 14, ey + 4);
      });
    }
  }, [data, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, display: "block" }}
    />
  );
}
