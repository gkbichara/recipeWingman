from backend.embedder import get_embeddings
from backend.rag.retriever import retrieve
from backend.llm.gpt4o import chat, chat_stream
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

classify_prompt = (
    "Given the conversation so far, classify the user's last message:\n\n"
    "Respond with NONE if the user is asking about recipes already discussed — "
    "including but not limited to:\n"
    "- Picking a recipe: 'give me the second one', 'I'll try that'\n"
    "- Ingredients or quantities: 'what are the ingredients', 'how much butter'\n"
    "- Steps or instructions: 'what's the next step', 'I finished step 1 what's step 2', "
    "'how long do I bake it'\n"
    "- Substitutions or adjustments: 'can I use milk instead', 'make it for 4 people'\n"
    "- Any follow-up about a recipe the assistant already provided\n\n"
    "Respond with a standalone recipe search query ONLY if the user wants to find "
    "something NEW in the database (e.g. 'I want a pasta recipe', "
    "'find me something with shrimp').\n\n"
    "Respond with either NONE or the search query. Nothing else."
)

def classify_and_rewrite(user_input, conversation_history):
    messages = [{"role": "system", "content": classify_prompt}]
    messages += conversation_history
    messages.append({"role": "user", "content": user_input})
    return chat(messages)


def run(user_input, conversation_history, last_context=""):
    try:
        classify_ms = 0
        skipped_retrieval = False
        embedding_ms = 0
        retrieval_ms = 0

        if conversation_history:
            start = time.time()
            classification = classify_and_rewrite(user_input, conversation_history)
            classify_ms = round((time.time() - start) * 1000)
        else:
            classification = user_input

        if classification.strip().upper() == "NONE" and last_context:
            skipped_retrieval = True
            context = last_context
        else:
            search_query = classification if conversation_history else user_input

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
            last_context = context

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
            "classify_ms": classify_ms,
            "embedding_ms": embedding_ms,
            "retrieval_ms": retrieval_ms,
            "llm_ms": llm_ms,
            "skipped_retrieval": skipped_retrieval,
        }

        return {"response": response, "timings": timings, "last_context": last_context}
    except Exception:
        return {"response": "Sorry, something went wrong. Please try again.", "timings": {}, "last_context": last_context}


def run_stream(user_input, conversation_history, last_context=""):
    try:
        classify_ms = 0
        skipped_retrieval = False
        embedding_ms = 0
        retrieval_ms = 0

        if conversation_history:
            start = time.time()
            classification = classify_and_rewrite(user_input, conversation_history)
            classify_ms = round((time.time() - start) * 1000)
        else:
            classification = user_input

        if classification.strip().upper() == "NONE" and last_context:
            skipped_retrieval = True
            context = last_context
        else:
            search_query = classification if conversation_history else user_input

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
            last_context = context

        message1 = {"role": "system", "content": system_prompt}
        message2 = {"role": "system", "content": "Retrieved recipes:\n" + context}
        message3 = {"role": "user", "content": user_input}

        conversation_history[:] = conversation_history[-20:]
        messages = [message1, message2] + conversation_history + [message3]

        start = time.time()
        full_response = ""
        for token in chat_stream(messages):
            full_response += token
            yield ("token", token)
        llm_ms = round((time.time() - start) * 1000)

        conversation_history.append({"role": "user", "content": user_input})
        conversation_history.append({"role": "assistant", "content": full_response})

        timings = {
            "classify_ms": classify_ms,
            "embedding_ms": embedding_ms,
            "retrieval_ms": retrieval_ms,
            "llm_ms": llm_ms,
            "skipped_retrieval": skipped_retrieval,
        }
        print(f"[TIMING] {timings}")

        yield ("done", {"timings": timings, "last_context": last_context})
    except Exception:
        yield ("error", {"last_context": last_context})


if __name__ == "__main__":
    conversation_history = []
    last_context = ""
    while True:
        user_input = input("\nYou: ")

        if user_input.lower() in ("quit", "exit"):
            break
        result = run(user_input, conversation_history, last_context)
        last_context = result["last_context"]
        print(f"\nWingman: {result['response']}")
        print(f"[TIMING] {result['timings']}")