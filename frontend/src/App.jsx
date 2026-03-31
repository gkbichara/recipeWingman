import React, { useState, useCallback, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import VoiceButton from './components/VoiceButton';
import RecipeViewer from './components/RecipeViewer';
import ProviderSelector from './components/ProviderSelector';
import { sendMessage, transcribeAudio, getConfig, listRecipes } from './api';
import styles from './App.module.css';

// ─── App-level state shape ────────────────────────────────
// messages: [{ id, role: 'user'|'assistant', content, sources, latency }]
// providers: { stt, llm, tts }
// activeRecipe: recipe object | null

export default function App() {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your RecipeWingman. Ask me anything about a recipe — I'll guide you step by step, hands-free.",
      sources: [],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState({ stt: 'whisper', llm: 'gpt4o', tts: 'google' });
  const [activeRecipe, setActiveRecipe] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState(null);

  // Load config and recipe list on mount
  useEffect(() => {
    getConfig()
      .then(cfg => setProviders(cfg))
      .catch(() => {}); // silently fall back to defaults if backend isn't up yet
    listRecipes()
      .then(({ recipes: r }) => setRecipes(r))
      .catch(() => {});
  }, []);

  // ── Send a text message ──────────────────────────────────
  const handleSend = useCallback(async (text) => {
    const trimmed = (text || inputText).trim();
    if (!trimmed || isLoading) return;
    setInputText('');
    setError(null);

    const userMsg = { id: Date.now(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(({ role, content }) => ({ role, content }));

      const data = await sendMessage({
        text: trimmed,
        history,
        recipeId: activeRecipe?.id ?? null,
      });

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.text,
        sources: data.sources ?? [],
        audioUrl: data.audio_url ?? null,
        latency: data.latency_ms ?? null,
      };
      setMessages(prev => [...prev, assistantMsg]);

      // Auto-play TTS audio if returned
      if (data.audio_url) {
        const audio = new Audio(data.audio_url);
        audio.play().catch(() => {}); // browser may block autoplay
      }
    } catch (err) {
      setError('Something went wrong. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, activeRecipe]);

  // ── Handle voice input ───────────────────────────────────
  const handleVoiceResult = useCallback(async (audioBlob) => {
    setIsLoading(true);
    setError(null);
    try {
      const { transcript } = await transcribeAudio(audioBlob);
      if (transcript) {
        await handleSend(transcript);
      }
    } catch (err) {
      setError('Voice transcription failed. Check your STT provider.');
      setIsLoading(false);
    }
  }, [handleSend]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.shell}>
      {/* ── Top bar ──────────────────────────────────────── */}
      <header className={styles.topBar}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🍳</span>
          <span className={styles.logoText}>Recipe<em>Wingman</em></span>
        </div>

        <ProviderSelector
          providers={providers}
          onChange={setProviders}
        />

        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle recipe panel"
          title="Toggle recipe panel"
        >
          {sidebarOpen ? '⊠' : '⊞'}
        </button>
      </header>

      {/* ── Main content ─────────────────────────────────── */}
      <main className={styles.main}>
        {/* Chat column */}
        <section className={styles.chatCol}>
          <ChatWindow
            messages={messages}
            isLoading={isLoading}
          />

          {error && <div className={styles.error}>{error}</div>}

          {/* Input bar */}
          <div className={styles.inputBar}>
            <VoiceButton
              onResult={handleVoiceResult}
              disabled={isLoading}
            />
            <textarea
              className={styles.textInput}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about a step, substitute an ingredient, scale the recipe…"
              rows={1}
              disabled={isLoading}
            />
            <button
              className={styles.sendBtn}
              onClick={() => handleSend()}
              disabled={!inputText.trim() || isLoading}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </section>

        {/* Recipe sidebar */}
        {sidebarOpen && (
          <aside className={styles.recipeCol}>
            <RecipeViewer
              recipes={recipes}
              activeRecipe={activeRecipe}
              onSelectRecipe={setActiveRecipe}
              onRecipeUploaded={(r) => setRecipes(prev => [r, ...prev])}
            />
          </aside>
        )}
      </main>
    </div>
  );
}
