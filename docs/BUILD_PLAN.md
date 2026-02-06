# GuidedNotes — Implementation Build Plan

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend** | **FastAPI** (Python 3.11+) | Async, typed, matches API contract in docs/06. Easy LLM integration later (openai/anthropic SDKs). |
| **Frontend** | **React 18** + **Vite** + **TypeScript** | Fast dev, wide browser support, types catch schema mismatches early |
| **API style** | **REST** | Matches docs/06_api_contract.md exactly. Simple fetch calls. |
| **State** | **React Context + useReducer** | Single action bus maps naturally to a reducer; no extra deps |
| **TTS** | **Web Speech API** (`speechSynthesis`) | Zero deps, works in Chrome/Edge/Safari |
| **ASR** | **Web Speech API** (`SpeechRecognition`) | Zero deps; Chrome is demo target |
| **Styling** | **CSS Modules** (plain CSS) | No runtime overhead, accessible |
| **PDF parsing** | **PyMuPDF** (server-side, Phase 7 only) | Deferred — demo mode uses JSON from `/data/` |
| **Testing** | **pytest** (backend) + **Vitest** (frontend) | Standard for each stack |

---

## Responsibility split

| Concern | Owner |
|---------|-------|
| Document ingestion, chunking, PDF parsing | Backend |
| Chunk storage + retrieval | Backend |
| Q&A retrieval + answer composition | Backend |
| Formula/visual module serving | Backend |
| Exploration reflection generation | Backend |
| Voice I/O (TTS + ASR) | Frontend (browser APIs) |
| Intent parsing (transcript → action) | Frontend |
| Tutor state machine (GuideState) | Frontend |
| Pointer sampling, dwell detection, narration throttle | Frontend |
| Canvas rendering (line_graph, flowchart) | Frontend |
| Big buttons dispatch | Frontend |

---

## Phase 1 — Scaffold + Demo Data API (app boots, demo data loads)

### Backend files

| File | Purpose |
|------|---------|
| `backend/requirements.txt` | fastapi, uvicorn, pydantic |
| `backend/main.py` | FastAPI app, CORS middleware, mount routers |
| `backend/models.py` | Pydantic models: DocumentManifest, Chunk, FormulaModule, VisualModule, GuideState, ExplorationTrace — matching docs/05_data_schemas.md |
| `backend/routers/documents.py` | `POST /api/documents/upload` (stubbed), `GET /api/documents/{docId}/manifest`, `GET /api/documents/{docId}/chunks` |
| `backend/routers/modules.py` | `GET /api/modules/formulas?docId=...&pageNo=...`, `GET /api/modules/visuals?docId=...&pageNo=...` |
| `backend/services/demo_store.py` | Loads `/data/*.json` at startup into memory. Serves as the data layer for Phases 1–6. |

### Frontend files

| File | Purpose |
|------|---------|
| `frontend/package.json` | deps: react, react-dom, typescript, vite |
| `frontend/vite.config.ts` | Vite config, React plugin, proxy `/api` → `localhost:8000` |
| `frontend/tsconfig.json` | Strict TS |
| `frontend/index.html` | Entry point |
| `frontend/src/main.tsx` | ReactDOM.createRoot → `<App>` |
| `frontend/src/App.tsx` | Router: HomePage → TutorPage |
| `frontend/src/types.ts` | TS interfaces matching backend Pydantic models |
| `frontend/src/api/client.ts` | Typed fetch wrappers: `getManifest(docId)`, `getChunks(docId)`, `getFormulas(docId, pageNo)`, `getVisuals(docId, pageNo)` |
| `frontend/src/pages/HomePage.tsx` | Two big buttons: "Upload PDF" (stubbed) + "Load Demo" (calls API with `demo-001`) |
| `frontend/src/pages/TutorPage.tsx` | Shell — fetches manifest+chunks from API, renders mode view |
| `frontend/src/context/TutorContext.tsx` | React Context + useReducer for GuideState + action dispatch |
| `frontend/src/context/tutorReducer.ts` | Reducer with initial actions: `NEXT_CHUNK`, `PREV_CHUNK`, `SET_MODE`, `SET_PAGE` |

