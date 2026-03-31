// src/api.js
// Central service layer for all RecipeWingman backend calls.
// The React app always talks to this file — never raw fetch calls scattered in components.

const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Set the active STT / LLM / TTS providers on the backend.
 * @param {{ stt: string, llm: string, tts: string }} config
 */
export async function setConfig(config) {
  const params = new URLSearchParams(config).toString();
  const res = await fetch(`${BASE}/api/config?${params}`);
  if (!res.ok) throw new Error("Failed to update config");
  return res.json();
}

/**
 * Fetch current provider config from the backend.
 */
export async function getConfig() {
  const res = await fetch(`${BASE}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

/**
 * Send a text message and get a text + audio response.
 * @param {string} text          — the user's message
 * @param {string[]} history     — [{role, content}, ...] conversation history
 * @param {string|null} recipeId — active recipe id, or null
 * @returns {{ text: string, audio_url: string|null, sources: object[] }}
 */
export async function sendMessage({ text, history = [], recipeId = null }) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, history, recipe_id: recipeId }),
  });
  if (!res.ok) throw new Error("Chat request failed");
  return res.json();
}

/**
 * Transcribe audio blob via STT provider.
 * Returns { transcript: string, latency_ms: number }
 */
export async function transcribeAudio(audioBlob) {
  const form = new FormData();
  form.append("audio", audioBlob, "recording.webm");
  const res = await fetch(`${BASE}/api/stt`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("STT transcription failed");
  return res.json();
}

/**
 * Upload a recipe PDF or plain text for RAG ingestion.
 * @param {File} file
 * @returns {{ recipe_id: string, name: string, chunk_count: number }}
 */
export async function uploadRecipe(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}/api/recipes/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Recipe upload failed");
  return res.json();
}

/**
 * List all available recipes in the vector DB.
 * @returns {{ recipes: { id: string, name: string, source: string }[] }}
 */
export async function listRecipes() {
  const res = await fetch(`${BASE}/api/recipes`);
  if (!res.ok) throw new Error("Failed to list recipes");
  return res.json();
}

/**
 * Fetch a specific recipe by id.
 * @param {string} recipeId
 * @returns {{ id: string, name: string, ingredients: string[], steps: string[] }}
 */
export async function getRecipe(recipeId) {
  const res = await fetch(`${BASE}/api/recipes/${recipeId}`);
  if (!res.ok) throw new Error("Failed to fetch recipe");
  return res.json();
}

/**
 * Run an on-demand benchmark for a single component.
 * @param {"stt"|"llm"|"tts"|"pipeline"} component
 * @returns benchmark result object
 */
export async function runBenchmark(component) {
  const res = await fetch(`${BASE}/api/benchmark/${component}`, { method: "POST" });
  if (!res.ok) throw new Error("Benchmark failed");
  return res.json();
}