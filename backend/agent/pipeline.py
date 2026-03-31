from backend.embedder import get_embeddings
from backend.rag.retriever import retrieve
from backend.llm.gpt4o import chat
import time


system_prompt = """
You are RecipeWingman, a hands-free cooking assistant
You will be given recipe chunks retrieved from a database. You have use them as your source of truth for ingredients, steps, and quantities
The retrieved recipes may not be exhaustive. If the user doesn't see what they want, invite them to be more specific
Help the user adapt recipes: scale for different servings, suggest substitutions for dietary needs or missing ingredients, adjust techniques for different equipment
Keep answers concise and practical since the user is mid-cook with messy hands
If the retrieved recipes don't answer the question, say so honestly, don't invent recipes. 
If multiple recipes match, briefly describe each (name and what makes it different) and ask the user to pick one. Only show the full recipe once the user has chosen
Ask more questions in order to understand what they want exactly, and if they are willing to compromise a bit
"""

rewrite_prompt = "Given the conversation, rewrite the user's last message as a standalone recipe search query. Return ONLY the search query, nothing else."

def rewrite_query(user_input, conversation_history):
    rewrite_messages = [{"role": "system", "content": rewrite_prompt}]
    rewrite_messages += conversation_history
    rewrite_messages.append({"role": "user", "content": user_input})
    return chat(rewrite_messages)


def run(user_input, conversation_history):
    try:
        rewrite_ms = 0
        if conversation_history:
            start = time.time()
            search_query = rewrite_query(user_input, conversation_history)
            rewrite_ms = round((time.time() - start) * 1000)
        else:
            search_query = user_input

        start = time.time()
        vector = get_embeddings([search_query])[0]
        embedding_ms = round((time.time() - start) * 1000)


        start = time.time()
        chunks = retrieve(vector)
        retrieval_ms = round((time.time() - start) * 1000)

        context_parts = []
        for chunk in chunks:
            header = f"--- Recipe: {chunk['recipe_name']} ---"
            context_parts.append(header + "\n" + chunk["text"])
        context = "\n\n".join(context_parts)

        message1 = {"role": "system", "content": system_prompt}
        message2 = {"role": "system", "content": "Retrieved recipes:\n" + context}
        message3 = {"role": "user", "content": user_input}
        
        conversation_history[:] = conversation_history[-20:]
        messages = [message1, message2] + conversation_history + [message3]

        start = time.time()
        response = chat(messages)
        llm_ms = round((time.time() - start) * 1000)


        conversation_history.append({"role": "user", "content": user_input})
        conversation_history.append({"role": "assistant", "content": response})

        timings = {
            "rewrite_ms": rewrite_ms,
            "embedding_ms": embedding_ms,
            "retrieval_ms": retrieval_ms,
            "llm_ms": llm_ms,
        }
        
        return {"response": response, "timings": timings}
    except Exception:
        return {"response": "Sorry, something went wrong. Please try again.", "timings": {}}

if __name__ == "__main__":
    conversation_history = []
    while True:
        user_input = input("\nYou: ")

        if user_input.lower() in ("quit", "exit"):
            break
        result = run(user_input, conversation_history)
        print(f"\nWingman: {result['response']}")
        print(f"[TIMING] {result['timings']}")