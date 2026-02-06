# Sightless Study

A voice-first web application for visually impaired and low-vision university students. Upload a lecture PDF and get guided reading, grounded Q&A, formula tutoring, and interactive visual exploration — all controlled by voice. Content is delivered in small, structured chunks to help manage cognitive overload, ensuring students can absorb material at their own pace without being overwhelmed.

## Features

### Guided Reading

Navigate lecture content chunk-by-chunk using voice commands: "Continue", "Go back", "Where am I?", "Repeat", "Summarize", and more. The system narrates your position and remaining content as you progress.

### Grounded Q&A

Ask questions about what you're reading. Answers are grounded in the document text with citations — no hallucinations. Supports follow-up questions with conversation memory. After answering, you return to the exact reading position.

### Formula Tutor

Formulas are automatically detected from uploaded PDFs using AI. When a page contains a formula, explore it step-by-step:

- **Purpose** — what the formula does
- **Symbols** — each variable explained
- **Example** — a worked-through example
- **Intuition** — plain-language explanation

### Visual Explorer

Graphs, charts, and flowcharts are automatically detected from uploaded PDFs using AI vision and become an interactive canvas. Move your pointer to explore and the system narrates what's under your cursor:

- **Line graphs**: interpolated values, trends, proximity to min/max
- **Flowcharts**: node descriptions, connections, navigation

Voice commands: "What is here?", "Describe", "Mark this", "Guide me to the minimum", "Next key point", "I'm done".

### Big Buttons

Four large, fixed-position buttons provide secondary input for low-vision users. Context-aware — their function adapts to the current mode (Reading, Formula, Visual).

## Architecture

```text
Frontend (React + TypeScript + Vite)
    ↕  /api proxy
Backend (FastAPI + Python)
    ├── Deepgram (speech-to-text)
    ├── OpenAI / LangGraph (orchestrator + Q&A)
    └── PyMuPDF (PDF parsing)
```

**Voice flow:**

```text
Tap screen → TTS cancels → MediaRecorder starts
Stop talking → Audio blob → POST /api/voice
    → Deepgram transcription → LangGraph orchestrator → Response
    → Frontend dispatches action + speaks response → Wait for next tap
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- API keys for Deepgram and OpenAI

### Backend Setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Copy the example env file and fill in your keys:

```bash
cp .env.example .env
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

### Demo Mode

Upload the included `demo.pdf` through the app to try it with a sample 4-page lecture covering:

1. Reading mode (Gradient Descent overview)
2. Formula tutor (Softmax function)
3. Visual explorer — line graph (Training Loss Curve)
4. Visual explorer — flowchart (Model Pipeline)

## Project Structure

```text
├── frontend/
│   ├── src/
│   │   ├── pages/           # HomePage, TutorPage
│   │   ├── components/      # ReadingView, FormulaView, VisualView, BigButtons
│   │   ├── context/         # TutorContext (state management)
│   │   ├── hooks/           # useVoice (tap-to-talk)
│   │   ├── services/        # TTS, recorder, narration, pointer sampling
│   │   ├── api/             # Backend API client
│   │   └── types.ts         # TypeScript interfaces
│   └── vite.config.ts
│
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Pydantic schemas
│   ├── routers/
│   │   ├── documents.py     # PDF upload, manifest, chunks
│   │   ├── modules.py       # Formulas & visuals
│   │   ├── qa.py            # Q&A endpoint
│   │   ├── explore.py       # Reflection endpoint
│   │   └── voice.py         # Voice processing
│   └── services/
│       ├── orchestrator.py  # LangGraph agent (routes voice commands)
│       ├── ai_provider.py   # OpenAI LLM integration
│       ├── transcriber.py   # Deepgram ASR
│       ├── pdf_parser.py    # PDF text extraction
│       ├── module_extractor.py # AI-powered formula & visual detection
│       ├── qa_engine.py     # Grounded Q&A
│       └── reflection.py    # Visual exploration reflection
│
├── data/                    # Processed document storage
└── demo.pdf                 # Sample lecture PDF for testing
```

## API Endpoints

| Endpoint                          | Method | Description                          |
| --------------------------------- | ------ | ------------------------------------ |
| `/api/documents/upload`           | POST   | Upload a PDF                         |
| `/api/documents/{docId}/manifest` | GET    | Get document manifest                |
| `/api/documents/{docId}/chunks`   | GET    | Get document chunks                  |
| `/api/modules/formulas`           | GET    | Get formula modules                  |
| `/api/modules/visuals`            | GET    | Get visual modules                   |
| `/api/qa`                         | POST   | Ask a question about the document    |
| `/api/explore/reflect`            | POST   | Get reflection on visual exploration |
| `/api/voice`                      | POST   | Process voice input (audio + state)  |

## Voice Commands

### Reading Mode

| Command             | Action                       |
| ------------------- | ---------------------------- |
| "Continue" / "Next" | Advance to next chunk        |
| "Go back"           | Previous chunk               |
| "Where am I?"       | Current position + remaining |
| "Repeat"            | Re-read current chunk        |
| "Summarize"         | Summarize current page       |
| "Help"              | List available commands      |
| "End" / "I'm done"  | Exit lecture                 |

### Formula Mode

| Command      | Action                      |
| ------------ | --------------------------- |
| "Symbols"    | Explain formula variables   |
| "Example"    | Worked example              |
| "Intuition"  | Plain-language explanation  |
| "Continue"   | Return to reading           |

### Visual Explorer Mode

| Command                  | Action                         |
| ------------------------ | ------------------------------ |
| "Start exploring"        | Begin exploration              |
| "What is here?"          | Describe current position      |
| "Describe"               | Overall graph/chart summary    |
| "Mark this"              | Mark current point             |
| "Guide me to [feature]"  | Directional guidance           |
| "Next key point"         | Jump to next feature           |
| "I'm done"               | End exploration + reflection   |

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: FastAPI, Pydantic v2, Python 3.10+
- **LLM**: OpenAI GPT-4o-mini via LangGraph
- **Speech-to-Text**: Deepgram Nova-2
- **Text-to-Speech**: Browser SpeechSynthesis API
- **PDF Parsing**: PyMuPDF (text extraction + page rendering for AI vision)
- **Orchestration**: LangGraph (ReAct agent with tool calling)

## Design Principles

1. **Voice-first** — every action works without relying on small UI
2. **Big buttons** — large targets, fixed position, consistent across modes
3. **No hallucinations** — Q&A cites chunk IDs; asks for clarification if context is insufficient
4. **Demo reliability > generality** — deterministic behavior over "smart but flaky"
5. **Accessibility** — always provide "Help" and "Where am I?"
