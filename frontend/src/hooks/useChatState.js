import { useState, useCallback, useRef } from 'react';
import { sendMessage, transcribeAudio } from '../api';

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your **RecipeWingman**. Ask me anything about a recipe — substitutions, scaling, timing, technique — and I'll guide you step by step, hands-free.",
  sources: [],
};

/**
 * useChatState
 * Manages the full conversation: messages, sending text, sending voice,
 * loading state, and errors.
 *
 * Usage in App:
 *   const chat = useChatState({ activeRecipeId });
 *   <ChatWindow messages={chat.messages} isLoading={chat.isLoading} />
 *   <InputBar onSend={chat.send} onVoice={chat.sendVoice} />
 */
export function useChatState({ activeRecipeId = null } = {}) {
  const [messages, setMessages] = useState([WELCOME]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  // Track in-flight abort so we can cancel (future enhancement)
  const abortRef = useRef(null);

  // ── Internal: add a message ───────────────────────────────
  const addMessage = useCallback((msg) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), ...msg }]);
  }, []);

  // ── Send text ─────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || isLoading) return;
    setError(null);

    const userMsg = { role: 'user', content: trimmed };
    addMessage(userMsg);
    setIsLoading(true);

    try {
      // Build history from current messages (exclude welcome)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(({ role, content }) => ({ role, content }));

      const data = await sendMessage({
        text: trimmed,
        history,
        recipeId: activeRecipeId,
      });

      addMessage({
        role: 'assistant',
        content: data.text,
        sources: data.sources ?? [],
        audioUrl: data.audio_url ?? null,
        latency: data.latency_ms ?? null,
      });

      // Auto-play TTS if available
      if (data.audio_url) {
        new Audio(data.audio_url).play().catch(() => {});
      }
    } catch (err) {
      setError('Something went wrong. Is the backend running on port 8000?');
      console.error('[useChatState] send error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, activeRecipeId, addMessage]);

  // ── Send voice (blob → STT → send) ────────────────────────
  const sendVoice = useCallback(async (audioBlob) => {
    setIsLoading(true);
    setError(null);
    try {
      const { transcript, latency_ms } = await transcribeAudio(audioBlob);
      if (transcript?.trim()) {
        // Show what was heard before sending (good UX)
        addMessage({
          role: 'user',
          content: transcript.trim(),
          sttLatency: latency_ms,
          fromVoice: true,
        });

        // Build history and send directly (skip addMessage to avoid double user bubble)
        const history = messages
          .filter(m => m.id !== 'welcome')
          .map(({ role, content }) => ({ role, content }));

        const data = await sendMessage({
          text: transcript.trim(),
          history,
          recipeId: activeRecipeId,
        });

        addMessage({
          role: 'assistant',
          content: data.text,
          sources: data.sources ?? [],
          audioUrl: data.audio_url ?? null,
          latency: data.latency_ms ?? null,
        });

        if (data.audio_url) {
          new Audio(data.audio_url).play().catch(() => {});
        }
      }
    } catch (err) {
      setError('Voice processing failed. Check your STT provider and microphone.');
      console.error('[useChatState] sendVoice error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, activeRecipeId, addMessage]);

  // ── Clear conversation ────────────────────────────────────
  const clear = useCallback(() => {
    setMessages([WELCOME]);
    setError(null);
  }, []);

  return { messages, isLoading, error, send, sendVoice, clear, setError };
}