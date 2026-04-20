# RecipeWingman

> A multimodal, RAG-powered voice cooking assistant that benchmarks STT, LLM, and TTS providers for real-time kitchen use.

**DS-301: Advanced Topics in Data Science — NYU**  
**Team:** Majo Salgado · TB Rasya Danendra · Galal Bichara

---

## Table of Contents

- [Overview](#overview)
- [Research Questions](#research-questions)
- [Architecture](#architecture)
- [Repo Structure](#repo-structure)
- [Setup & Installation](#setup--installation)
- [Running the App](#running-the-app)
- [Benchmarking](#benchmarking)
- [Dataset](#dataset)
- [Tech Stack](#tech-stack)
- [Milestones](#milestones)
- [Roadmap](#roadmap)
- [Team](#team)

---

## Overview

Cooking requires constant recipe reference, yet consulting recipes mid-cook is fundamentally disruptive — dirty hands, smeared screens, lost focus. Existing voice assistants (Alexa, Google Home) are context-blind playback systems. LLM chatbots (ChefGPT) hallucinate quantities because they rely on parametric memory alone.

**RecipeWingman** solves this by combining:
- **Voice input** — hands-free interaction via STT
- **RAG** — responses grounded in real recipe documents, not hallucinated
- **Conversational LLM** — multi-turn context so you can ask follow-ups
- **Voice output** — TTS speaks the answer back to you

Beyond building the system, this project takes a **research approach**: we benchmark pipeline components (STT, LLM, TTS) using a component isolation methodology to identify bottlenecks and find the optimal combination for real-time cooking assistance.

---

## Research Questions

1. Which STT/LLM/TTS provider combination minimizes **end-to-end "Silence-to-Speech" latency** while maintaining semantic accuracy?
2. Which individual component (STT, RAG, LLM, or TTS) acts as the **primary bottleneck** in the pipeline?
3. Does a lower-latency STT provider produce higher **Semantic WER** (meaning-changing errors like "1 tsp" → "1 tbsp"), and how does this cascade into RAG retrieval quality?
4. Does the RAG architecture prevent the hallucinated quantities common in closed-book LLMs, and at what **Faithfulness Score**?
5. How does **chunk size** (100 vs. 500 tokens) affect the LLM's ability to answer cross-step queries?

---

## Architecture

```
Voice/Text Input
      │
      ▼
┌───────────┐    ┌────────────────┐    ┌───────────┐
│    STT    │───▶│  Query Rewrite │───▶│  Embedder │
│  Whisper  │    │   (GPT-4o)     │    │ (OpenAI)  │
└───────────┘    └────────────────┘    └─────┬─────┘
                                             │
                                             ▼
                                    ┌────────────────┐
                                    │  RAG Retrieval  │
                                    │   (ChromaDB)    │
                                    └───────┬────────┘
                                            │
                                            ▼
                                    ┌────────────────┐
                                    │      LLM       │
                                    │    (GPT-4o)     │
                                    └───────┬────────┘
                                            │
                                            ▼
                                    ┌────────────────┐
                                    │      TTS       │
                                    │  (OpenAI TTS-1) │
                                    └───────┬────────┘
                                            │
                                            ▼
                                   Audio/Text Response
```

### Components

| Layer | Description |
|-------|-------------|
| **Frontend** | React web app — text chat and voice toggle with audio playback |
| **Backend** | FastAPI (Python) — orchestrates the full pipeline |
| **STT** | OpenAI Whisper — converts speech to text |
| **Embedder** | OpenAI `text-embedding-3-small` — shared by ingest and query paths |
| **RAG** | ChromaDB vector store — 10,105 recipe chunks, top-k retrieval |
| **LLM** | GPT-4o — multi-turn conversational responses with query rewriting |
| **TTS** | OpenAI TTS-1 — converts response text to spoken audio |

### API Endpoints

| Endpoint | Method | Request | Response |
|----------|--------|---------|----------|
| `/api/chat` | POST | `{ message, session_id? }` | `{ response, session_id }` |
| `/api/voice` | POST | FormData `{ audio, session_id? }` | `{ transcript, response, audio_b64, session_id }` |

---

## Repo Structure

```
recipewingman/
├── README.md
├── .env.example                  # API key template
├── .gitignore
├── .python-version               # 3.11.9
├── requirements.txt              # Python dependencies
├── requirements-lock.txt         # Pinned transitive dependencies
│
├── frontend/                     # React web app
│   ├── public/
│   ├── src/
│   │   ├── api.js                # Backend API client
│   │   ├── App.jsx               # Main app layout
│   │   ├── index.js
│   │   ├── index.css             # Design tokens (warm kitchen palette)
│   │   └── components/
│   │       ├── ChatWindow.jsx    # Conversation display
│   │       └── VoiceButton.jsx   # Record & send voice input
│   └── package.json
│
├── backend/                      # FastAPI server
│   ├── main.py                   # App entry point & API routes
│   ├── config.py                 # OpenAI client, env var loading, startup validation
│   ├── embedder.py               # Shared get_embeddings() — OpenAI text-embedding-3-small
│   │
│   ├── stt/
│   │   └── whisper.py            # OpenAI Whisper transcription
│   │
│   ├── rag/
│   │   ├── vector_store.py       # ChromaDB PersistentClient wrapper
│   │   ├── ingest.py             # Chunking (tiktoken), batch embed + store
│   │   └── retriever.py          # Takes pre-computed embedding, returns top-k chunks
│   │
│   ├── llm/
│   │   └── gpt4o.py              # OpenAI chat wrapper (model configurable via LLM_MODEL)
│   │
│   ├── tts/
│   │   └── openai_tts.py         # OpenAI TTS-1 synthesis
│   │
│   └── agent/
│       └── pipeline.py           # Orchestrator: rewrite → embed → retrieve → LLM
│
├── tests/
│   └── rag/
│       └── test_ingest.py        # 4 pytest tests for chunk_text
│
├── benchmarks/
│   └── results/                  # Timing CSVs from manual benchmark runs
│
├── data/
│   ├── raw/                      # Downloaded datasets (gitignored)
│   ├── processed/
│   │   └── recipes_dev.jsonl     # 10,000-recipe dev subset (committed)
│   ├── test_sets/
│   └── vector_db/                # Persisted ChromaDB — 10,105 chunks (gitignored)
│
├── notebooks/
│   └── EDA.ipynb                 # Food.com exploratory data analysis
│
└── reports/                      # Milestone reports
```

---

## Setup & Installation

### Prerequisites
- Python 3.11.9 (via pyenv)
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/gkbichara/recipeWingman.git
cd recipeWingman
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Fill in your `OPENAI_API_KEY` in `.env`. This is the only key required for the current single-provider pipeline.

### 3. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 4. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Ingest the recipe dataset
```bash
python -m backend.rag.ingest
```
This chunks, embeds, and stores all recipes from `data/processed/recipes_dev.jsonl` into the vector database. The vector DB persists to `data/vector_db/` — you only need to run this once.

---

## Running the App

### Start the backend
```bash
uvicorn backend.main:app --reload --port 8000
```

### Start the frontend (separate terminal)
```bash
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The LLM model is configurable via the `LLM_MODEL` environment variable (defaults to `gpt-4o`).

---

## Benchmarking

Benchmarking is currently done manually using the per-component timing instrumentation built into the pipeline. Every request logs `[TIMING]` data to the server console, broken down by component (rewrite, embedding, retrieval, LLM, and STT/TTS for voice).

Results are stored as CSVs in `benchmarks/results/`.

### Running tests
```bash
pytest tests/
```

---

## Dataset

| Source | Size | Use |
|--------|------|-----|
| [Food.com (Kaggle)](https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions) | ~230,000 recipes | Primary RAG corpus |

We use a 10,000-recipe dev subset (`data/processed/recipes_dev.jsonl`) selected during EDA for token count distribution and coverage. This produces 10,105 chunks in the vector database.

> **Note:** Raw dataset files are gitignored. The processed dev subset is committed.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 |
| Backend | FastAPI (Python 3.11.9) |
| Vector DB | ChromaDB (PersistentClient) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Tokenizer | tiktoken (`cl100k_base`) |
| STT | OpenAI Whisper |
| LLM | OpenAI GPT-4o (configurable via `LLM_MODEL`) |
| TTS | OpenAI TTS-1 |

---

## Milestones

| Milestone | Due | Status |
|-----------|-----|--------|
| M0 — Group Formation | Feb 13 | Done |
| M1 — Project Proposal | Mar 8 | Done |
| M2 — Midway Checkpoint | Apr 5 | Done |
| M3 — Wrap Up | May 3 | Upcoming |
| Final Presentation | TBD | Upcoming |

---

## Roadmap

Planned work for M3:

- **Smart retrieval** — Classify follow-up queries to skip unnecessary re-retrieval when the answer is already in conversation context (e.g. "give me the second recipe", "what are the ingredients")
- **Streaming pipeline** — Stream LLM and TTS responses to reduce perceived latency
- **Cross-provider benchmarking** — Swap in alternative STT (Deepgram, Google), LLM (Gemini, Llama 3 via Groq), and TTS (ElevenLabs) providers using the component isolation methodology
- **Automated benchmark scripts** — Programmatic benchmark runners for reproducible evaluation

---

## Team

| Member | Primary Role | Secondary |
|--------|-------------|-----------|
| **Galal Bichara** | RAG pipeline, backend API, LLM integration | Pipeline architecture, orchestration |
| **TB Rasya Danendra** | Frontend (React), voice UI | Demo preparation |
| **Majo Salgado** | Benchmarking, Q&A test set, evaluation | Dataset curation, EDA |
