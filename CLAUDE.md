# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project summary

GuidedNotes is a voice-first web app for visually impaired / low-vision university students. Users upload a lecture PDF and interact via voice commands, big buttons, and pointer movement. No code exists yet — this is a docs-only specification repo to be built with Claude Code.

## Build commands

No build tooling exists yet. When implementing, the expected stack is a web app (see docs/02_architecture.md). After scaffolding, update this section with:

- Install: `npm install` (or equivalent)
- Dev server: `npm run dev`
- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`

## Claude Code slash commands

- `/build-plan` — Read specs and produce an implementation plan with milestones, file changes, risks
- `/implement-mvp` — Build the full MVP end-to-end, then run acceptance tests
- `/fix-bug` — Reproduce → root-cause → minimal patch → verify against acceptance tests → summarize
- `/demo-check` — Run pre-demo checklist across all modes, return pass/fail list

## Architecture

### Modes (state machine)

The app has a central tutor state machine (`GuideState`) with modes: **READING**, **FORMULA**, **VISUAL**. Q&A is an interruptible overlay that returns to the same reading position.

### Input unification

All inputs (voice commands, big buttons, pointer events) dispatch into a **single action bus**. No duplicated logic per input method. Big buttons map to the same actions as voice intents (Next/Repeat/Help/Back), with context-sensitive behavior per mode (see docs/11_big_buttons_spec.md).

### Data flow

`PDF upload → text extraction + chunking → DocumentManifest + chunks[] + formulaModules[] + visualModules[]`

Visual modules are **pre-authored JSON** (not OCR) for demo stability. MVP visual types: `line_graph` and `flowchart`.

### Key data schemas (docs/05_data_schemas.md)
- **DocumentManifest**: docId, title, pages with module refs, source metadata
- **Chunk**: chunkId (e.g. `p3-c2`), pageNo, order, type, text
- **GuideState**: docId, pageNo, chunkIndex, mode, modeId
- **VisualModule**: visualId, type (line_graph|flowchart), data (type-specific)
- **ExplorationTrace**: events[], marked[], visited[]

### API contract (docs/06_api_contract.md)
Backend is optional for MVP. Endpoints: upload, manifest, chunks, formula/visual modules, Q&A, explore/reflect, artifacts. Q&A and reflections can be template-based initially.

### Visual Explorer specifics (docs/04_pointer_explore.md)
- Pointer sampling at ~8–12 Hz, dwell detection at ~500ms low-speed threshold
- Narration fires only on: entering a new region, dwell, or proximity to key features
- Guidance mode: directional instructions (left/right/up/down) toward target feature

## Golden rules

1. **Voice-first**: every action must work without relying on small UI
2. **Big buttons**: huge targets, fixed position, consistent mapping across modes
3. **No hallucinations**: Q&A must cite chunk IDs; if insufficient context, ask one clarifying question
4. **Demo reliability > generality**: prefer deterministic behavior over smart-but-flaky
5. **Accessibility**: always provide "Help / List options" and "Where am I?"

## Workflow

Follow: **Explore → Plan → Implement → Verify → Summarize**
- Explore: read relevant docs under `/docs`, identify acceptance criteria
- Plan: list steps and files touched
- Implement: small changes, keep scope tight
- Verify: run through docs/09_acceptance_tests.md (manual acceptance tests cover guided reading, Q&A grounding, formula tutor, visual explorer for line_graph and flowchart, and audio spam checks)
- Summarize: what changed + how to test

## Key constraints

- Upload-only PDF source for MVP (future: Google Drive / OneDrive via DocumentSource interface, see docs/12_document_source_spec.md)
- Narration throttling is critical — speak only on transitions or dwell, never continuously
- Voice states: Speaking → Listening → Executing. Never listen while speaking.
- File picker requires a user gesture (browser constraint); after upload, everything is voice-first
- LLM integration is optional; template-based responses are acceptable for MVP (see docs/07_llm_prompts.md for prompt templates when ready)

## Repo layout

- `/docs/` — Full specification (PRD, architecture, voice UX, pointer explore, schemas, API, prompts, UI copy, acceptance tests, build plan, button spec, document source spec)
- `/.claude/commands/` — Reusable Claude Code slash commands
- `/data/` (optional) — Demo manifests and visual modules
