from fastapi import FastAPI, UploadFile, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uuid
from backend.agent.pipeline import run
from backend.stt.whisper import transcribe
from backend.tts.openai_tts import synthesize
import time


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
    result = run(request.message, history)
    response = result["response"]
    print(f"[TIMING] {result['timings']}") 
    sessions[session_id] = history
    return ChatResponse(response=response, session_id=session_id)

@app.post("/api/voice")
def voice(audio: UploadFile, session_id: str | None = None):
    try:
        if not session_id:
            session_id = str(uuid.uuid4())

        history = sessions.get(session_id, [])
        start = time.time()
        text = transcribe(audio.file, audio.filename)
        stt_ms = round((time.time() - start) * 1000)
        result = run(text, history)
        response = result["response"]
        timings = result["timings"]
        start = time.time()
        audio_bytes = synthesize(response)
        tts_ms = round((time.time() - start) * 1000)

        timings["stt_ms"] = stt_ms
        timings["tts_ms"] = tts_ms
        print(f"[TIMING] {timings}")


        sessions[session_id] = history
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={"X-Session-ID": session_id}
        )
    except Exception:
        raise HTTPException(status_code=500, detail="Sorry, something went wrong. Please try again.")