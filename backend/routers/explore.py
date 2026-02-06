import logging

from fastapi import APIRouter, HTTPException

from models import ReflectRequest, ReflectResponse
from services.demo_store import get_visuals
from services.reflection import generate_reflection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/explore", tags=["explore"])


@router.post("/reflect", response_model=ReflectResponse)
async def reflect(request: ReflectRequest) -> ReflectResponse:
    visuals = get_visuals(request.docId)
    visual = next((v for v in visuals if v.visualId == request.visualId), None)
    if not visual:
        raise HTTPException(status_code=404, detail="Visual not found")

    # Try AI-powered reflection
    try:
        from services.ai_provider import get_ai_provider
        ai = get_ai_provider()
        if ai is not None:
            visual_dict = {
                "title": visual.title,
                "type": visual.type,
                "description": visual.description,
            }
            trace_dict = request.trace.model_dump()
            result = await ai.generate_explore_reflection(visual_dict, trace_dict)
            return ReflectResponse(
                reflection=result["reflection"],
                takeaway=result["takeaway"],
                nextSuggestion=result["nextSuggestion"],
            )
    except ImportError:
        pass
    except Exception as e:
        logger.warning("AI reflection failed, using fallback: %s", e)

    # Fallback to template
    return generate_reflection(
        visual_title=visual.title,
        visual_description=visual.description,
        trace=request.trace,
    )
