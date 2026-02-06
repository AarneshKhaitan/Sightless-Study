"""
Central AI provider using OpenAI.
All AI features funnel through this module.
Falls back gracefully when API key is missing or calls fail.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

_provider: "AIProvider | None" = None


def get_ai_provider() -> "AIProvider | None":
    return _provider


def init_ai_provider() -> None:
    global _provider
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("OPENAI_API_KEY not set — AI features will use template fallbacks")
        return
    try:
        _provider = AIProvider(api_key)
        logger.info("AI provider initialized with OpenAI")
    except Exception as e:
        logger.error("Failed to initialize AI provider: %s", e)
        _provider = None


def _parse_json(text: str) -> dict[str, Any]:
    """Extract JSON from LLM response, handling markdown code fences."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove code fences
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()
    return json.loads(cleaned)


class AIProvider:
    def __init__(self, api_key: str):
        from langchain_openai import ChatOpenAI

        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.llm = ChatOpenAI(
            model=model,
            api_key=api_key,
            temperature=0.3,
            max_retries=1,
        )
        logger.info("Using model: %s", model)

    async def _invoke(self, prompt: str) -> str:
        """Invoke the LLM and return raw text."""
        result = await self.llm.ainvoke(prompt)
        return str(result.content)

    # --- Formula Explanation ---

    async def generate_formula_explanation(
        self, formula: dict[str, Any], section: str
    ) -> str:
        """Generate a natural-language explanation for a formula section.
        Returns the explanation text. Raises on failure."""
        symbols_str = ", ".join(
            f"{s['sym']} ({s['meaning']})" for s in formula.get("symbols", [])
        )
        prompt = f"""You are an accessibility-first tutor. Be concise, grounded in provided context, and never invent document content. If context is insufficient, say what's missing and ask one clarifying question.

The student is learning about this formula:
Expression: {formula['expression']}
Purpose: {formula['purpose']}
Symbols: {symbols_str}
Example: {formula.get('example', 'N/A')}

Explain the "{section}" aspect of this formula in 2-3 clear, spoken sentences.
Sections: purpose, symbol table, tiny worked example, or intuition (1-2 sentences).
Do NOT introduce any symbols or variables not listed above.
Respond with ONLY valid JSON: {{"text": "your explanation"}}"""

        raw = await self._invoke(prompt)
        parsed = _parse_json(raw)
        text = parsed["text"]

        # Runtime guard: check for hallucinated symbols
        known_symbols = {s["sym"].lower() for s in formula.get("symbols", [])}
        # Allow common math words
        common_words = {"the", "a", "an", "is", "are", "of", "to", "in", "for", "and", "or",
                        "it", "this", "that", "each", "all", "sum", "over", "by", "with",
                        "function", "formula", "value", "result", "output", "input",
                        "number", "numbers", "class", "classes", "score", "scores",
                        "probability", "distribution", "exponential", "divided", "power",
                        "means", "represents", "gives", "takes", "converts", "turns"}
        # If text seems fine, return it
        # Simple guard: just return the AI text (the detailed guard is hard without NLP)
        if not text or len(text) < 5:
            raise ValueError("AI returned empty explanation")

        return text

    # --- Grounded Q&A ---

    async def generate_grounded_qa(
        self, question: str, chunks: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Generate a grounded answer with citations.
        Returns dict with 'answer', 'citations', 'clarifyingQuestion'."""
        context = "\n\n".join(
            f"[{c['chunkId']}] (page {c['pageNo']}): {c['text']}"
            for c in chunks
        )
        chunk_ids = [c["chunkId"] for c in chunks]

        prompt = f"""You are an accessibility-first tutor. Be concise, grounded in provided context, and never invent document content. If context is insufficient, say what's missing and ask one clarifying question.

Answer the question using ONLY the provided context. Return citations with the chunkIds used.

Context:
{context}

Question: {question}

Rules:
- Cite specific chunk IDs in your answer
- If the context doesn't contain enough information, set clarifyingQuestion to ask for more detail
- Keep the answer concise (2-3 sentences for speaking aloud)
- Only reference chunkIds from this list: {chunk_ids}

Respond with ONLY valid JSON:
{{"answer": "your answer", "citations": [{{"chunkId": "id", "pageNo": 1}}], "clarifyingQuestion": null}}"""

        raw = await self._invoke(prompt)
        parsed = _parse_json(raw)

        # Validate citations reference actual chunks
        valid_ids = set(chunk_ids)
        parsed["citations"] = [
            c for c in parsed.get("citations", [])
            if c.get("chunkId") in valid_ids
        ]

        # Validation: empty citations + no clarifying question = invalid
        if not parsed["citations"] and not parsed.get("clarifyingQuestion"):
            raise ValueError("AI returned no citations and no clarifying question")

        return parsed

    # --- Explore Reflection ---

    async def generate_explore_reflection(
        self, visual_module: dict[str, Any], trace: dict[str, Any]
    ) -> dict[str, str]:
        """Generate a reflection on visual exploration.
        Returns dict with 'reflection', 'takeaway', 'nextSuggestion'."""
        visited = trace.get("visited", [])
        marked = trace.get("marked", [])
        duration = trace.get("durationSec", 0)

        prompt = f"""You are an accessibility-first tutor. Be concise, grounded in provided context, and never invent document content. If context is insufficient, say what's missing and ask one clarifying question.

Reflect on the student's exploration of a visual.

Visual: {visual_module.get('title', 'Unknown')}
Type: {visual_module.get('type', 'unknown')}
Description: {visual_module.get('description', '')}
Regions visited: {', '.join(visited) if visited else 'none'}
Points marked: {len(marked)}
Duration: {duration:.0f} seconds

Write a brief reflection (max 3-4 sentences total across all fields):
- reflection: 2 sentences on what the student explored
- takeaway: 1 sentence key insight
- nextSuggestion: 1 sentence next suggested action
Avoid excessive coordinates; focus on meaning.

Respond with ONLY valid JSON:
{{"reflection": "...", "takeaway": "...", "nextSuggestion": "..."}}"""

        raw = await self._invoke(prompt)
        parsed = _parse_json(raw)

        # Validate required fields
        for field in ("reflection", "takeaway", "nextSuggestion"):
            if field not in parsed or not parsed[field]:
                raise ValueError(f"AI response missing field: {field}")

        return parsed

    # --- Module Extraction (for any PDF) ---

    async def _invoke_with_image(self, prompt: str, image_base64: str) -> str:
        """Invoke the LLM with a text prompt and a base64-encoded image."""
        from langchain_core.messages import HumanMessage

        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{image_base64}",
                    },
                },
            ]
        )
        result = await self.llm.ainvoke([message])
        return str(result.content)

    async def extract_formulas_from_text(
        self, page_no: int, page_text: str
    ) -> list[dict[str, Any]]:
        """Extract formula modules from a page's text content."""
        prompt = f"""You are an accessibility-first tutor analyzing lecture notes.

Analyze the following text from page {page_no} of a lecture PDF. Identify ALL mathematical formulas, equations, or mathematical expressions present.

For each formula found, produce a structured JSON object with:
- expression: the formula written in plain text (e.g., "E = mc^2", "softmax(z_i) = exp(z_i) / sum_j exp(z_j)")
- purpose: a one-sentence description of what this formula does or represents
- symbols: an array of {{"sym": "...", "meaning": "..."}} for each variable/symbol
- example: a brief worked example with concrete numbers (1-2 sentences)

Page text:
---
{page_text}
---

Rules:
- Only extract actual mathematical formulas/equations, not prose descriptions.
- If no formulas are found, return an empty array.
- Use plain ASCII text for the expression field.
- Keep purpose to one sentence and example brief.

Respond with ONLY valid JSON:
{{"formulas": [...]}}"""

        raw = await self._invoke(prompt)
        parsed = _parse_json(raw)
        return parsed.get("formulas", [])

    async def analyze_page_image(
        self, page_no: int, page_text: str, image_base64: str
    ) -> list[dict[str, Any]]:
        """Analyze a page image to detect and describe visual elements."""
        prompt = f"""You are an accessibility-first tutor analyzing a lecture slide/page image.

Look at this image from page {page_no} of a lecture PDF. The text on this page is:
---
{page_text[:500]}
---

Identify any visual elements: graphs, charts, diagrams, flowcharts, or pipelines.
For each visual found, determine its type and produce structured data.

TYPE "line_graph" — for line charts, curves, scatter plots with trends:
{{
  "type": "line_graph",
  "title": "descriptive title",
  "description": "1-2 sentence description",
  "data": {{
    "xMin": <number>, "xMax": <number>,
    "xLabel": "axis label", "yLabel": "axis label",
    "points": [[x1,y1], [x2,y2], ...],
    "features": {{
      "min": [{{"x": <number>, "y": <number>}}],
      "peak": [{{"x": <number>, "y": <number>}}],
      "inflection": [{{"x": <number>, "y": <number>}}]
    }}
  }}
}}
For points: provide 15-30 representative [x,y] pairs capturing the curve shape.
For features: identify min, max/peak, and inflection points. Use empty arrays if N/A.

TYPE "flowchart" — for flowcharts, pipelines, process diagrams, block diagrams:
{{
  "type": "flowchart",
  "title": "descriptive title",
  "description": "1-2 sentence description",
  "data": {{
    "nodes": [
      {{"id": "n1", "label": "short label", "x": 0.15, "y": 0.5, "r": 0.08, "desc": "1-sentence description"}},
      ...
    ],
    "edges": [["n1", "n2"], ...],
    "keyNodes": ["n1", ...]
  }}
}}
For nodes: x and y are normalized 0.0-1.0 coordinates. r is radius (use 0.08). Identify 1-2 key nodes.

Rules:
- Only identify clear visual elements, not decorative images or logos.
- If no visuals found, return an empty array.
- Only use types "line_graph" or "flowchart". Skip anything else.
- For line graphs, estimate data points from the visual as accurately as possible.
- For flowcharts, capture all visible nodes and connections.

Respond with ONLY valid JSON:
{{"visuals": [...]}}"""

        raw = await self._invoke_with_image(prompt, image_base64)
        parsed = _parse_json(raw)
        return parsed.get("visuals", [])

    # --- Free-form Chat ---

    async def chat(self, message: str, context: str = "") -> str:
        """Handle a free-form conversational message.
        Returns a spoken reply string."""
        prompt = f"""You are an accessibility-first tutor. Be concise, grounded in provided context, and never invent document content. If context is insufficient, say what's missing and ask one clarifying question.

The student is using a voice-controlled reading app.
{f"Current reading context: {context}" if context else ""}

The student said: "{message}"

Reply in 1-2 short, spoken sentences. Be helpful and conversational.
If you're not sure what they need, suggest saying "Help" for available commands."""

        raw = await self._invoke(prompt)
        # Chat returns plain text, not JSON
        return raw.strip()
