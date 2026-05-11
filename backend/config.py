from dotenv import load_dotenv
import os
from openai import OpenAI

load_dotenv()

# RAG settings
CHUNK_SIZE     = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP  = int(os.getenv("CHUNK_OVERLAP", 50))
TOP_K          = int(os.getenv("TOP_K", 5))
VECTOR_DB_PATH = os.path.abspath(os.getenv("VECTOR_DB_PATH", "data/vector_db"))
DATA_PATH = os.path.abspath(os.path.join("data", "processed", "recipes_dev.jsonl"))

# API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set. Add it to your .env file.")

LLM_MODEL = os.getenv("LLM_MODEL", "gemini-3-flash")

# LLM client — supports OpenAI and Gemini via OpenAI-compatible API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

if LLM_MODEL.startswith("gemini") and GOOGLE_API_KEY:
    llm_client = OpenAI(
        api_key=GOOGLE_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
else:
    llm_client = OpenAI(api_key=OPENAI_API_KEY)

# Default client for embeddings, STT, TTS (always OpenAI)
client = OpenAI(api_key=OPENAI_API_KEY)