### Milestone
- `npm run dev` + `uvicorn backend.main:app` both start.
- "Load Demo" fetches manifest + chunks from backend and renders TutorPage.

---

## Phase 2 — Guided Reading + Voice (Acceptance Test A)

### Frontend files created/modified

| File | Purpose |
|------|---------|
| `frontend/src/services/tts.ts` | `speak(text): Promise<void>` — wraps speechSynthesis, queues utterances, exposes `stop()`, `isSpeaking()` |
| `frontend/src/services/asr.ts` | `startListening(onResult)`, `stopListening()` — wraps SpeechRecognition, auto-restarts after TTS ends |
| `frontend/src/services/intentParser.ts` | `parseIntent(transcript, mode): Action \| null` — keyword matching for global + mode commands (docs/03_voice_ux.md) |
| `frontend/src/hooks/useVoice.ts` | Combines TTS + ASR + intentParser. Manages voice states (SPEAKING / LISTENING / EXECUTING). Mutes ASR while TTS speaks. Dispatches parsed actions to TutorContext. |
| `frontend/src/components/VoiceStatus.tsx` | Large high-contrast indicator: Speaking / Listening / Executing |
| `frontend/src/components/ReadingView.tsx` | Shows current chunk text (large font), speaks it via TTS, prompts with UI copy (docs/08_ui_copy.md) |
| `frontend/src/pages/TutorPage.tsx` | **Modified**: wires useVoice, renders ReadingView when mode=READING |
| `frontend/src/context/tutorReducer.ts` | **Modified**: add `GO_TO_CHUNK` action, page-boundary logic |

### Navigation logic (reducer)
- `NEXT_CHUNK`: increment chunkIndex; if past last chunk on page, advance pageNo, reset chunkIndex to 0. If new page has formula/visual module → auto-switch mode.
- `PREV_CHUNK`: decrement; if below 0, go to previous page last chunk.
- "Where am I?" → TTS: "Page {pageNo}, section {chunkIndex+1} of {total}. {chunk text preview}."

### Voice commands wired
- Continue → `NEXT_CHUNK`
- Go back → `PREV_CHUNK`
- Where am I → speak location (no state change)
- Repeat → re-speak current chunk
- Help → speak help text (docs/08_ui_copy.md)
- Stop → `tts.stop()`

---

## Phase 3 — Grounded Q&A (Acceptance Test B)

### Backend files created/modified

| File | Purpose |
|------|---------|
| `backend/routers/qa.py` | `POST /api/qa` — body: `{docId, pageNo, chunkId, question}`, returns `{answer, citations}` |
| `backend/services/qa_engine.py` | Lexical retrieval: score chunks by keyword overlap with question. Top 1–2 chunks become context. Template answer cites chunkIds. If no match: returns "insufficient context" response. |

### Frontend files created/modified

| File | Purpose |
|------|---------|
| `frontend/src/api/client.ts` | **Modified**: add `askQuestion(docId, pageNo, chunkId, question)` |
| `frontend/src/context/tutorReducer.ts` | **Modified**: add `ENTER_QA`, `EXIT_QA`. ENTER_QA saves `returnPosition`. EXIT_QA restores it. |
| `frontend/src/types.ts` | **Modified**: add `returnPosition?: {pageNo, chunkIndex}` to GuideState |
| `frontend/src/services/intentParser.ts` | **Modified**: detect "question:" prefix → extract freeform text |
| `frontend/src/hooks/useVoice.ts` | **Modified**: on QA intent, call API, speak answer, then prompt "Say Continue to return." |

### Flow
1. "Question: what does this mean?" → intentParser extracts question text.
2. Frontend calls `POST /api/qa` with current docId, pageNo, chunkId, question.
3. Backend returns `{answer, citations: [{pageNo, chunkId}]}`.
4. TTS: "Based on chunk {chunkId}: {answer}. Say Continue to return."
5. "Continue" → `EXIT_QA` restores position.

