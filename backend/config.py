from dotenv import load_dotenv
import os

load_dotenv()  


# RAG settings
CHUNK_SIZE     = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP  = int(os.getenv("CHUNK_OVERLAP", 50))
TOP_K          = int(os.getenv("TOP_K", 5))
VECTOR_DB_PATH = os.path.abspath(os.getenv("VECTOR_DB_PATH", "data/vector_db"))
DATA_PATH = os.path.abspath(os.path.join("data", "processed", "recipes_dev.jsonl"))

# API keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")