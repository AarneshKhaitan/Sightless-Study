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
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from models import VoiceState

logger = logging.getLogger(__name__)

# ─── Shared state passed to tools via module-level var ───
_current_state: VoiceState | None = None
_current_context: dict[str, Any] = {}

# ─── Conversation history for follow-up Q&A (keyed by docId) ───
_conversation_history: dict[str, list[dict[str, str]]] = {}
MAX_HISTORY = 10


def _get_state() -> VoiceState:
    assert _current_state is not None
    return _current_state


def _get_context() -> dict[str, Any]:
    return _current_context


# ─── Tools ───


@tool
def reading_control(command: str) -> str:
    """Control the reading flow. Use this when the student wants to navigate through the document.

    Commands (pass EXACTLY one of these strings):
    - "next": advance to next chunk. Use for: continue, next, keep going, go on, move on, go ahead, carry on.
    - "back": go to previous chunk. Use for: go back, back, previous.
    - "where_am_i": tell current position and remaining. Use for: where am I, what page, current position, how much is left, how many pages.
    - "repeat": repeat current chunk. Use for: repeat, say that again, again, one more time.
    - "help": list available commands. Use for: help, options, what can I say.
    - "stop": stop speaking. Use for: stop, quiet, silence, pause, shut up.
    - "summarize": summarize the current page. Use for: summarize, summary, overview.
    - "end": exit the lecture notes. Use for: end, finish, exit, I'm done reading, close, done.
    """
    st = _get_state()
    ctx = _get_context()
    chunk_text = ctx.get("chunk_text", "")
    total_chunks = ctx.get("total_chunks", 0)
    total_pages = ctx.get("total_pages", 0)
    pages_remaining = ctx.get("pages_remaining", 0)
    chunks_remaining = ctx.get("chunks_remaining", 0)
    is_last_page = ctx.get("is_last_page", False)
    is_last_chunk = ctx.get("is_last_chunk", False)

    if command == "next":
        if is_last_page and is_last_chunk:
            return json.dumps({
                "action": None,
                "speech": "You have reached the end of the document. Say End to exit, or Go back to review.",
            })
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
        pos = f"You are on page {st.pageNo} of {total_pages}, chunk {st.chunkIndex + 1} of {total_chunks}."
        if is_last_page and is_last_chunk:
            pos += " This is the last chunk of the last page."
        elif is_last_page:
            pos += f" This is the last page. {chunks_remaining} chunks remaining."
        else:
            pos += f" {pages_remaining} pages remaining."
        return json.dumps({
            "action": None,
            "speech": pos,
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

    if command == "end":
        return json.dumps({
            "action": "END_LECTURE",
            "speech": "Ending the lecture. Great job!",
        })

    return json.dumps({"action": None, "speech": "I didn't understand that reading command."})


@tool
def ask_question(question: str) -> str:
    """Answer a question about the document content using the provided context chunks.
    Use this when the student asks a question about what they're reading,
    or when they ask a follow-up question about a previous answer."""
    ctx = _get_context()
    chunks = ctx.get("nearby_chunks", [])
    st = _get_state()

    # Get conversation history for context
    history = _conversation_history.get(st.docId, [])

    # Try AI-powered Q&A first
    try:
        from services.ai_provider import get_ai_provider
        ai = get_ai_provider()
        if ai is not None:
            import asyncio
            chunk_dicts = [{"chunkId": c["chunkId"], "pageNo": c["pageNo"], "text": c["text"]} for c in chunks]

            # Build question with conversation history for follow-ups
            full_question = question
            if history:
                history_text = "\n".join(
                    f"Student: {h['q']}\nTutor: {h['a']}" for h in history[-5:]
                )
                full_question = f"Previous conversation:\n{history_text}\n\nNew question: {question}"

            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(ai.generate_grounded_qa(full_question, chunk_dicts))
            answer = result.get("answer", "I couldn't find an answer.")

            # Record in history
            _record_qa(st.docId, question, answer)

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

    _record_qa(st.docId, question, result.answer)

    return json.dumps({
        "action": "ENTER_QA",
        "speech": result.answer,
    })


def _record_qa(doc_id: str, question: str, answer: str) -> None:
    """Store a Q&A pair in conversation history."""
    if doc_id not in _conversation_history:
        _conversation_history[doc_id] = []
    _conversation_history[doc_id].append({"q": question, "a": answer})
    # Trim to max
    if len(_conversation_history[doc_id]) > MAX_HISTORY:
        _conversation_history[doc_id] = _conversation_history[doc_id][-MAX_HISTORY:]


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
            "action": "SET_MODE",
            "payload": {"mode": "READING", "modeId": None},
            "speech": "Returning to reading.",
        })

    step_map = {
        "symbols": "FORMULA_SYMBOLS",
        "example": "FORMULA_EXAMPLE",
        "intuition": "FORMULA_INTUITION",
        "purpose": "FORMULA_NEXT_STEP",
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
    - "describe": give an overall description/summary of the graph or visual
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

    if command == "describe":
        return json.dumps({
            "action": None,
            "special": "DESCRIBE_VISUAL",
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

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    llm = ChatOpenAI(
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

    if mode == "FORMULA":
        mode_block = """The current mode is FORMULA. Use formula_control for:
- "continue"/"next"/"keep going" -> formula_control(command="continue") to EXIT formula mode
- "symbols" -> formula_control(command="symbols")
- "example" -> formula_control(command="example")
- "intuition"/"simple"/"break it down" -> formula_control(command="intuition")
- "go back"/"back" -> reading_control(command="back")"""
    elif mode == "VISUAL":
        mode_block = """The current mode is VISUAL. Use visual_control for:
- "start exploring"/"explore" -> visual_control(command="start_exploring")
- "what is here"/"what's here" -> visual_control(command="what_is_here")
- "describe"/"describe the graph"/"tell me about this graph"/"summarize"/"what is this" -> visual_control(command="describe")
- "mark this"/"mark" -> visual_control(command="mark")
- "guide me to X" -> visual_control(command="guide_to", target="X")
- "I'm done"/"done"/"finished"/"continue"/"stop" -> visual_control(command="done")
- "next key point" -> visual_control(command="next_key_point")
- "go back"/"exit" -> visual_control(command="quick_exit")"""
    else:
        mode_block = """The current mode is READING. Use reading_control for:
- "continue"/"next"/"keep going"/"go on"/"move on"/"carry on" -> reading_control(command="next")
- "go back"/"back"/"previous" -> reading_control(command="back")
- "where am I"/"what page" -> reading_control(command="where_am_i")
- "repeat"/"again"/"say that again" -> reading_control(command="repeat")
- "help"/"options"/"what can I say" -> reading_control(command="help")
- "stop"/"quiet"/"silence" -> reading_control(command="stop")
- "summarize"/"summary" -> reading_control(command="summarize")
- "end"/"finish"/"exit"/"I'm done reading" -> reading_control(command="end")"""

    formula_info = f"\nFormula step: {state.formulaStep}" if state.formulaStep else ""
    text_info = f'\nCurrent text: "{chunk_text[:200]}"' if chunk_text else ""

    return f"""You are an accessibility-first tutor controlling a voice-first reading app for visually impaired students.

Current state: mode={mode}, page {state.pageNo}, chunk {state.chunkIndex + 1}.{formula_info}{text_info}

Given the student's voice command, decide which tool to call.

{mode_block}

Use ask_question when the student asks about the content (e.g. "what does this mean", "explain this", questions starting with what/how/why).
The student can also ask follow-up questions about previous answers — always use ask_question for these too.

If the command is conversational or doesn't match any tool, respond directly in 1-2 spoken sentences.
Keep all responses concise -- they will be spoken aloud.
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
