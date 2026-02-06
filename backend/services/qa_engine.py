from __future__ import annotations

from models import Chunk, QACitation, QAResponse


def _tokenize(text: str) -> set[str]:
    """Simple word tokenizer for keyword matching."""
    return set(text.lower().split())


def _score_chunk(chunk: Chunk, question_tokens: set[str]) -> int:
    """Score a chunk by keyword overlap with question."""
    chunk_tokens = _tokenize(chunk.text)
    return len(question_tokens & chunk_tokens)


def retrieve_top_chunks(
    question: str,
    chunks: list[Chunk],
    page_no: int | None = None,
    top_n: int = 5,
) -> list[Chunk]:
    """Retrieve top N chunks by keyword overlap for use as AI context."""
    question_tokens = _tokenize(question)

    # Prefer chunks on the current page first
    if page_no is not None:
        page_chunks = [c for c in chunks if c.pageNo == page_no]
    else:
        page_chunks = []

    candidates = page_chunks if page_chunks else chunks

    scored = [(c, _score_chunk(c, question_tokens)) for c in candidates]
    scored.sort(key=lambda x: x[1], reverse=True)

    # If best page-chunk score is 0, try all chunks
    if scored and scored[0][1] == 0 and page_chunks:
        scored = [(c, _score_chunk(c, question_tokens)) for c in chunks]
        scored.sort(key=lambda x: x[1], reverse=True)

    return [item[0] for item in scored if item[1] > 0][:top_n]


def answer_question(
    question: str,
    chunks: list[Chunk],
    page_no: int | None = None,
) -> QAResponse:
    """
    Simple lexical retrieval QA (deterministic fallback).
    Scores chunks by keyword overlap, picks top matches, composes a grounded answer.
    """
    top = retrieve_top_chunks(question, chunks, page_no, top_n=2)

    if not top:
        return QAResponse(
            answer="I don't have enough context to answer that. Try rephrasing, or say Continue to go back.",
            citations=[],
        )

    cited_texts = []
    citations = []
    for chunk in top:
        cited_texts.append(chunk.text)
        citations.append(QACitation(pageNo=chunk.pageNo, chunkId=chunk.chunkId))

    citation_labels = ", ".join(c.chunkId for c in citations)
    answer_text = " ".join(cited_texts)

    return QAResponse(
        answer=f"Based on {citation_labels}: {answer_text}",
        citations=citations,
    )
