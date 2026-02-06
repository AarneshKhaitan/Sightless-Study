import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import type { VisualModule, LineGraphData, FlowchartData } from "../types";
import LineGraphRenderer from "./LineGraphRenderer";
import FlowchartRenderer from "./FlowchartRenderer";

interface Props {
  visual: VisualModule;
}

export interface ExploreCanvasHandle {
  getElement: () => HTMLDivElement | null;
}

const ExploreCanvas = forwardRef<ExploreCanvasHandle, Props>(
  function ExploreCanvas({ visual }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ width: 800, height: 500 });

    useImperativeHandle(ref, () => ({
      getElement: () => containerRef.current,
    }));

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          setSize({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      observer.observe(el);
      setSize({ width: el.clientWidth, height: el.clientHeight });
      return () => observer.disconnect();
    }, []);

    return (
      <div
        ref={containerRef}
        data-no-tap
        style={{
          width: "100%",
          height: "60vh",
          borderRadius: "12px",
          overflow: "hidden",
          touchAction: "none",
          cursor: "crosshair",
        }}
      >
        {visual.type === "line_graph" && (
          <LineGraphRenderer
            data={visual.data as LineGraphData}
            width={size.width}
            height={size.height}
          />
        )}
        {visual.type === "flowchart" && (
          <FlowchartRenderer
            data={visual.data as FlowchartData}
            width={size.width}
            height={size.height}
          />
        )}
      </div>
    );
  }
);

export default ExploreCanvas;
