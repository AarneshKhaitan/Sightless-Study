# PRD — GuidedNotes

## Problem
Screen readers and PDF readers struggle with:
- structure and progress (“where am I”)
- formulas (symbol meaning and examples)
- visuals (graphs/flowcharts/diagrams) central to STEM learning

## Target users
- Visually impaired students in STEM
- Low-vision students needing controlled pacing

## MVP success criteria (demo)
- User can navigate a PDF via voice without losing position.
- User asks a question and returns to the same reading point.
- User can explore a line graph and locate min/peak with voice guidance.
- User can explore a flowchart and understand node meaning and sequence.
- Narration remains understandable (no audio spam).

## Non-goals (MVP)
- Full diagram understanding from arbitrary images (stretch only)
- OCR for scanned PDFs (stretch only)

## Feature list
### F1 Guided Reading Mode
- Chunk-by-chunk narration with state
- Voice commands: Continue, Repeat, Where am I, Go back, Summarize page, Question: …

### F2 Grounded Q&A
- Retrieves relevant chunks
- Answers must cite chunk IDs
- Returns to the same spot after answering

### F3 Formula Tutor Mode
- Purpose → symbols → example → intuition
- Voice commands: Symbols, Example, Intuition, Repeat, Continue

### F4 Visual Explorer Mode
- Describe the visual first
- User says “Start exploring”
- Pointer movement drives narration
- Voice commands: What is here, Mark this, Guide me to minimum/peak, Next key point, I’m done

### F5 Reflection
- On “I’m done”, the system summarizes what the user explored + takeaway + next suggested move

### F6 Big Buttons (secondary input)
- Next / Repeat / Help / Back
- Always consistent mapping across modes

## Key risks & mitigations
- Audio overload → dwell-based narration + transition-based narration
- Voice errors → Help/List options + confirmations for mode changes
- Visual robustness → pre-authored Visual Modules JSON for demo stability
