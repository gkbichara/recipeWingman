from fastapi import FastAPI, UploadFile, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uuid
from backend.agent.pipeline import run
from backend.stt.whisper import transcribe
from backend.tts.openai_tts import synthesize


app = FastAPI()

app.add_middleware(CORSMiddleware,
    allow_origins=["http://localhost:3000", 
    "http://localhost:5173"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

sessions = {}

class ChatRequest(BaseModel):
    message: str = Field(max_length=2000)
    session_id: str | None = None

class ChatResponse(BaseModel):
    response: str
    session_id: str

@app.post("/api/chat")
def chat(request: ChatRequest):
    if request.session_id:
        session_id = request.session_id
    else:
        session_id = str(uuid.uuid4())

    history = sessions.get(session_id, [])
    response = run(request.message, history)
    sessions[session_id] = history
    return ChatResponse(response=response, session_id=session_id)

@app.post("/api/voice")
def voice(audio: UploadFile, session_id: str | None = None):
    try:
        if not session_id:
            session_id = str(uuid.uuid4())

        history = sessions.get(session_id, [])
        text = transcribe(audio.file, audio.filename)
        response = run(text, history)
        audio_bytes = synthesize(response)
        sessions[session_id] = history
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"X-Session-ID": session_id}
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Sorry, something went wrong. Please try again.")