---

## Phase 4 — Formula Tutor Mode (Acceptance Test C)

### Frontend files created/modified

| File | Purpose |
|------|---------|
| `frontend/src/components/FormulaView.tsx` | Displays expression (large text). On entry: fetches formula module from API, speaks purpose. Handles sub-commands. |
| `frontend/src/api/client.ts` | **Modified**: already has `getFormulas(docId, pageNo)` |
| `frontend/src/context/tutorReducer.ts` | **Modified**: add `FORMULA_SYMBOLS`, `FORMULA_EXAMPLE`, `FORMULA_INTUITION`, `FORMULA_NEXT_STEP`, `FORMULA_PREV_STEP`. Track `formulaStep` in state. |
| `frontend/src/types.ts` | **Modified**: add `formulaStep?: string` to GuideState |
| `frontend/src/services/intentParser.ts` | **Modified**: when mode=FORMULA, map "symbols"/"example"/"intuition" to actions |
| `frontend/src/pages/TutorPage.tsx` | **Modified**: render FormulaView when mode=FORMULA |

### Mode entry
- NEXT_CHUNK lands on a page with formula module → auto-switch mode=FORMULA, modeId=formulaId.
- TTS: "A formula is here. {expression}. {purpose}. Say Symbols, Example, Intuition, Repeat, or Continue."

### Sub-commands
- Symbols → TTS reads each `{sym}: {meaning}`
- Example → TTS reads example field
- Intuition → TTS reads purpose with "In other words, ..." prefix
- Continue → SET_MODE('READING'), advance past formula page
- Repeat → re-speak last segment

---

## Phase 5 — Visual Explorer Mode (Acceptance Tests D, E, F)

### Backend files created/modified

| File | Purpose |
|------|---------|
| `backend/routers/explore.py` | `POST /api/explore/reflect` — body: `{docId, visualId, trace}`, returns `{reflection, takeaway, nextSuggestion}` |
| `backend/services/reflection.py` | Template-based: "You explored {N} features including {list}. Takeaway: {description-derived summary}. Next: {suggestion}." |

### Frontend files created

| File | Purpose |
|------|---------|
| `frontend/src/components/ExploreCanvas.tsx` | Full-area container. Renders visual via sub-renderer. Captures pointer events. |
| `frontend/src/components/LineGraphRenderer.tsx` | Draws line graph from points array on `<canvas>`. Marks features (min/peak/inflection). |
| `frontend/src/components/FlowchartRenderer.tsx` | Draws nodes as labeled circles, edges as arrows. Normalized coords scaled to canvas. |
| `frontend/src/services/pointerSampler.ts` | Throttles pointermove to ~10 Hz. Tracks velocity. Detects dwell (speed < threshold for 500ms). Emits `{x, y, isDwell, velocity}`. |
| `frontend/src/services/narrationEngine.ts` | Router: delegates to line graph or flowchart interpreter based on visual type. |
| `frontend/src/services/narrationEngine.lineGraph.ts` | Interpolates y at pointer x from points array. Computes trend (slope sign). Checks proximity to features. Returns narration string or null. |
| `frontend/src/services/narrationEngine.flowchart.ts` | Finds nearest node within radius. Returns label + desc. Tracks active node ID for transition detection. |
| `frontend/src/services/narrationThrottle.ts` | Gates narration: speak only on (a) new region entered, (b) dwell, (c) proximity to key feature first crossed. Min 1.5s between utterances. Skip if TTS busy. |
| `frontend/src/services/guidanceEngine.ts` | "Guide me to minimum/peak": given pointer + target feature → directional instruction. "Move left." / "You're very close!" / "You found it!" |
| `frontend/src/services/explorationTrace.ts` | Collects events[], marked[], visited[]. On "I'm done" → calls `POST /api/explore/reflect`. |
| `frontend/src/components/VisualView.tsx` | Orchestrator: renders ExploreCanvas, wires pointer → narration → TTS, handles voice commands. |

