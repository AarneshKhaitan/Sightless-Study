# Acceptance Tests (manual)

## A) Guided reading state
1. Upload a PDF (demo PDF is fine).
2. Say “Where am I?” → system speaks current page and chunk.
3. Say “Continue” twice → chunk index advances correctly.
4. Say “Go back” → returns to previous chunk.

## B) Q&A grounding
1. At a chunk containing a definitional sentence, say: “Question: what does this mean?”
2. Answer must cite chunk IDs.
3. After answer, say “Continue” → resumes at the same spot.

## C) Formula tutor
1. Navigate to a page with a formula module.
2. Say “Symbols” → explains each symbol.
3. Say “Example” → gives tiny worked example.
4. Say “Continue” → returns to reading flow.

## D) Visual Explorer: line graph
1. Enter visual page, say “Start exploring”.
2. Move pointer; pause (dwell) → narration gives x/y + trend.
3. Say “Guide me to minimum” → directional guidance occurs.
4. Say “Mark this” near the minimum → mark is recorded and confirmed.
5. Say “I’m done” → reflection describes what user explored + takeaway.

## E) Visual Explorer: flowchart
1. Enter flowchart visual, say “Start exploring”.
2. Hover near nodes; narration should change when switching nodes.
3. Say “What is here?” → reads current node details.
4. Say “I’m done” → reflection describes nodes visited.

## F) Audio spam check
1. During exploration, move pointer continuously for 5 seconds.
2. System should not speak continuously; only on transitions/dwell.
