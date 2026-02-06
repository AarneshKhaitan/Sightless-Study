import logging

from fastapi import APIRouter

from models import FormulaExplainRequest, FormulaExplainResponse
from services.demo_store import get_formulas, get_visuals

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/modules", tags=["modules"])


@router.get("/formulas")
async def read_formulas(docId: str, pageNo: int | None = None):
    formulas = get_formulas(docId, pageNo)
    return {"formulas": formulas}


@router.get("/visuals")
async def read_visuals(docId: str, pageNo: int | None = None):
    visuals = get_visuals(docId, pageNo)
    return {"visuals": visuals}


def _deterministic_explain(formula: dict, section: str) -> str:
    """Fallback explanation when AI is unavailable."""
    if section == "purpose":
        return f"This formula is: {formula['expression']}. {formula['purpose']}. Say Symbols, Example, Intuition, Repeat, or Continue."
    elif section == "symbols":
        parts = [f"{s['sym']} means {s['meaning']}" for s in formula.get("symbols", [])]
        return f"Symbols: {'. '.join(parts)}."
    elif section == "example":
        return f"Example: {formula.get('example', 'No example available.')}"
    elif section == "intuition":
        return f"In other words, {formula.get('purpose', 'this formula transforms the input.')}"
    return formula.get("purpose", "No explanation available.")


@router.post("/formulas/explain")
async def explain_formula(req: FormulaExplainRequest) -> FormulaExplainResponse:
    formulas = get_formulas(req.docId)
    formula = next((f for f in formulas if f["formulaId"] == req.formulaId), None)
    if not formula:
        return FormulaExplainResponse(text="Formula not found.")

    # Try AI provider if available
    try:
        from services.ai_provider import get_ai_provider
        ai = get_ai_provider()
        if ai is not None:
            result = await ai.generate_formula_explanation(formula, req.section)
            return FormulaExplainResponse(text=result)
    except ImportError:
        pass
    except Exception as e:
        logger.warning("AI formula explain failed, using fallback: %s", e)

    return FormulaExplainResponse(text=_deterministic_explain(formula, req.section))
