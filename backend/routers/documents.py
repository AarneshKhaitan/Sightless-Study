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

    try:
        from services.document_source import UploadSource
        source = UploadSource(file.filename, pdf_bytes)
        result = source.ingest()
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
    }


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
