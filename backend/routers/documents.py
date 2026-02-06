from fastapi import APIRouter, HTTPException, UploadFile

from models import DocumentManifest
from services.demo_store import get_chunks, get_manifest, store_uploaded

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(file: UploadFile):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    pdf_bytes = await file.read()
    if len(pdf_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")

    # If the uploaded PDF matches the demo content, use the rich demo data
    # (which includes formulas and visual modules that plain parsing can't produce)
    if _is_demo_pdf(pdf_bytes):
        demo_manifest = get_manifest("demo-001")
        if demo_manifest:
            demo_chunks = get_chunks("demo-001")
            return {
                "docId": demo_manifest.docId,
                "title": demo_manifest.title,
                "pageCount": len(demo_manifest.pages),
                "chunkCount": len(demo_chunks),
            }

    try:
        from services.document_source import UploadSource
        source = UploadSource(file.filename, pdf_bytes)
        result = await source.ingest()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF parsing failed: {e}")

    # Store in memory so subsequent GET calls work
    store_uploaded(
        result.manifest.docId,
        result.manifest,
        result.chunks,
        result.formulas,
        result.visuals,
    )

    return {
        "docId": result.manifest.docId,
        "title": result.manifest.title,
        "pageCount": len(result.manifest.pages),
        "chunkCount": len(result.chunks),
        "formulaCount": len(result.formulas),
        "visualCount": len(result.visuals),
    }


def _is_demo_pdf(pdf_bytes: bytes) -> bool:
    """Check if uploaded PDF matches demo content by inspecting page 1 text."""
    try:
        import fitz
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if len(doc) < 4:
            doc.close()
            return False
        page1_text = doc[0].get_text().strip()
        doc.close()
        return "Gradient Descent" in page1_text and "steepest increase" in page1_text
    except Exception:
        return False


@router.get("/{doc_id}/manifest")
async def read_manifest(doc_id: str) -> DocumentManifest:
    manifest = get_manifest(doc_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Document not found")
    return manifest


@router.get("/{doc_id}/chunks")
async def read_chunks(doc_id: str):
    chunks = get_chunks(doc_id)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"docId": doc_id, "chunks": chunks}
