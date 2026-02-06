# MVP Build Plan (for Claude Code)

Phase 1 — Shell + upload
- Home: Upload PDF + Load Demo
- Processing state
- Document manifest created

Phase 2 — Chunking + guided reading
- Extract text → chunk by headings/paragraphs
- Implement GuideState and reading progression
- Implement voice command parsing for core navigation

Phase 3 — Grounded Q&A
- Retrieval over chunks (simple lexical retrieval ok for MVP)
- Enforce citations and “return to spot”

Phase 4 — Formula tutor mode
- Load formula modules
- Voice menu: Symbols/Example/Intuition/Continue

Phase 5 — Visual Explorer mode
- Explore Canvas
- Pointer sampling + dwell + transitions
- Implement line_graph and flowchart modules
- Trace collection + reflection generation (template ok)

Phase 6 — Big buttons layer
- Fixed position: Next/Repeat/Help/Back
- Dispatch same actions as voice intents

Phase 7 — Polish + demo script
- Voice state indicator (Speaking/Listening/Executing)
- Time/step counters (optional)
- Run acceptance tests
