from backend.config import client

def synthesize(text):

    response = client.audio.speech.create(
        model="tts-1",
        voice = "alloy",
        input = text
    )

    return response.content