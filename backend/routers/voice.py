"""
POST /api/voice — accepts audio + app state, returns orchestrator response.
"""

from __future__ import annotations

import json
import logging

from fastapi import APIRouter, File, Form, UploadFile

from models import VoiceResponse, VoiceState
from services.transcriber import transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["voice"])


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

    # TODO: Phase C will wire orchestrator here
    # For now, return transcript with a placeholder response
    return VoiceResponse(
        transcript=transcript,
        speech=f"I heard: {transcript}. The orchestrator is not connected yet.",
    )
