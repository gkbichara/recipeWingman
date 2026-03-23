def get_embeddings(texts, client):
    
    response = client.embeddings.create(
        input=texts,
        model="text-embedding-3-small"
    )
    vectors = [item.embedding for item in response.data]

    return vectors
