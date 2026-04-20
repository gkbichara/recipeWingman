import React, { useState, useCallback, useRef } from 'react';
import ChatWindow from './components/ChatWindow';
import VoiceButton from './components/VoiceButton';
import { sendMessageStream, sendVoice } from './api';
import './App.css';

export default function App() {
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', content: "Hi! I'm RecipeWingman. Ask me anything about a recipe — I'll guide you step by step, hands-free." },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  const audioRef = useRef(null);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    stopAudio();
    setInputText('');
    setError(null);
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: trimmed }]);
    setIsLoading(true);

    const assistantId = Date.now() + 1;
    let firstToken = true;

    try {
      const data = await sendMessageStream(trimmed, sessionId, (token) => {
        if (firstToken) {
          setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: token }]);
          firstToken = false;
        } else {
          setMessages(prev => prev.map(msg =>
            msg.id === assistantId ? { ...msg, content: msg.content + token } : msg
          ));
        }
      });
      setSessionId(data.sessionId);
    } catch {
      setError('Something went wrong. Is the backend running?');
      setMessages(prev => prev.filter(msg => msg.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, sessionId, stopAudio]);

  const handleVoice = useCallback(async (audioBlob) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await sendVoice(audioBlob, sessionId);
      setSessionId(data.sessionId);
      setMessages(prev => [
        ...prev,
        { id: Date.now(), role: 'user', content: data.transcript },
        { id: Date.now() + 1, role: 'assistant', content: data.response },
      ]);
      stopAudio();
      const audioUrl = URL.createObjectURL(data.audio);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play().catch(() => {});
    } catch {
      setError('Voice request failed. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">W</span>
        <span className="app-title">Recipe<em>Wingman</em></span>
      </header>

      <ChatWindow messages={messages} isLoading={isLoading} />

      {error && <div className="app-error">{error}</div>}

      <div className="app-input-bar">
        <VoiceButton onResult={handleVoice} disabled={isLoading} onStartRecording={stopAudio} />
        <textarea
          className="app-text-input"
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a recipe..."
          rows={1}
          disabled={isLoading}
        />
        <button
          className="app-send-btn"
          onClick={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
