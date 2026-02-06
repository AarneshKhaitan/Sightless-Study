"""
POST /api/voice — accepts audio + app state, returns orchestrator response.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, File, Form, UploadFile

from models import VoiceResponse, VoiceState
from services.demo_store import get_chunks
from services.orchestrator import process as orchestrator_process
from services.transcriber import transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["voice"])


def _build_context(app_state: VoiceState) -> dict:
    """Build context dict for the orchestrator from app state."""
    chunks = get_chunks(app_state.docId)
    page_chunks = sorted(
        [c for c in chunks if c.pageNo == app_state.pageNo],
        key=lambda c: c.order,
    )

    # Current chunk text
    chunk_text = ""
    if 0 <= app_state.chunkIndex < len(page_chunks):
        chunk_text = page_chunks[app_state.chunkIndex].text

    # Nearby chunks for Q&A context (serialize to dicts)
    nearby = page_chunks if page_chunks else chunks[:5]
    nearby_dicts = [
        {"chunkId": c.chunkId, "pageNo": c.pageNo, "text": c.text, "order": c.order}
        for c in nearby
    ]

    all_pages = sorted(set(c.pageNo for c in chunks))
    total_pages = len(all_pages)
    current_page_idx = all_pages.index(app_state.pageNo) if app_state.pageNo in all_pages else 0
    pages_remaining = total_pages - current_page_idx - 1
    chunks_remaining = len(page_chunks) - app_state.chunkIndex - 1
    is_last_page = pages_remaining == 0
    is_last_chunk = chunks_remaining == 0

    return {
        "chunk_text": chunk_text,
        "total_chunks": len(page_chunks),
        "total_pages": total_pages,
        "pages_remaining": pages_remaining,
        "chunks_remaining": chunks_remaining,
        "is_last_page": is_last_page,
        "is_last_chunk": is_last_chunk,
        "nearby_chunks": nearby_dicts,
    }


@router.post("/voice", response_model=VoiceResponse)
async def voice(
    audio: UploadFile = File(...),
    state: str = Form(...),
) -> VoiceResponse:
    """Process a voice command: transcribe audio, then run orchestrator."""
    # Parse app state from JSON string
    app_state = VoiceState(**json.loads(state))

    # Transcribe audio via Deepgram
    audio_bytes = await audio.read()
    content_type = audio.content_type or "audio/webm"
    transcript = await transcribe_audio(audio_bytes, content_type)

    if not transcript.strip():
        return VoiceResponse(
            transcript="",
            speech="I didn't catch that. Tap and try again.",
        )

    # Build context and run orchestrator
    context = _build_context(app_state)
    result = await orchestrator_process(transcript, app_state, context)

    return VoiceResponse(
        transcript=transcript,
        action=result.get("action"),
        payload=result.get("payload") or result.get("special"),
        speech=result.get("speech"),
    )
