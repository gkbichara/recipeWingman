from backend.config import client

def transcribe(audio_file, filename):
    response = client.audio.transcriptions.create(
        model="whisper-1",
        file=(filename, audio_file)
    )
    return response.text