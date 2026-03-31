from backend.config import client, LLM_MODEL

def chat(messages):
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages
    )
    return response.choices[0].message.content