const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

export async function sendMessage(message, sessionId) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId ?? null }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  const data = await res.json();
  return { response: data.response, sessionId: data.session_id };
}

export async function sendVoice(audioBlob, sessionId) {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");
  if (sessionId) form.append("session_id", sessionId);

  const res = await fetch(`${BASE}/api/voice`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Voice request failed");

  const data = await res.json();
  const audioBytes = Uint8Array.from(atob(data.audio_b64), c => c.charCodeAt(0));
  const audioResponseBlob = new Blob([audioBytes], { type: "audio/mpeg" });

  return {
    transcript: data.transcript,
    response: data.response,
    audio: audioResponseBlob,
    sessionId: data.session_id,
  };
}