### Frontend files modified

| File | Purpose |
|------|---------|
| `frontend/src/context/tutorReducer.ts` | Add `ENTER_EXPLORE`, `EXIT_EXPLORE`, `MARK_POINT`, `START_GUIDANCE`, `STOP_GUIDANCE` |
| `frontend/src/services/intentParser.ts` | When mode=VISUAL: "start exploring", "what is here", "mark this", "guide me to ...", "I'm done" |
| `frontend/src/types.ts` | Add ExplorationTrace, guidance target fields |
| `frontend/src/api/client.ts` | Add `postReflection(docId, visualId, trace)` |
| `frontend/src/pages/TutorPage.tsx` | Render VisualView when mode=VISUAL |

### Narration rules (docs/04_pointer_explore.md)
- **line_graph dwell**: "Epoch {x}, Loss {y}, {increasing/decreasing/flat}."
- **line_graph transition**: "Approaching minimum." / "Near inflection point."
- **flowchart enter node**: "{label}: {desc}."
- **flowchart dwell on same node**: "Connected to: {adjacent nodes}."
- **Throttle**: TTS busy → skip. Min 1.5s gap. Dwell re-triggers allowed after silence.

### Guidance flow
1. "Guide me to minimum" → target = features.min[0], mapped to canvas coords.
2. Each pointer sample → compute direction. TTS: "Move right." / "Move right and up."
3. Within threshold → "You found it! Epoch 50, Loss 0.48."
4. Auto-stop guidance.

### Trace + reflection
- "Mark this" → append to trace.marked[], TTS: "Marked. Epoch {x}, Loss {y}."
- Region entries + dwells logged to trace.events[].
- "I'm done" → POST trace to backend → TTS speaks reflection.

---

## Phase 6 — Big Buttons (all tests pass with buttons)

### Frontend files created/modified

| File | Purpose |
|------|---------|
| `frontend/src/components/BigButtons.tsx` | Fixed bottom bar. Four buttons: NEXT / REPEAT / HELP / BACK. Reads mode from context, dispatches to same reducer. Min 80px height, high-contrast, bold text. |
| `frontend/src/components/BigButtons.module.css` | `position: fixed; bottom: 0; display: flex`, large touch targets |
| `frontend/src/pages/TutorPage.tsx` | **Modified**: render `<BigButtons>` in all modes |

### Button → action mapping (docs/11_big_buttons_spec.md)

| Button | READING | FORMULA | VISUAL |
|--------|---------|---------|--------|
| NEXT | NEXT_CHUNK | FORMULA_NEXT_STEP | NEXT_KEY_FEATURE |
| REPEAT | REPEAT | REPEAT | REPEAT |
| HELP | HELP | HELP | WHAT_IS_HERE |
| BACK | PREV_CHUNK | FORMULA_PREV_STEP / exit | UNDO_MARK / confirm exit |

Each press triggers short TTS confirmation: "Next." / "Repeating." etc.

---

## Phase 7 — PDF Upload + Polish (deferred until Tests A–F pass)

### Backend files created/modified

| File | Purpose |
|------|---------|
| `backend/services/pdf_parser.py` | PyMuPDF: extract text page-by-page, chunk by headings/paragraph breaks → manifest + chunks |
| `backend/services/document_source.py` | `DocumentSource` protocol. `DemoSource` (existing store) + `UploadSource` (pdf_parser). Future: `GoogleDriveSource`. |
| `backend/routers/documents.py` | **Modified**: wire `POST /api/documents/upload` to pdf_parser |
| `backend/requirements.txt` | **Modified**: add PyMuPDF |

### Frontend files modified

| File | Purpose |
|------|---------|
| `frontend/src/pages/HomePage.tsx` | Wire Upload button to file picker → `POST /api/documents/upload` → navigate to TutorPage |
| `frontend/src/components/VoiceStatus.tsx` | Add earcon sounds on state transitions |

