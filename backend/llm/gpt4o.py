from backend.config import llm_client, LLM_MODEL

def chat(messages):
    response = llm_client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages
    )
    return response.choices[0].message.content

def chat_stream(messages):
    stream = llm_client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        stream=True
    )
    for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content