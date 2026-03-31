# RecipeWingman — Frontend

React web app for the RecipeWingman voice cooking assistant.  
Connects to the FastAPI backend for STT → RAG → LLM → TTS.

---

## Quick Start

```bash
cd frontend
npm install
cp .env.example .env.local      # set REACT_APP_API_URL if needed
npm start                        # opens http://localhost:3000
```

The app proxies API calls to `http://localhost:8000` by default (set in `package.json`).  
Override with `REACT_APP_API_URL=http://your-backend` in `.env.local`.

---

## File Map

```
src/
├── index.js                    # React root
├── index.css                   # Design tokens (CSS vars), global reset, typography
├── api.js                      # ← ALL backend calls live here. Never raw fetch elsewhere.
├── App.jsx                     # Shell: layout, top-level state, route between panels
├── App.module.css
│
├── hooks/
│   ├── useChatState.js         # Message history, send(), sendVoice(), clear()
│   └── useVoiceRecorder.js     # MediaRecorder + AudioContext, amplitude analysis
│
└── components/
    ├── ChatWindow.jsx           # Conversation feed — markdown, sources, TTS replay
    ├── ChatWindow.module.css
    ├── VoiceButton.jsx          # Hold-to-record, live amplitude ring
    ├── VoiceButton.module.css
    ├── RecipeViewer.jsx         # Recipe list, PDF upload, step navigator
    ├── RecipeViewer.module.css
    ├── ProviderSelector.jsx     # STT/LLM/TTS dropdowns → /api/config
    ├── ProviderSelector.module.css
    ├── BenchmarkPanel.jsx       # Modal: trigger benchmarks, view results
    ├── BenchmarkPanel.module.css
    ├── StatusBar.jsx            # Live session stats: latency, turns, RAG usage
    ├── StatusBar.module.css
    └── ErrorBoundary.jsx        # Catches render crashes, shows recovery UI
```

---

## Backend API Contract

All calls go through `src/api.js`. The FastAPI backend must expose:

| Method | Path | Purpose |
|--------|------|---------|
| `GET`  | `/api/config` | Get current STT/LLM/TTS config |
| `GET`  | `/api/config?stt=&llm=&tts=` | Set providers |
| `POST` | `/api/chat` | Send message → `{ text, audio_url, sources, latency_ms }` |
| `POST` | `/api/stt` | Upload audio → `{ transcript, latency_ms }` |
| `GET`  | `/api/recipes` | List recipes → `{ recipes: [{id, name, source}] }` |
| `GET`  | `/api/recipes/:id` | Get recipe detail → `{ id, name, ingredients, steps }` |
| `POST` | `/api/recipes/upload` | Upload PDF/txt → `{ recipe_id, name, chunk_count }` |
| `POST` | `/api/benchmark/:component` | Run benchmark → result object |

### `/api/chat` request body
```json
{
  "message": "How long do I sauté the onions?",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "recipe_id": "uuid-or-null"
}
```

---

## Design System

All design tokens are CSS variables in `src/index.css`:

| Token | Value | Use |
|-------|-------|-----|
| `--bg-base` | `#141210` | Page background |
| `--bg-surface` | `#1e1b18` | Cards, panels |
| `--accent-saffron` | `#e8a020` | Primary accent |
| `--accent-sage` | `#7a9e6e` | RAG/success |
| `--accent-terracotta` | `#c45c38` | Errors |
| `--font-display` | Playfair Display | Headings |
| `--font-body` | DM Sans | UI text |

---

## Key Decisions

- **`api.js` is the single source of truth** for backend communication. All components import from it — no raw `fetch` calls scattered around. Makes it trivial to add auth headers, change base URL, or mock the backend.
- **`useChatState` owns all message logic.** `App.jsx` stays a layout component.
- **`useVoiceRecorder` is separate from `VoiceButton`** so it can be reused, mocked in tests, or swapped for a different recording strategy without touching the UI.
- **CSS Modules throughout.** No global class name conflicts, clear ownership of styles.
- **`ErrorBoundary` uses inline styles** so it renders even if CSS fails to load.

---

## Development Without Backend

If the backend isn't running, the app will still render. All API errors surface in the UI as dismissable error banners (from `useChatState`). No white screens.

To mock the backend for pure frontend development, replace the fetch calls in `api.js` with mock responses — it's all in one file.

---

## Dependencies

| Package | Why |
|---------|-----|
| `react`, `react-dom` | Core |
| `react-scripts` | CRA build tooling |
| `react-markdown` | Render markdown in assistant messages |
| `framer-motion` | Available for animations (installed, not yet used) |
| `lucide-react` | Available for icons (installed, not yet used) |
