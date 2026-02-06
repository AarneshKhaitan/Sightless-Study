from fastapi import APIRouter

from services.demo_store import get_formulas, get_visuals

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("/formulas")
async def read_formulas(docId: str, pageNo: int | None = None):
    formulas = get_formulas(docId, pageNo)
    return {"formulas": formulas}


@router.get("/visuals")
async def read_visuals(docId: str, pageNo: int | None = None):
    visuals = get_visuals(docId, pageNo)
    return {"visuals": visuals}
