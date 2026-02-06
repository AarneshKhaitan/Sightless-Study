"""
Deepgram speech-to-text transcription service.
Uses the pre-recorded (REST) API with nova-2 model.
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


async def transcribe_audio(audio_bytes: bytes, mimetype: str = "audio/webm") -> str:
    """Transcribe audio bytes using Deepgram nova-2.
    Returns the transcript string. Raises on failure."""
    from deepgram import DeepgramClient

    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        raise RuntimeError("DEEPGRAM_API_KEY not set")

    client = DeepgramClient(api_key=api_key)

    response = client.listen.v1.media.transcribe_file(
        request=audio_bytes,
        model="nova-2",
        smart_format=True,
        language="en",
    )

    transcript = (
        response.results.channels[0].alternatives[0].transcript
    )
    logger.info("Deepgram transcript: %s", transcript)
    return transcript or ""
