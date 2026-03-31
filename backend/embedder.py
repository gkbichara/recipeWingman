from backend.config import client

def get_embeddings(texts):
    
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    vectors = [item.embedding for item in response.data]

    return vectors
