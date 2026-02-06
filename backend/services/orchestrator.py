"""
LangGraph orchestrator agent.
Routes voice commands to the appropriate tool (reading, Q&A, formula, visual).
Falls back to conversational chat when no tool matches.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

from models import VoiceState

logger = logging.getLogger(__name__)

# ─── Shared state passed to tools via module-level var ───
_current_state: VoiceState | None = None
_current_context: dict[str, Any] = {}


def _get_state() -> VoiceState:
    assert _current_state is not None
    return _current_state


def _get_context() -> dict[str, Any]:
    return _current_context


# ─── Tools ───


@tool
def reading_control(command: str) -> str:
    """Control the reading flow. Use this when the student wants to navigate through the document.

    Commands:
    - "next": advance to next chunk
    - "back": go to previous chunk
    - "where_am_i": tell the student their current position
    - "repeat": repeat the current chunk
    - "help": list available commands
    - "stop": stop speaking
    - "summarize": summarize the current page
    """
    st = _get_state()
    ctx = _get_context()
    chunk_text = ctx.get("chunk_text", "")
    total_chunks = ctx.get("total_chunks", 0)
    total_pages = ctx.get("total_pages", 0)

    if command == "next":
        return json.dumps({
            "action": "NEXT_CHUNK",
            "speech": None,  # Frontend reads the new chunk
        })

    if command == "back":
        return json.dumps({
            "action": "PREV_CHUNK",
            "speech": None,  # Frontend reads the new chunk
        })

    if command == "where_am_i":
        return json.dumps({
            "action": None,
            "speech": f"You are on page {st.pageNo}, chunk {st.chunkIndex + 1} of {total_chunks}.",
        })

    if command == "repeat":
        return json.dumps({
            "action": None,
            "speech": chunk_text if chunk_text else "Nothing to repeat.",
        })

    if command == "help":
        if st.mode == "READING":
            speech = "You can say: Continue, Go back, Where am I, Repeat, Summarize, or ask a question."
        elif st.mode == "FORMULA":
            speech = "You can say: Symbols, Example, Intuition, Continue to exit, or Go back."
        elif st.mode == "VISUAL":
            speech = "You can say: Start exploring, What is here, Mark this, Guide me to, Next key point, or I'm done."
        else:
            speech = "You can say: Continue, Go back, Help, or ask a question."
        return json.dumps({"action": None, "speech": speech})

    if command == "stop":
        return json.dumps({"action": None, "speech": None})

    if command == "summarize":
        return json.dumps({
            "action": "SUMMARIZE",
            "speech": None,  # Will be handled by frontend or a separate call
        })

    return json.dumps({"action": None, "speech": "I didn't understand that reading command."})


@tool
def ask_question(question: str) -> str:
    """Answer a question about the document content using the provided context chunks.
    Use this when the student asks a question about what they're reading."""
    ctx = _get_context()
    chunks = ctx.get("nearby_chunks", [])
    st = _get_state()

    # Try AI-powered Q&A first
    try:
        from services.ai_provider import get_ai_provider
        ai = get_ai_provider()
        if ai is not None:
            import asyncio
            chunk_dicts = [{"chunkId": c["chunkId"], "pageNo": c["pageNo"], "text": c["text"]} for c in chunks]
            # We're already in async context but tool functions are sync —
            # use the existing event loop
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(ai.generate_grounded_qa(question, chunk_dicts))
            answer = result.get("answer", "I couldn't find an answer.")
            return json.dumps({
                "action": "ENTER_QA",
                "speech": answer,
            })
    except Exception as e:
        logger.warning("AI Q&A failed, using fallback: %s", e)

    # Fallback: lexical search
    from models import Chunk
    from services.qa_engine import answer_question
    chunk_models = [Chunk(**c) for c in chunks]
    result = answer_question(question, chunk_models, st.pageNo)
    return json.dumps({
        "action": "ENTER_QA",
        "speech": result.answer,
    })


@tool
def formula_control(command: str) -> str:
    """Control the formula tutor mode. Use this when the student is on a formula page.

    Commands:
    - "symbols": explain the formula symbols
    - "example": give a worked example
    - "intuition": explain in simple terms
    - "purpose": explain the formula's purpose
    - "continue": exit formula mode and return to reading
    """
    st = _get_state()

    if command == "continue":
        return json.dumps({
            "action": "EXIT_FORMULA",
            "speech": "Returning to reading.",
        })

    step_map = {
        "symbols": "FORMULA_SYMBOLS",
        "example": "FORMULA_EXAMPLE",
        "intuition": "FORMULA_INTUITION",
        "purpose": "FORMULA_PURPOSE",
    }
    action = step_map.get(command)
    if action:
        return json.dumps({
            "action": action,
            "speech": None,  # Frontend triggers the explain call
        })

    return json.dumps({"action": None, "speech": "You can say: Symbols, Example, Intuition, or Continue."})


