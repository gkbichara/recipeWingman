from dotenv import load_dotenv
import os
import json
import tiktoken
from openai import OpenAI
from backend.rag.vector_store import VectorStore

load_dotenv()  

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_PATH = os.path.join(BASE_DIR, "data", "processed", "recipes_dev.jsonl")

OPENAI_API_KEY=os.getenv("OPENAI_API_KEY")
CHUNK_SIZE    = int(os.getenv("CHUNK_SIZE", 500))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 50))
TOP_K         = int(os.getenv("TOP_K", 5))
VECTOR_DB_PATH = os.path.join(BASE_DIR, os.getenv("VECTOR_DB_PATH"))

def chunk_text(text, chunk_size, chunk_overlap):
    # get the tiktoken encoder
    enc = tiktoken.encoding_for_model("text-embedding-3-small")
    # encode the text into a list of token integers
    tokens = enc.encode(text)
    # slide a window of size chunk_size across the tokens, stepping by (chunk_size - chunk_overlap)
    step = chunk_size - chunk_overlap
    chunks = []
    for i in range(0, len(tokens), step):
        window = tokens[i : i + chunk_size]
        if i > 0 and len(window) < chunk_overlap:
            continue
        # decode each window back into a string
        chunk = enc.decode(window)
        chunks.append(chunk)

    return chunks


def get_embeddings(texts, client):
    
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    vectors = [item.embedding for item in response.data]

    return vectors


def ingest(data_path, vector_db_path, chunk_size, chunk_overlap, batch_size=100):
    client = OpenAI(api_key=OPENAI_API_KEY)
    store = VectorStore(path=vector_db_path)

    ids_batch       = []
    docs_batch      = []
    metadatas_batch = []
    recipe_count    = 0
    
    with open(data_path, 'r') as f:
        for recipe in f:
            parsed = json.loads(recipe)
            chunks = chunk_text(parsed['formatted_text'], chunk_size, chunk_overlap)
            for i, chunk in enumerate(chunks):
                chunk_id = f"{parsed['id']}_chunk_{i}"
                
                metadata = {
                    "recipe_id":   parsed['id'],
                    "recipe_name": parsed['name'],
                    "chunk_index": i
                }

                ids_batch.append(chunk_id)
                docs_batch.append(chunk)
                metadatas_batch.append(metadata)

                if len(ids_batch) >= batch_size:
                    embeddings = get_embeddings(docs_batch, client)
                    store.add_chunks(ids_batch, embeddings, docs_batch, metadatas_batch)
                    ids_batch, docs_batch, metadatas_batch = [], [], []
                
            recipe_count += 1
            if recipe_count % 100 == 0:
                print(f"Processed {recipe_count} recipes...")
    if ids_batch:
        embeddings = get_embeddings(docs_batch, client)
        store.add_chunks(ids_batch, embeddings, docs_batch, metadatas_batch)

    print(f"Done. Total recipes ingested: {recipe_count}. Total chunks stored: {store.count()}")
   
if __name__ == "__main__":
    ingest(DATA_PATH, VECTOR_DB_PATH, CHUNK_SIZE, CHUNK_OVERLAP)