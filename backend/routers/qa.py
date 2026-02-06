from fastapi import APIRouter, HTTPException

from models import QARequest, QAResponse
from services.demo_store import get_chunks
from services.qa_engine import answer_question

router = APIRouter(prefix="/api", tags=["qa"])


@router.post("/qa", response_model=QAResponse)
async def qa(request: QARequest) -> QAResponse:
    chunks = get_chunks(request.docId)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found")

    return answer_question(
        question=request.question,
        chunks=chunks,
        page_no=request.pageNo,
    )
