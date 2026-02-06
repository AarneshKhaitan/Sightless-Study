from fastapi import APIRouter, HTTPException, UploadFile

from models import DocumentManifest
from services.demo_store import get_chunks, get_manifest

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/upload")
async def upload_document(file: UploadFile):
    # Stubbed for Phase 7 — PDF parsing not implemented yet
    raise HTTPException(status_code=501, detail="PDF upload not implemented yet. Use demo mode.")


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
