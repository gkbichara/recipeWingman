from backend.rag.vector_store import VectorStore
from backend.config import VECTOR_DB_PATH, TOP_K

store = VectorStore(path=VECTOR_DB_PATH)


def retrieve(query_embedding, n_results=TOP_K):
    docs = store.query([query_embedding], n_results)
    documents = docs["documents"][0]
    metadatas = docs["metadatas"][0]
    results = []
    n = len(documents)

    for i in range(n):
        recipe = {
            "text":        documents[i],
            "recipe_id":   metadatas[i]["recipe_id"],
            "recipe_name": metadatas[i]["recipe_name"],
            "chunk_index": metadatas[i]["chunk_index"],
        }
        results.append(recipe)
        
    return results

if __name__ == "__main__":
    from backend.embedder import get_embeddings
    from backend.config import OPENAI_API_KEY
    from openai import OpenAI
    
    client = OpenAI(api_key=OPENAI_API_KEY)
    vector = get_embeddings(["quick pasta with garlic"], client)[0]
    print( retrieve(vector) )