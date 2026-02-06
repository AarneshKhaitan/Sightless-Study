import { useCallback, useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { useTutor } from "../context/TutorContext";
import type { VisualModule, LineGraphData, FlowchartData } from "../types";
import ExploreCanvas, { type ExploreCanvasHandle } from "./ExploreCanvas";
import { startSampling, stopSampling, type PointerSample } from "../services/pointerSampler";
import { narrate } from "../services/narrationEngine";
import { shouldNarrate, markSpoken, resetThrottle } from "../services/narrationThrottle";
import { computeGuidance } from "../services/guidanceEngine";
import { getFeaturePosition } from "../services/narrationEngine.lineGraph";
import { getKeyNodePosition } from "../services/narrationEngine.flowchart";
import * as traceService from "../services/explorationTrace";
import { postReflection } from "../api/client";

interface Props {
  speak: (text: string) => Promise<void>;
}

export interface VisualViewHandle {
  handleVisualIntent: (intent: string, payload?: string) => void;
}

const VisualView = forwardRef<VisualViewHandle, Props>(
  function VisualView({ speak }, ref) {
    const { state, visuals, dispatch } = useTutor();
    const canvasRef = useRef<ExploreCanvasHandle>(null);
    const [exploring, setExploring] = useState(false);
    const [guidanceTarget, setGuidanceTarget] = useState<{
      x: number;
      y: number;
      name: string;
    } | null>(null);
    const speakRef = useRef(speak);
    speakRef.current = speak;
    const pointerRef = useRef({ x: 0.5, y: 0.5 });

    const visual: VisualModule | undefined = visuals.find(
      (v) => v.visualId === state.modeId
    );

    // Speak description + overview on entry
    const spokenEntryRef = useRef<string | null>(null);
    useEffect(() => {
      if (!visual || spokenEntryRef.current === visual.visualId) return;
      spokenEntryRef.current = visual.visualId;

      let overview = `A visual is here: ${visual.title}. ${visual.description}.`;

      if (visual.type === "line_graph") {
        const gd = visual.data as LineGraphData;
        const yValues = gd.points.map((p) => p[1]);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const featureNames = Object.keys(gd.features).filter(
          (k) => {
            const pts = (gd.features as Record<string, unknown>)[k];
            return Array.isArray(pts) && pts.length > 0;
          }
        );
        overview += ` This is a line graph. ${gd.xLabel} ranges from ${gd.xMin} to ${gd.xMax}. ${gd.yLabel} ranges from ${yMin.toFixed(2)} to ${yMax.toFixed(2)}.`;
        if (featureNames.length > 0) {
          overview += ` Key features: ${featureNames.join(", ")}.`;
        }
      } else if (visual.type === "flowchart") {
        const fd = visual.data as FlowchartData;
        overview += ` This is a flowchart with ${fd.nodes.length} nodes and ${fd.edges.length} connections.`;
      }

      overview += " Say Start exploring when ready, or Go back to return to reading.";
      speak(overview);
    }, [visual, speak]);

    // Handle pointer samples during exploration
    const handleSample = useCallback(
      (sample: PointerSample) => {
        if (!visual) return;
        pointerRef.current = { x: sample.x, y: sample.y };

        const result = narrate(visual, sample.x, sample.y, sample.isDwell);
        if (result && shouldNarrate(result.region, sample.isDwell)) {
          markSpoken(result.region);
          speakRef.current(result.text);
          traceService.addVisited(result.region);
          if (sample.isDwell) {
            traceService.addEvent("dwell_read", { x: sample.x, y: sample.y, text: result.text });
          } else {
            traceService.addEvent("enter_feature", { region: result.region });
          }
        }

        // Guidance updates
        if (guidanceTarget) {
          const guidance = computeGuidance(
            sample.x,
            sample.y,
            guidanceTarget.x,
            guidanceTarget.y
          );
          if (shouldNarrate(`guidance-${guidanceTarget.name}`, true)) {
            markSpoken(`guidance-${guidanceTarget.name}`);
            speakRef.current(guidance.direction);
            traceService.addEvent("guide_step", {
              direction: guidance.direction,
              target: guidanceTarget.name,
            });
          }
          if (guidance.arrived) {
            setGuidanceTarget(null);
          }
        }
      },
      [visual, guidanceTarget]
    );

    // Start/stop pointer sampling
    useEffect(() => {
      if (!exploring) return;
      const el = canvasRef.current?.getElement();
      if (!el) return;

      resetThrottle();
      const cleanup = startSampling(el, handleSample);
      return () => {
        cleanup();
        stopSampling();
      };
    }, [exploring, handleSample]);

    // --- Intent handlers ---

    const handleStartExploring = useCallback(() => {
      if (!visual) return;
      setExploring(true);
      traceService.startTrace(visual.visualId);
      speak(
        "Move your pointer around the canvas. Say What is here to hear details about your current position. Say Mark this to bookmark a point. Say Guide me to minimum or peak for directions."
      );
    }, [visual, speak]);

    const handleWhatIsHere = useCallback(() => {
      if (!visual) return;
      const result = narrate(visual, pointerRef.current.x, pointerRef.current.y, true);
      if (result) {
        speak(result.text);
      } else {
        speak("You're not near any notable feature. Try moving your pointer.");
      }
    }, [visual, speak]);

    const handleMarkThis = useCallback(() => {
      if (!visual) return;
      const result = narrate(visual, pointerRef.current.x, pointerRef.current.y, true);
      const label = result?.text ?? "unknown position";
      traceService.addMark({
        x: pointerRef.current.x,
        y: pointerRef.current.y,
        label,
      });
      speak(`Marked. ${label}`);
    }, [visual, speak]);

    const handleGuideTo = useCallback(
      (target: string) => {
        if (!visual) return;
        let pos: { xNorm: number; yNorm: number } | null = null;

        if (visual.type === "line_graph") {
          pos = getFeaturePosition(visual.data as LineGraphData, target);
        } else if (visual.type === "flowchart") {
          const fcData = visual.data as FlowchartData;
          const result = getKeyNodePosition(fcData, []);
          if (result) {
            pos = { xNorm: result.xNorm, yNorm: result.yNorm };
          }
        }

        if (pos) {
          setGuidanceTarget({ x: pos.xNorm, y: pos.yNorm, name: target });
          speak(`Guiding you to the ${target}. Move your pointer.`);
        } else {
          speak(`I couldn't find a ${target} in this visual.`);
        }
      },
      [visual, speak]
    );

    const handleImDone = useCallback(async () => {
      setExploring(false);
      stopSampling();
      setGuidanceTarget(null);

      const trace = traceService.finishTrace();
      if (!trace || !visual) {
        dispatch({ type: "EXIT_EXPLORE" });
        return;
      }

      speak("Let me summarize what you explored.");
      try {
        const result = await postReflection(state.docId, visual.visualId, trace);
        await speak(
          `${result.reflection} ${result.takeaway} ${result.nextSuggestion}`
        );
      } catch {
        await speak("You explored this visual. Say Continue to move on.");
      }
      dispatch({ type: "EXIT_EXPLORE" });
    }, [visual, state.docId, speak, dispatch]);

    const handleQuickExit = useCallback(() => {
      setExploring(false);
      stopSampling();
      setGuidanceTarget(null);
      traceService.finishTrace();
      dispatch({ type: "SET_MODE", mode: "READING", modeId: null });
      speak("Returning to reading mode.");
    }, [dispatch, speak]);

    const handleDescribeVisual = useCallback(() => {
      if (!visual) return;
      let description = `${visual.title}. ${visual.description}.`;

      if (visual.type === "line_graph") {
        const gd = visual.data as LineGraphData;
        const yValues = gd.points.map((p) => p[1]);
        const yMin = Math.min(...yValues);
        const yMax = Math.max(...yValues);
        const featureNames = Object.keys(gd.features).filter((k) => {
          const pts = (gd.features as Record<string, unknown>)[k];
          return Array.isArray(pts) && pts.length > 0;
        });
        description += ` This is a line graph. ${gd.xLabel} ranges from ${gd.xMin} to ${gd.xMax}. ${gd.yLabel} ranges from ${yMin.toFixed(2)} to ${yMax.toFixed(2)}.`;
        if (featureNames.length > 0) {
          description += ` Key features: ${featureNames.join(", ")}.`;
        }
      } else if (visual.type === "flowchart") {
        const fd = visual.data as FlowchartData;
        description += ` This is a flowchart with ${fd.nodes.length} nodes and ${fd.edges.length} connections.`;
        if (fd.keyNodes.length > 0) {
          description += ` Key nodes: ${fd.keyNodes.join(", ")}.`;
        }
      }

      speak(description);
    }, [visual, speak]);

    const handleNextKeyPoint = useCallback(() => {
      if (!visual) return;
      if (visual.type === "line_graph") {
        const gd = visual.data as LineGraphData;
        const featureNames = Object.keys(gd.features).filter((k) => {
          const pts = (gd.features as Record<string, unknown>)[k];
          return Array.isArray(pts) && pts.length > 0;
        });
        if (featureNames.length > 0) {
          const target = featureNames[0]!;
          handleGuideTo(target);
        } else {
          speak("No key features found in this graph.");
        }
      } else if (visual.type === "flowchart") {
        const fd = visual.data as FlowchartData;
        if (fd.keyNodes.length > 0) {
          const target = fd.keyNodes[0]!;
          handleGuideTo(target);
        } else {
          speak("No key nodes found in this flowchart.");
        }
      }
    }, [visual, speak, handleGuideTo]);

    // Expose intent handler to parent via ref
    useImperativeHandle(ref, () => ({
      handleVisualIntent(intent: string, payload?: string) {
        switch (intent) {
          case "START_EXPLORING":
            handleStartExploring();
            break;
          case "WHAT_IS_HERE":
            handleWhatIsHere();
            break;
          case "DESCRIBE_VISUAL":
            handleDescribeVisual();
            break;
          case "MARK_THIS":
            handleMarkThis();
            break;
          case "GUIDE_TO":
            handleGuideTo(payload ?? "minimum");
            break;
          case "IM_DONE":
            handleImDone();
            break;
          case "QUICK_EXIT_VISUAL":
            handleQuickExit();
            break;
          case "NEXT_KEY_POINT":
            handleNextKeyPoint();
            break;
        }
      },
    }), [handleStartExploring, handleWhatIsHere, handleDescribeVisual, handleMarkThis, handleGuideTo, handleImDone, handleQuickExit, handleNextKeyPoint]);

    if (!visual) {
      return <p style={{ fontSize: "1.5rem", color: "#888" }}>Visual not found.</p>;
    }

    return (
      <div>
        <p
          style={{
            fontSize: "1.3rem",
            color: "#4cc9f0",
            marginBottom: "1rem",
          }}
        >
          {visual.title}
          {exploring && " — Exploring"}
          {guidanceTarget && ` — Guiding to ${guidanceTarget.name}`}
        </p>
        <ExploreCanvas ref={canvasRef} visual={visual} />
        {exploring && (
          <button
            onClick={handleImDone}
            style={{
              marginTop: "1rem",
              padding: "1rem 2rem",
              fontSize: "1.3rem",
              fontWeight: "bold",
              background: "#f07070",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              cursor: "pointer",
              width: "100%",
            }}
          >
            Stop Exploring
          </button>
        )}
        <p style={{ color: "#888", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          {visual.visualId} &middot; {visual.type}
        </p>
      </div>
    );
  }
);

export default VisualView;
