from fastapi import APIRouter, HTTPException

from models import ReflectRequest, ReflectResponse
from services.demo_store import get_visuals
from services.reflection import generate_reflection

router = APIRouter(prefix="/api/explore", tags=["explore"])


@router.post("/reflect", response_model=ReflectResponse)
async def reflect(request: ReflectRequest) -> ReflectResponse:
    visuals = get_visuals(request.docId)
    visual = next((v for v in visuals if v.visualId == request.visualId), None)
    if not visual:
        raise HTTPException(status_code=404, detail="Visual not found")

    return generate_reflection(
        visual_title=visual.title,
        visual_description=visual.description,
        trace=request.trace,
    )
