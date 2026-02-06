"""PDF text extraction using PyMuPDF.

Extracts text page-by-page and chunks by paragraph breaks.
Optionally extracts formula and visual modules via AI.
"""

import logging
import uuid

import fitz  # PyMuPDF

from models import DocumentManifest, Chunk, Page, Source

logger = logging.getLogger(__name__)


def parse_pdf(filename: str, pdf_bytes: bytes):
    """Parse a PDF into manifest + chunks."""
    from services.document_source import IngestedDocument

    doc_id = f"upload-{uuid.uuid4().hex[:8]}"
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    pages: list[Page] = []
    chunks: list[Chunk] = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_no = page_idx + 1
        text = page.get_text("text").strip()

        pages.append(Page(pageNo=page_no, modules=[]))

        if not text:
            continue

        # Split into paragraphs by double newline or significant whitespace
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]

        for order, para in enumerate(paragraphs):
            chunk_id = f"p{page_no}-c{order + 1}"
            # Simple heuristic: short lines that are title-case might be headings
            chunk_type = "heading" if len(para) < 80 and para[0].isupper() and "\n" not in para else "paragraph"
            chunks.append(Chunk(
                chunkId=chunk_id,
                pageNo=page_no,
                order=order,
                type=chunk_type,
                text=para,
            ))

    doc.close()

    manifest = DocumentManifest(
        docId=doc_id,
        title=filename.replace(".pdf", "").replace("_", " "),
        pages=pages,
        outline=[],
        source=Source(
            type="upload",
            displayName=filename,
            externalId=None,
            lastSyncedAt=None,
        ),
    )

    return IngestedDocument(
        manifest=manifest,
        chunks=chunks,
        formulas=[],
        visuals=[],
    )


async def parse_pdf_with_modules(filename: str, pdf_bytes: bytes):
    """Parse a PDF and extract formula/visual modules via AI.
    Falls back to empty modules if AI is unavailable or fails."""
    from services.module_extractor import extract_all_modules

    result = parse_pdf(filename, pdf_bytes)

    # Collect page texts for module extraction
    page_texts: dict[int, str] = {}
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_texts[page_idx + 1] = page.get_text("text").strip()
    doc.close()

    try:
        formulas, visuals, page_module_refs = await extract_all_modules(
            pdf_bytes, page_texts
        )
        result.formulas = formulas
        result.visuals = visuals

        # Update manifest pages with module references
        for page in result.manifest.pages:
            refs = page_module_refs.get(page.pageNo, [])
            if refs:
                page.modules = refs

    except Exception as e:
        logger.warning("Module extraction failed, returning basic parse: %s", e)

    return result