---

## File tree (final state)

```
guidednotes/
├── data/
│   ├── demo_manifest.json
│   ├── demo_chunks.json
│   ├── demo_formula_modules.json
│   └── demo_visual_modules.json
├── docs/
├── backend/
│   ├── requirements.txt
│   ├── main.py
│   ├── models.py
│   ├── routers/
│   │   ├── documents.py
│   │   ├── modules.py
│   │   ├── qa.py
│   │   └── explore.py
│   └── services/
│       ├── demo_store.py
│       ├── qa_engine.py
│       ├── reflection.py
│       ├── pdf_parser.py          # Phase 7
│       └── document_source.py     # Phase 7
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── types.ts
│       ├── api/
│       │   └── client.ts
│       ├── context/
│       │   ├── TutorContext.tsx
│       │   └── tutorReducer.ts
│       ├── services/
│       │   ├── tts.ts
│       │   ├── asr.ts
│       │   ├── intentParser.ts
│       │   ├── pointerSampler.ts
│       │   ├── narrationEngine.ts
│       │   ├── narrationEngine.lineGraph.ts
│       │   ├── narrationEngine.flowchart.ts
│       │   ├── narrationThrottle.ts
│       │   ├── guidanceEngine.ts
│       │   └── explorationTrace.ts
│       ├── hooks/
│       │   └── useVoice.ts
│       ├── components/
│       │   ├── VoiceStatus.tsx
│       │   ├── ReadingView.tsx
│       │   ├── FormulaView.tsx
│       │   ├── VisualView.tsx
│       │   ├── ExploreCanvas.tsx
│       │   ├── LineGraphRenderer.tsx
│       │   ├── FlowchartRenderer.tsx
│       │   ├── BigButtons.tsx
│       │   └── BigButtons.module.css
│       └── pages/
│           ├── HomePage.tsx
│           └── TutorPage.tsx
├── public/
│   └── earcons/                   # Phase 7
├── CLAUDE.md
└── README.md
```

---

## Acceptance test → phase mapping

| Test | Passes after |
|------|-------------|
| **A** Guided reading state | Phase 2 |
| **B** Q&A grounding | Phase 3 |
| **C** Formula tutor | Phase 4 |
| **D** Visual Explorer: line graph | Phase 5 |
| **E** Visual Explorer: flowchart | Phase 5 |
| **F** Audio spam check | Phase 5 |
| All tests via big buttons | Phase 6 |
| Real PDF upload | Phase 7 |

---

## Risks + mitigations

| Risk | Mitigation |
|------|------------|
| SpeechRecognition unavailable (Firefox, mobile) | Detect on load, warn user. Big buttons remain functional. Chrome is demo target. |
| TTS voice quality varies by OS | Prefer natural en-US voice via `getVoices()`. |
| ASR picks up TTS output (feedback loop) | Hard rule in useVoice: stop ASR before TTS, resume only on `utterance.onend`. |
| Pointer dwell false positives | 500ms threshold + 1.5s narration cooldown + skip-if-TTS-busy. |
| Canvas blurry on HiDPI | Scale canvas by `devicePixelRatio`. Flowchart uses normalized 0–1 coords. |
| Demo data shape mismatch | Pydantic models (backend) + TS interfaces (frontend) match `/data/*.json`. Backend validates on load. |
| Audio spam during fast pointer movement | narrationThrottle: min 1.5s between utterances, only on region transitions or dwell. |
| Direction confusion if canvas resized | Compute directions in viewport-relative coords, re-measure on resize. |
| Backend/frontend port conflict | Vite proxy config: `/api` → `localhost:8000`. Single `npm run dev` + `uvicorn` workflow. |

---

## Dev workflow

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev          # Vite on :5173, proxies /api → :8000
```

Phases 1–6 use demo JSON only. PDF upload is stubbed until Phase 7.
