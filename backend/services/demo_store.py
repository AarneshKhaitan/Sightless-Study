from __future__ import annotations

import json
from pathlib import Path

from models import (
    ChunksResponse,
    DocumentManifest,
    FormulaModule,
    FormulasResponse,
    VisualModule,
    VisualsResponse,
)

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"

_manifest: DocumentManifest | None = None
_chunks: ChunksResponse | None = None
_formulas: FormulasResponse | None = None
_visuals: VisualsResponse | None = None

# In-memory store for uploaded documents (keyed by docId)
_uploaded: dict[str, dict] = {}


def _load_json(filename: str) -> dict:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def load_demo_data() -> None:
    global _manifest, _chunks, _formulas, _visuals
    _manifest = DocumentManifest(**_load_json("demo_manifest.json"))
    _chunks = ChunksResponse(**_load_json("demo_chunks.json"))
    _formulas = FormulasResponse(**_load_json("demo_formula_modules.json"))
    _visuals = VisualsResponse(**_load_json("demo_visual_modules.json"))


def store_uploaded(doc_id: str, manifest: DocumentManifest, chunks: list, formulas: list[FormulaModule], visuals: list[VisualModule]) -> None:
    _uploaded[doc_id] = {
        "manifest": manifest,
        "chunks": chunks,
        "formulas": formulas,
        "visuals": visuals,
    }


def get_manifest(doc_id: str) -> DocumentManifest | None:
    if _manifest and _manifest.docId == doc_id:
        return _manifest
    if doc_id in _uploaded:
        return _uploaded[doc_id]["manifest"]
    return None


def get_chunks(doc_id: str) -> list:
    if _chunks and _chunks.docId == doc_id:
        return _chunks.chunks
    if doc_id in _uploaded:
        return _uploaded[doc_id]["chunks"]
    return []


def get_formulas(doc_id: str, page_no: int | None = None) -> list[FormulaModule]:
    if _formulas and _formulas.docId == doc_id:
        formulas = _formulas.formulas
    elif doc_id in _uploaded:
        formulas = _uploaded[doc_id]["formulas"]
    else:
        return []
    if page_no is not None:
        return [f for f in formulas if f.pageNo == page_no]
    return formulas


def get_visuals(doc_id: str, page_no: int | None = None) -> list[VisualModule]:
    if _visuals and _visuals.docId == doc_id:
        visuals = _visuals.visuals
    elif doc_id in _uploaded:
        visuals = _uploaded[doc_id]["visuals"]
    else:
        return []
    if page_no is not None:
        return [v for v in visuals if v.pageNo == page_no]
    return visuals
