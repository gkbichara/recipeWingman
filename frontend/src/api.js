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

export async function sendMessageStream(message, sessionId, onToken) {
  const res = await fetch(`${BASE}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId ?? null }),
  });
  if (!res.ok) throw new Error("Chat request failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let returnedSessionId = sessionId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = JSON.parse(line.slice(6));

      if (data.session_id) returnedSessionId = data.session_id;
      if (data.token) onToken(data.token);
      if (data.error) throw new Error(data.error);
    }
  }

  return { sessionId: returnedSessionId };
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
