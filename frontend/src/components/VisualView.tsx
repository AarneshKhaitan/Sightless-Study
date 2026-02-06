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

    // Speak description on entry
    const spokenEntryRef = useRef<string | null>(null);
    useEffect(() => {
      if (!visual || spokenEntryRef.current === visual.visualId) return;
      spokenEntryRef.current = visual.visualId;
      speak(
        `A visual is here: ${visual.title}. ${visual.description}. Say Start exploring when ready.`
      );
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
          case "MARK_THIS":
            handleMarkThis();
            break;
          case "GUIDE_TO":
            handleGuideTo(payload ?? "minimum");
            break;
          case "IM_DONE":
            handleImDone();
            break;
        }
      },
    }), [handleStartExploring, handleWhatIsHere, handleMarkThis, handleGuideTo, handleImDone]);

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
        <p style={{ color: "#888", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          {visual.visualId} &middot; {visual.type}
        </p>
      </div>
    );
  }
);

export default VisualView;
