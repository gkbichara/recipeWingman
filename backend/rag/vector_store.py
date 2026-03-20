import chromadb

class VectorStore:
    def __init__(self, path, collection_name="recipes"):
        self.client = chromadb.PersistentClient(path=path)
        self.collection = self.client.get_or_create_collection(name=collection_name)


    def add_chunks(self, ids, embeddings, documents, metadatas):
        self.collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )


    def query(self, query_embedding, n_results=5):
        results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=n_results
                )
        return results


    def count(self):
        return self.collection.count()