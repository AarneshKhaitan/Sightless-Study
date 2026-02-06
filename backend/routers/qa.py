import logging

from fastapi import APIRouter, HTTPException

from models import QARequest, QAResponse, QACitation
from services.demo_store import get_chunks
from services.qa_engine import answer_question, retrieve_top_chunks

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["qa"])


@router.post("/qa", response_model=QAResponse)
async def qa(request: QARequest) -> QAResponse:
    chunks = get_chunks(request.docId)
    if not chunks:
        raise HTTPException(status_code=404, detail="Document not found")

    # Try AI-powered Q&A
    try:
        from services.ai_provider import get_ai_provider
        ai = get_ai_provider()
        if ai is not None:
            top = retrieve_top_chunks(request.question, chunks, request.pageNo, top_n=5)
            if top:
                chunk_dicts = [
                    {"chunkId": c.chunkId, "pageNo": c.pageNo, "text": c.text}
                    for c in top
                ]
                result = await ai.generate_grounded_qa(request.question, chunk_dicts)
                return QAResponse(
                    answer=result["answer"],
                    citations=[
                        QACitation(pageNo=c["pageNo"], chunkId=c["chunkId"])
                        for c in result.get("citations", [])
                    ],
                )
    except ImportError:
        pass
    except Exception as e:
        logger.warning("AI Q&A failed, using fallback: %s", e)

    # Fallback to deterministic
    return answer_question(
        question=request.question,
        chunks=chunks,
        page_no=request.pageNo,
    )
