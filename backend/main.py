from fastapi import FastAPI, UploadFile, Response, HTTPException, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Annotated
import uuid
import base64
import json
from backend.agent.pipeline import run, run_stream
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

    session = sessions.get(session_id, {"history": [], "last_context": ""})
    result = run(request.message, session["history"], session["last_context"])
    response = result["response"]
    session["last_context"] = result["last_context"]
    print(f"[TIMING] {result['timings']}")
    sessions[session_id] = session
    return ChatResponse(response=response, session_id=session_id)

@app.post("/api/chat/stream")
def chat_stream_endpoint(request: ChatRequest):
    session_id = request.session_id or str(uuid.uuid4())
    session = sessions.get(session_id, {"history": [], "last_context": ""})

    def event_generator():
        yield f"data: {json.dumps({'session_id': session_id})}\n\n"

        for event_type, data in run_stream(request.message, session["history"], session["last_context"]):
            if event_type == "token":
                yield f"data: {json.dumps({'token': data})}\n\n"
            elif event_type == "done":
                session["last_context"] = data["last_context"]
                sessions[session_id] = session
                yield f"data: {json.dumps({'done': True})}\n\n"
            elif event_type == "error":
                session["last_context"] = data["last_context"]
                sessions[session_id] = session
                yield f"data: {json.dumps({'error': 'Something went wrong. Please try again.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )

@app.post("/api/voice")
def voice(audio: UploadFile, session_id: Annotated[str | None, Form()] = None):
    try:
        if not session_id:
            session_id = str(uuid.uuid4())

        session = sessions.get(session_id, {"history": [], "last_context": ""})
        start = time.time()
        text = transcribe(audio.file, audio.filename)
        stt_ms = round((time.time() - start) * 1000)
        result = run(text, session["history"], session["last_context"])
        response = result["response"]
        timings = result["timings"]
        session["last_context"] = result["last_context"]
        start = time.time()
        audio_bytes = synthesize(response)
        tts_ms = round((time.time() - start) * 1000)

        timings["stt_ms"] = stt_ms
        timings["tts_ms"] = tts_ms
        print(f"[TIMING] {timings}")

        sessions[session_id] = session
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        return {
            "transcript": text,
            "response": response,
            "audio_b64": audio_b64,
            "session_id": session_id,
        }
    except Exception:
        raise HTTPException(status_code=500, detail="Sorry, something went wrong. Please try again.")