"""
Extract formula and visual modules from PDF pages using AI.
Coordinates between pdf_parser (raw extraction) and ai_provider (LLM calls).
"""

import asyncio
import base64
import logging

import fitz  # PyMuPDF

from models import FormulaModule, VisualModule, ModuleRef, Symbol

logger = logging.getLogger(__name__)

MAX_CONCURRENCY = 5

# Indicators that suggest a page contains mathematical formulas
_FORMULA_INDICATORS = [
    "=", "\u2211", "\u222B", "\u2202", "\u221A", "\u03A3", "\u220F",
    "sum_", "exp(", "log(", "sin(", "cos(", "tan(",
    "argmax", "argmin", "softmax", "sigmoid",
    "^2", "^n", "f(x)", "P(", "E[", "d/dx",
    "\\frac", "\\sum", "\\int", "\\partial",
]


def _has_formula_indicators(text: str) -> bool:
    """Heuristic: does this page text likely contain formulas?"""
    text_lower = text.lower()
    matches = sum(1 for ind in _FORMULA_INDICATORS if ind.lower() in text_lower)
    return matches >= 2


def _has_visual_indicators(page: fitz.Page) -> bool:
    """Check if a page likely contains visual elements (images or drawings)."""
    images = page.get_images(full=True)
    if images:
        return True
    try:
        drawings = page.get_drawings()
        if len(drawings) > 5:
            return True
    except Exception:
        pass
    return False


def _render_page_to_base64(page: fitz.Page, dpi: int = 150) -> str:
    """Render a PDF page to a base64-encoded PNG string."""
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)
    pix = page.get_pixmap(matrix=mat)
    png_bytes = pix.tobytes("png")
    return base64.b64encode(png_bytes).decode("utf-8")


async def _extract_page_formulas(
    ai,
    page_no: int,
    page_text: str,
    semaphore: asyncio.Semaphore,
) -> list[FormulaModule]:
    """Extract formulas from a single page via LLM."""
    async with semaphore:
        try:
            raw_formulas = await ai.extract_formulas_from_text(page_no, page_text)
            result = []
            for idx, f in enumerate(raw_formulas):
                symbols = [
                    Symbol(sym=s.get("sym", ""), meaning=s.get("meaning", ""))
                    for s in f.get("symbols", [])
                ]
                result.append(FormulaModule(
                    formulaId=f"f{page_no}-{idx + 1}",
                    pageNo=page_no,
                    expression=f.get("expression", ""),
                    purpose=f.get("purpose", ""),
                    symbols=symbols,
                    example=f.get("example", ""),
                ))
            return result
        except Exception as e:
            logger.warning("Formula extraction failed for page %d: %s", page_no, e)
            return []


async def _extract_page_visuals(
    ai,
    page_no: int,
    page_text: str,
    image_base64: str,
    semaphore: asyncio.Semaphore,
) -> list[VisualModule]:
    """Extract visuals from a single page via vision LLM."""
    async with semaphore:
        try:
            raw_visuals = await ai.analyze_page_image(page_no, page_text, image_base64)
            result = []
            for idx, v in enumerate(raw_visuals):
                vis_type = v.get("type", "")
                if vis_type not in ("line_graph", "flowchart"):
                    continue
                result.append(VisualModule(
                    visualId=f"v{page_no}-{idx + 1}",
                    pageNo=page_no,
                    type=vis_type,
                    title=v.get("title", ""),
                    description=v.get("description", ""),
                    data=v.get("data", {}),
                ))
            return result
        except Exception as e:
            logger.warning("Visual extraction failed for page %d: %s", page_no, e)
            return []


async def extract_all_modules(
    pdf_bytes: bytes,
    page_texts: dict[int, str],
) -> tuple[list[FormulaModule], list[VisualModule], dict[int, list[ModuleRef]]]:
    """Extract formula and visual modules from all pages of a PDF.

    Returns (formulas, visuals, page_module_refs).
    """
    from services.ai_provider import get_ai_provider

    ai = get_ai_provider()
    if ai is None:
        logger.info("AI provider not available, skipping module extraction")
        return [], [], {}

    # Pre-compute all synchronous data before any async work
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_data: list[dict] = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_no = page_idx + 1
        text = page_texts.get(page_no, "")

        check_formulas = _has_formula_indicators(text)
        check_visuals = _has_visual_indicators(page)
        image_b64 = _render_page_to_base64(page) if check_visuals else None

        page_data.append({
            "page_no": page_no,
            "text": text,
            "check_formulas": check_formulas,
            "check_visuals": check_visuals,
            "image_b64": image_b64,
        })

    doc.close()

    # Dispatch async LLM calls
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
    tasks = []

    for pd in page_data:
        if pd["check_formulas"]:
            tasks.append(("formula", pd["page_no"],
                          _extract_page_formulas(ai, pd["page_no"], pd["text"], semaphore)))
        if pd["check_visuals"] and pd["image_b64"]:
            tasks.append(("visual", pd["page_no"],
                          _extract_page_visuals(ai, pd["page_no"], pd["text"], pd["image_b64"], semaphore)))

    if not tasks:
        return [], [], {}

    results = await asyncio.gather(
        *(t[2] for t in tasks),
        return_exceptions=True,
    )

    all_formulas: list[FormulaModule] = []
    all_visuals: list[VisualModule] = []
    page_module_refs: dict[int, list[ModuleRef]] = {}

    for (task_type, page_no, _), result in zip(tasks, results):
        if isinstance(result, Exception):
            logger.warning("Module extraction task failed for page %d: %s", page_no, result)
            continue

        if task_type == "formula":
            for f in result:
                all_formulas.append(f)
                page_module_refs.setdefault(page_no, []).append(
                    ModuleRef(type="formula", id=f.formulaId)
                )
        else:
            for v in result:
                all_visuals.append(v)
                page_module_refs.setdefault(page_no, []).append(
                    ModuleRef(type="visual", id=v.visualId)
                )

    logger.info(
        "Extracted %d formulas and %d visuals from PDF",
        len(all_formulas), len(all_visuals),
    )
    return all_formulas, all_visuals, page_module_refs
