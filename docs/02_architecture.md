# Architecture — GuidedNotes

## High-level
Web app with:
- PDF ingestion (upload)
- Text extraction + chunking
- Tutor state machine (reading/formula/visual)
- Voice input (ASR) and narration (TTS)
- Visual Explorer that maps pointer position to semantic meaning
- Optional backend for persistence, retrieval, and artifact generation

## Components
### Client
- State machine for modes and progress
- Voice layer (listening/speaking control)
- Big buttons layer (dispatches same actions as voice intents)
- Explore Canvas (pointer sampling + narration throttling)
- Local cache for doc + state (optional)

### Server (optional for MVP)
- Document processing pipeline
- Chunk store and retrieval
- Reflection/summary generation endpoints
- Session store for traces

## Data objects
- DocumentManifest
- chunks[]
- formulaModules[]
- visualModules[]
- GuideState
- ExplorationTrace

## Design principle
All inputs (voice, buttons) dispatch into the same internal action bus.
No duplicated logic per input method.
