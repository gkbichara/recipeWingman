# RecipeWingman — Galal's RAG Pipeline Handoff

**Date:** March 2026  
**Branch:** `feature/rag-ingest`  
**Role:** Galal owns the RAG pipeline — ingestion, embedding, retrieval, and backend API

---

## What has been completed

### Phase 1 — Scaffold (merged to main)
- Project folder structure created
- `requirements.txt`, `.env.example`, `.gitignore`, `.python-version` (3.11.9 via pyenv)
- All `backend/` subpackages initialised with `__init__.py`

### Phase 2 — EDA + Data Processing (merged to main)
- `notebooks/EDA.ipynb` — full exploratory analysis of Food.com dataset including:
  - n_steps, n_ingredients, word count, tag frequency, cooking time distributions
  - Token count analysis using `tiktoken` (`cl100k_base` encoding)
  - Sample formatted text inspection
  - Dev subset selection and export
- `data/processed/recipes_dev.jsonl` — 10,000 recipes, filtered (`n_steps >= 3`, `token_count > 50`)
  - Each record has: `id`, `name`, `ingredients`, `steps`, `formatted_text`, `token_count`
  - `formatted_text` format: `"Recipe: {name}\nIngredients: {csv}\nSteps: {joined steps}"`
  - Most recipes are under 300 tokens → 500-token chunks ≈ one whole recipe

### Phase 3 — RAG Ingest (current branch: `feature/rag-ingest`)

#### `backend/rag/vector_store.py` — COMPLETE
Thin wrapper around ChromaDB PersistentClient. Three methods:
- `__init__(path, collection_name)` — creates persistent client and collection
- `add_chunks(ids, embeddings, documents, metadatas)` — batch insert
- `query(query_embedding, n_results)` — returns ChromaDB result dict
- `count()` — returns number of stored chunks

#### `backend/rag/ingest.py` — MOSTLY COMPLETE, needs finishing
Three functions written and tested:
- `chunk_text(text, chunk_size, chunk_overlap)` — tiktoken sliding window chunking, filters trailing chunks smaller than `chunk_overlap`
- `get_embeddings(texts, client)` — calls OpenAI `text-embedding-3-small`, returns list of 1536-dim vectors
- `ingest(data_path, vector_db_path, chunk_size, chunk_overlap, batch_size=100)` — full pipeline loop, COMPLETE

Both `chunk_text` and `get_embeddings` have been manually tested and verified working.

---

## What needs to be done next (in order)

### 1. Update `if __name__ == "__main__"` block in `ingest.py`
Replace the current test code with the actual ingest call:
```python
if __name__ == "__main__":
    ingest(DATA_PATH, VECTOR_DB_PATH, CHUNK_SIZE, CHUNK_OVERLAP)

Important notes
Run all scripts from project root with python -m backend.rag.ingest (not python backend/rag/ingest.py) — the -m flag is required for imports to resolve
data/vector_db/ and data/raw/ are gitignored — never commit them
data/processed/recipes_dev.jsonl IS committed — it's the input to ingest
Galal is learning by coding by hand — act as PM/guide, not code writer
