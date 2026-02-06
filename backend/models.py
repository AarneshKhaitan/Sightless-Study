from __future__ import annotations
from pydantic import BaseModel


class ModuleRef(BaseModel):
    type: str  # "formula" | "visual"
    id: str


class Page(BaseModel):
    pageNo: int
    modules: list[ModuleRef]


class OutlineSection(BaseModel):
    id: str
    title: str
    startPage: int
    endPage: int


class Source(BaseModel):
    type: str
    displayName: str
    externalId: str | None = None
    lastSyncedAt: str | None = None


class DocumentManifest(BaseModel):
    docId: str
    title: str
    pages: list[Page]
    outline: list[OutlineSection] = []
    source: Source


class Chunk(BaseModel):
    chunkId: str
    pageNo: int
    order: int
    type: str  # heading | paragraph | bullets | caption
    text: str


class ChunksResponse(BaseModel):
    docId: str
    chunks: list[Chunk]


class Symbol(BaseModel):
    sym: str
    meaning: str


class FormulaModule(BaseModel):
    formulaId: str
    pageNo: int
    expression: str
    purpose: str
    symbols: list[Symbol]
    example: str


class FormulasResponse(BaseModel):
    docId: str
    formulas: list[FormulaModule]


class VisualFeaturePoint(BaseModel):
    x: float
    y: float


class FlowchartNode(BaseModel):
    id: str
    label: str
    x: float
    y: float
    r: float
    desc: str


class VisualModule(BaseModel):
    visualId: str
    pageNo: int
    type: str  # line_graph | flowchart
    title: str
    description: str
    data: dict


class VisualsResponse(BaseModel):
    docId: str
    visuals: list[VisualModule]


class QARequest(BaseModel):
    docId: str
    pageNo: int
    chunkId: str
    question: str


class QACitation(BaseModel):
    pageNo: int
    chunkId: str


class QAResponse(BaseModel):
    answer: str
    citations: list[QACitation]


class ExplorationEvent(BaseModel):
    type: str  # enter_feature | dwell_read | mark | guide_step
    timestamp: float
    data: dict = {}


class ExplorationTrace(BaseModel):
    visualId: str
    startedAt: str
    durationSec: float
    events: list[ExplorationEvent] = []
    marked: list[dict] = []
    visited: list[str] = []


class ReflectRequest(BaseModel):
    docId: str
    visualId: str
    trace: ExplorationTrace


class ReflectResponse(BaseModel):
    reflection: str
    takeaway: str
    nextSuggestion: str


class FormulaExplainRequest(BaseModel):
    docId: str
    formulaId: str
    section: str  # purpose | symbols | example | intuition


class FormulaExplainResponse(BaseModel):
    text: str
