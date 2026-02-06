# Big Buttons Spec

Purpose:
Add 3–4 large on-screen buttons as secondary input for low-vision users.
Voice remains primary.

## Recommended 4 buttons
- NEXT
- REPEAT
- HELP / ASK (context-sensitive)
- BACK / UNDO (context-sensitive)

## Mapping by mode
### Reading
- NEXT: next chunk
- REPEAT: replay last spoken chunk
- HELP: read available commands; optionally start question capture
- BACK: previous chunk

### Formula
- NEXT: next explanation step (purpose → symbols → example → intuition)
- REPEAT: replay last spoken formula explanation
- HELP: list formula commands
- BACK: previous step or exit formula mode (safe, non-destructive)

### Visual Explorer
- NEXT: jump to next key feature (min/peak/key node)
- REPEAT: replay last narration or visual description
- HELP: “What is here?” at pointer
- BACK: undo last mark; if none, confirm exit explore mode

## Requirements
- Very large hit targets (low precision)
- Fixed, consistent location
- Spoken confirmation after each press (“Next.” “Repeating.” etc.)
