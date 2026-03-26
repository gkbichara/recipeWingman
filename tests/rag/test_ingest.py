import pytest
import tiktoken
from backend.rag.ingest import chunk_text

SAMPLE = "Recipe: arriba baked winter squash\nIngredients: winter squash, honey, butter\nSteps: cut the squash in half. remove seeds. drizzle with honey and butter. bake at 350 degrees for 40 minutes until tender."

def test_chunk_text_returns_list():
    result = chunk_text(SAMPLE, chunk_size=20, chunk_overlap=5)
    assert isinstance(result, list)

def test_chunk_text_correct_count():
    result = chunk_text(SAMPLE, chunk_size=20, chunk_overlap=5)
    assert len(result) == 3

def test_chunk_text_no_tiny_chunks():
    enc = tiktoken.encoding_for_model("text-embedding-3-small")
    result = chunk_text(SAMPLE, chunk_size=20, chunk_overlap=5)
    for chunk in result:
        assert len(enc.encode(chunk)) >= 5

def test_chunk_text_single_chunk_for_short_text():
    result = chunk_text("short text", chunk_size=500, chunk_overlap=50)
    assert len(result) == 1