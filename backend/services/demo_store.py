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


def _load_json(filename: str) -> dict:
    with open(DATA_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def load_demo_data() -> None:
    global _manifest, _chunks, _formulas, _visuals
    _manifest = DocumentManifest(**_load_json("demo_manifest.json"))
    _chunks = ChunksResponse(**_load_json("demo_chunks.json"))
    _formulas = FormulasResponse(**_load_json("demo_formula_modules.json"))
    _visuals = VisualsResponse(**_load_json("demo_visual_modules.json"))


def get_manifest(doc_id: str) -> DocumentManifest | None:
    if _manifest and _manifest.docId == doc_id:
        return _manifest
    return None


def get_chunks(doc_id: str) -> list:
    if _chunks and _chunks.docId == doc_id:
        return _chunks.chunks
    return []


def get_formulas(doc_id: str, page_no: int | None = None) -> list[FormulaModule]:
    if not _formulas or _formulas.docId != doc_id:
        return []
    if page_no is not None:
        return [f for f in _formulas.formulas if f.pageNo == page_no]
    return _formulas.formulas


def get_visuals(doc_id: str, page_no: int | None = None) -> list[VisualModule]:
    if not _visuals or _visuals.docId != doc_id:
        return []
    if page_no is not None:
        return [v for v in _visuals.visuals if v.pageNo == page_no]
    return _visuals.visuals
