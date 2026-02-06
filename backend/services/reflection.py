from __future__ import annotations

from models import ExplorationTrace, ReflectResponse


def generate_reflection(
    visual_title: str,
    visual_description: str,
    trace: ExplorationTrace,
) -> ReflectResponse:
    """Template-based reflection generation. Can be replaced with LLM later."""
    visited_count = len(trace.visited)
    marked_count = len(trace.marked)

    if visited_count == 0:
        explored_text = "You briefly looked at the visual"
    else:
        feature_list = ", ".join(trace.visited[:5])
        explored_text = f"You explored {visited_count} features including {feature_list}"

    if marked_count > 0:
        explored_text += f" and marked {marked_count} point{'s' if marked_count > 1 else ''}"

    reflection = f"{explored_text}."
    takeaway = f"Key insight from this visual: {visual_description}"
    next_suggestion = "Try asking a question about what you observed, or say Continue to move on."

    return ReflectResponse(
        reflection=reflection,
        takeaway=takeaway,
        nextSuggestion=next_suggestion,
    )
