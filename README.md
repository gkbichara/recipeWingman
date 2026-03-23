# 🍳 RecipeWingman

> A multimodal, RAG-powered voice cooking assistant that benchmarks STT, LLM, and TTS providers for real-time kitchen use.

**DS-301: Advanced Topics in Data Science — NYU**  
**Team:** Majo Salgado · TB Rasya Danendra · Galal Bichara

---

## Table of Contents

- [Overview](#overview)
- [Research Questions](#research-questions)
- [Architecture](#architecture)
- [Benchmarking Methodology](#benchmarking-methodology)
- [Repo Structure](#repo-structure)
- [Setup & Installation](#setup--installation)
- [Running the App](#running-the-app)
- [Running the Benchmarks](#running-the-benchmarks)
- [Dataset](#dataset)
- [Tech Stack](#tech-stack)
- [Milestones](#milestones)
- [Team](#team)

---

## Overview

Cooking requires constant recipe reference, yet consulting recipes mid-cook is fundamentally disruptive — dirty hands, smeared screens, lost focus. Existing voice assistants (Alexa, Google Home) are context-blind playback systems. LLM chatbots (ChefGPT) hallucinate quantities because they rely on parametric memory alone.

**RecipeWingman** solves this by combining:
- **Voice input** — hands-free interaction via STT
- **RAG** — responses grounded in real recipe documents, not hallucinated
- **Conversational LLM** — multi-turn context so you can ask follow-ups
- **Voice output** — TTS speaks the answer back to you

Beyond building the system, this project takes a **research approach**: we benchmark each pipeline component (STT, LLM, TTS) across multiple providers using a component isolation methodology to find the optimal combination for real-time cooking assistance.

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
┌─────────────────────────────────────────────────────────┐
│                     RecipeWingman                        │
│                                                          │
│  Voice/Text Input                                        │
│       │                                                  │
│       ▼                                                  │
│  ┌─────────┐    ┌──────────────┐    ┌─────────────────┐ │
│  │   STT   │───▶│ RAG Retrieval│───▶│       LLM       │ │
│  │         │    │              │    │                  │ │
│  │ Whisper │    │ ChromaDB /   │    │ GPT-4o /        │ │
│  │ Google  │    │ FAISS        │    │ Gemini /        │ │
│  │ Deepgram│    │              │    │ Llama 3 (Groq)  │ │
│  └─────────┘    └──────────────┘    └────────┬────────┘ │
│                                              │           │
│                                              ▼           │
│                                       ┌─────────┐        │
│                                       │   TTS   │        │
│                                       │         │        │
│                                       │ElevenLab│        │
│                                       │Google   │        │
│                                       └────┬────┘        │
│                                            │             │
│                                            ▼             │
│                                     Audio/Text Response  │
└─────────────────────────────────────────────────────────┘
```

### Components

| Layer | Description |
|-------|-------------|
| **Frontend** | React web app with voice button, chat window, recipe viewer |
| **Backend** | FastAPI (Python) — handles STT, RAG, LLM, TTS orchestration |
| **STT** | Converts user speech to text (benchmarked across 3 providers) |
| **RAG** | Chunks + embeds recipes → vector DB → retrieves top-k passages |
| **LLM** | Generates grounded, multi-turn conversational responses |
| **TTS** | Converts LLM text response back to spoken audio |

---

## Benchmarking Methodology

We use **component isolation**: when testing one component, all others are fixed at a consistent baseline. This eliminates confounding variables.

### STT Benchmark
- **Providers:** OpenAI Whisper · Google Speech-to-Text · Deepgram
- **Fixed:** LLM = GPT-4o, TTS = Google TTS
- **Test set:** 50–100 cooking-domain voice queries, recorded with background kitchen noise
- **Metrics:** Word Error Rate (WER), transcription latency

### LLM Benchmark
- **Models:** GPT-4o · Gemini Flash/Pro · Llama 3 (via Groq)
- **Fixed:** STT = best from above, TTS = Google TTS
- **Test set:** 30–50 ground-truth recipe Q&A pairs
- **Metrics:** Answer accuracy, ROUGE-L, response latency

### TTS Benchmark
- **Providers:** ElevenLabs · Google TTS
- **Fixed:** STT + LLM = best from above
- **Metrics:** Synthesis latency

### Full Pipeline
- **Config:** Best component from each benchmark assembled end-to-end
- **Metrics:** Total Silence-to-Speech latency, overall answer accuracy

---

## Repo Structure

```
recipewingman/
│
├── README.md
├── .env.example                  # API key template
├── .gitignore
├── requirements.txt              # Python dependencies
│
├── frontend/                     # React web app
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx    # Conversation display
│   │   │   ├── VoiceButton.jsx   # Record & send voice input
│   │   │   └── RecipeViewer.jsx  # Active recipe display
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
│
├── backend/                      # FastAPI server
│   ├── main.py                   # App entry point & routes
│   ├── config.py                 # Provider config & env vars
│   ├── embedder.py               # Shared embedding utility (OpenAI text-embedding-3-small)
│   │
│   ├── stt/                      # Speech-to-Text modules
│   │   ├── base.py               # Abstract STT interface
│   │   ├── whisper_stt.py        # OpenAI Whisper
│   │   ├── google_stt.py         # Google Speech-to-Text
│   │   └── deepgram_stt.py       # Deepgram
│   │
│   ├── rag/                      # RAG pipeline
│   │   ├── ingest.py             # Chunk, embed, store recipes
│   │   ├── retriever.py          # Query vector DB, return top-k
│   │   └── vector_store.py       # ChromaDB wrapper
│   │
│   ├── llm/                      # LLM modules
│   │   ├── base.py               # Abstract LLM interface
│   │   ├── gpt4o.py              # OpenAI GPT-4o
│   │   ├── gemini.py             # Google Gemini
│   │   └── llama_groq.py         # Llama 3 via Groq
│   │
│   ├── tts/                      # Text-to-Speech modules
│   │   ├── base.py               # Abstract TTS interface
│   │   ├── elevenlabs_tts.py     # ElevenLabs
│   │   └── google_tts.py         # Google TTS
│   │
│   └── agent/
│       ├── pipeline.py           # Orchestrates STT→Embed→RAG→LLM→TTS
│       ├── conversation.py       # Multi-turn history manager
│       └── modifier.py           # Recipe modification tool
│
├── benchmarks/                   # Benchmarking scripts
│   ├── run_stt_benchmark.py
│   ├── run_llm_benchmark.py
│   ├── run_tts_benchmark.py
│   ├── run_full_pipeline.py
│   └── results/                  # Output CSVs and charts
│
├── data/
│   ├── raw/                      # Downloaded datasets (gitignored)
│   ├── processed/                # Chunked & cleaned recipes
│   ├── test_sets/
│   │   ├── qa_test_set.json      # 30–50 ground-truth Q&A pairs
│   │   └── stt_test_set/         # Voice query recordings + transcripts
│   └── vector_db/                # Persisted ChromaDB (gitignored)
│
├── notebooks/
│   ├── EDA.ipynb                 # Food.com exploratory data analysis
│   └── benchmark_analysis.ipynb  # Results analysis & plots
│
└── reports/                      # Milestone PDFs
    ├── milestone1.pdf
    ├── milestone2.pdf
    └── milestone3.pdf
```

---

## Setup & Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/recipewingman.git
cd recipewingman
```

### 2. Set up environment variables
```bash
cp .env.example .env
```
Fill in your API keys in `.env`:
```
OPENAI_API_KEY=
GOOGLE_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=
GROQ_API_KEY=
```

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
python backend/rag/ingest.py --source data/processed/
```
This will chunk, embed, and store all recipes into the vector database.

---

## Running the App

### Start the backend
```bash
uvicorn backend.main:app --reload --port 8000
```

### Start the frontend
```bash
cd frontend
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Selecting providers
You can switch STT/LLM/TTS providers via `backend/config.py` or by passing query params:
```
GET /api/config?stt=whisper&llm=gpt4o&tts=google
```

---

## Running the Benchmarks

Each benchmark script outputs results to `benchmarks/results/`.

```bash
# STT benchmark (Whisper vs Google vs Deepgram)
python benchmarks/run_stt_benchmark.py

# LLM benchmark (GPT-4o vs Gemini vs Llama 3)
python benchmarks/run_llm_benchmark.py

# TTS benchmark (ElevenLabs vs Google TTS)
python benchmarks/run_tts_benchmark.py

# Full end-to-end pipeline with best components
python benchmarks/run_full_pipeline.py
```

Results are saved as CSVs in `benchmarks/results/` and can be analyzed in `notebooks/benchmark_analysis.ipynb`.

---

## Dataset

| Source | Size | Use |
|--------|------|-----|
| [Food.com (Kaggle)](https://www.kaggle.com/datasets/shuyangli94/food-com-recipes-and-user-interactions) | ~230,000 recipes | Primary RAG corpus |
| NYT Cooking (curated) | ~100 recipes | Quality benchmark corpus |
| User-uploaded PDFs | Runtime | Personalization |
| Custom Q&A Test Set | 30–50 pairs | LLM accuracy evaluation |
| STT Test Set | 50–100 recordings | WER evaluation |

> **Note:** Raw dataset files are gitignored. Download Food.com from Kaggle and place in `data/raw/`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React |
| Backend | FastAPI (Python) |
| Vector DB | ChromaDB / FAISS |
| Embeddings | OpenAI `text-embedding-3-small` |
| STT | Whisper · Google STT · Deepgram |
| LLM | GPT-4o · Gemini Flash/Pro · Llama 3 (Groq) |
| TTS | ElevenLabs · Google TTS |

---

## Milestones

| Milestone | Due | Status |
|-----------|-----|--------|
| M0 — Group Formation | Feb 13 | ✅ Done |
| M1 — Project Proposal | Mar 8 | ✅ Done |
| M2 — Midway Checkpoint | Apr 5 | 🔄 In Progress |
| M3 — Wrap Up | May 3 | ⏳ Upcoming |
| Final Presentation | TBD | ⏳ Upcoming |

---

## Team

| Member | Primary Role | Secondary |
|--------|-------------|-----------|
| **Galal Bichara** | RAG pipeline (ingestion, embedding, retrieval) | Backend API, LLM integration |
| **TB Rasya Danendra** | Frontend (React), voice UI, STT/TTS integration | Demo preparation |
| **Majo Salgado** | Benchmarking framework, Q&A test set, evaluation | Dataset curation, EDA |