@tool
def visual_control(command: str, target: str = "") -> str:
    """Control the visual explorer mode. Use this when the student is exploring a graph, chart, or diagram.

    Commands:
    - "start_exploring": begin visual exploration
    - "what_is_here": describe what's at the current pointer position
    - "mark": mark the current point
    - "guide_to": guide the student to a specific feature (provide target)
    - "next_key_point": move to the next key feature
    - "done": finish exploring and get a reflection
    - "quick_exit": exit without reflection
    """
    if command == "start_exploring":
        return json.dumps({
            "action": "ENTER_EXPLORE",
            "special": "START_EXPLORING",
            "speech": "Exploration started. Move your pointer to explore. Say What is here, Mark this, or I'm done.",
        })

    if command == "what_is_here":
        return json.dumps({
            "action": None,
            "special": "WHAT_IS_HERE",
            "speech": None,
        })

    if command == "mark":
        return json.dumps({
            "action": "MARK_POINT",
            "special": "MARK_THIS",
            "speech": None,
        })

    if command == "guide_to":
        return json.dumps({
            "action": "START_GUIDANCE",
            "special": "GUIDE_TO",
            "payload": target,
            "speech": None,
        })

    if command == "next_key_point":
        return json.dumps({
            "action": None,
            "special": "NEXT_KEY_POINT",
            "speech": None,
        })

    if command == "done":
        return json.dumps({
            "action": None,
            "special": "IM_DONE",
            "speech": None,
        })

    if command == "quick_exit":
        return json.dumps({
            "action": None,
            "special": "QUICK_EXIT_VISUAL",
            "speech": None,
        })

    return json.dumps({"action": None, "speech": "You can say: What is here, Mark this, Guide me to, or I'm done."})


# ─── Agent setup ───

_agent = None


def _get_agent():
    global _agent
    if _agent is not None:
        return _agent

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    llm = ChatGroq(
        model=model,
        api_key=api_key,
        temperature=0.2,
        max_retries=1,
    )

    _agent = create_react_agent(
        llm,
        tools=[reading_control, ask_question, formula_control, visual_control],
    )
    logger.info("Orchestrator agent initialized with model: %s", model)
    return _agent


def _build_system_prompt(state: VoiceState, context: dict[str, Any]) -> str:
    chunk_text = context.get("chunk_text", "")
    mode = state.mode
    return f"""You are an accessibility-first tutor controlling a voice-first reading app for visually impaired students.

Current state: mode={mode}, page {state.pageNo}, chunk {state.chunkIndex + 1}.
{f'Formula step: {state.formulaStep}' if state.formulaStep else ''}
{f'Current text: "{chunk_text[:200]}"' if chunk_text else ''}

Given the student's voice command, decide which tool to call:
- reading_control: for navigation (next, back, where am i, repeat, help, stop, summarize)
- ask_question: when the student asks a question about the content
- formula_control: for formula mode commands (symbols, example, intuition, continue){' — CURRENT MODE' if mode == 'FORMULA' else ''}
- visual_control: for visual exploration commands (start exploring, what is here, mark, guide to, done){' — CURRENT MODE' if mode == 'VISUAL' else ''}

If the command is conversational or doesn't match any tool, respond directly in 1-2 spoken sentences.
Keep all responses concise — they will be spoken aloud.
IMPORTANT: Always respond. Never return empty."""


async def process(transcript: str, state: VoiceState, context: dict[str, Any]) -> dict[str, Any]:
    """Process a voice transcript through the orchestrator.
    Returns dict with action, speech, special, payload."""
    global _current_state, _current_context
    _current_state = state
    _current_context = context

    agent = _get_agent()
    if agent is None:
        # No AI available — return a fallback
        return {
            "action": None,
            "speech": "AI is not available. Please use the buttons.",
            "special": None,
            "payload": None,
        }

    system_prompt = _build_system_prompt(state, context)

    try:
        result = await agent.ainvoke({
            "messages": [
                SystemMessage(content=system_prompt),
                HumanMessage(content=transcript),
            ]
        })

        # Extract the last message from the agent
        messages = result.get("messages", [])
        if not messages:
            return {"action": None, "speech": "I didn't understand that.", "special": None, "payload": None}

        last_msg = messages[-1]

        # If the agent called a tool, parse the tool result
        # Walk backwards to find the last tool message
        for msg in reversed(messages):
            if hasattr(msg, "type") and msg.type == "tool":
                try:
                    tool_result = json.loads(msg.content)
                    return {
                        "action": tool_result.get("action"),
                        "speech": tool_result.get("speech"),
                        "special": tool_result.get("special"),
                        "payload": tool_result.get("payload"),
                    }
                except (json.JSONDecodeError, AttributeError):
                    pass

        # No tool was called — agent responded conversationally
        reply = str(last_msg.content).strip()
        return {
            "action": None,
            "speech": reply if reply else "I didn't understand that. Say Help for options.",
            "special": None,
            "payload": None,
        }

    except Exception as e:
        logger.error("Orchestrator error: %s", e)
        return {
            "action": None,
            "speech": "Sorry, something went wrong. Please try again.",
            "special": None,
            "payload": None,
        }
