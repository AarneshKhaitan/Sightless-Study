"""DocumentSource protocol: abstracts where documents come from.

MVP: DemoSource (JSON files) + UploadSource (PDF upload with AI module extraction).
Future: GoogleDriveSource, OneDriveSource.
"""

from typing import Protocol, runtime_checkable

from models import DocumentManifest, Chunk, FormulaModule, VisualModule


class IngestedDocument:
    """Result of ingesting a document from any source."""

    def __init__(
        self,
        manifest: DocumentManifest,
        chunks: list[Chunk],
        formulas: list[FormulaModule],
        visuals: list[VisualModule],
    ):
        self.manifest = manifest
        self.chunks = chunks
        self.formulas = formulas
        self.visuals = visuals


@runtime_checkable
class DocumentSource(Protocol):
    async def ingest(self) -> IngestedDocument: ...


class DemoSource:
    """Loads from pre-built JSON demo data (existing demo_store)."""

    def __init__(self, doc_id: str):
        self.doc_id = doc_id

    async def ingest(self) -> IngestedDocument:
        from services.demo_store import get_manifest, get_chunks, get_formulas, get_visuals

        manifest = get_manifest(self.doc_id)
        if not manifest:
            raise ValueError(f"Demo document {self.doc_id} not found")
        chunks = get_chunks(self.doc_id) or []
        formulas = get_formulas(self.doc_id) or []
        visuals = get_visuals(self.doc_id) or []
        return IngestedDocument(manifest, chunks, formulas, visuals)


class UploadSource:
    """Parses an uploaded PDF into manifest + chunks + formula/visual modules.

    Uses AI to detect formulas from text and visuals from page images.
    Falls back to empty modules if AI is unavailable.
    """

    def __init__(self, filename: str, pdf_bytes: bytes):
        self.filename = filename
        self.pdf_bytes = pdf_bytes

    async def ingest(self) -> IngestedDocument:
        from services.pdf_parser import parse_pdf_with_modules
        return await parse_pdf_with_modules(self.filename, self.pdf_bytes)
