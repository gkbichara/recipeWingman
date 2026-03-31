import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import styles from './ChatWindow.module.css';

/**
 * ChatWindow
 * Renders the full conversation. Auto-scrolls to the latest message.
 *
 * Props:
 *   messages: [{ id, role, content, sources?, audioUrl?, latency? }]
 *   isLoading: bool
 */
export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className={styles.window}>
      <div className={styles.feed}>
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}

        {isLoading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Individual message ──────────────────────────────────────
function Message({ msg }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : styles.rowAssistant}`}>
      {!isUser && (
        <div className={styles.avatar} aria-hidden="true">🍳</div>
      )}

      <div className={styles.bubble}>
        <div className={styles.content}>
          {isUser ? (
            <p className={styles.userText}>{msg.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className={styles.mdPara}>{children}</p>,
                ul: ({ children }) => <ul className={styles.mdList}>{children}</ul>,
                ol: ({ children }) => <ol className={styles.mdList}>{children}</ol>,
                li: ({ children }) => <li className={styles.mdItem}>{children}</li>,
                strong: ({ children }) => <strong className={styles.mdBold}>{children}</strong>,
                code: ({ children }) => <code className={styles.mdCode}>{children}</code>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Sources chips */}
        {msg.sources && msg.sources.length > 0 && (
          <div className={styles.sources}>
            <span className={styles.sourcesLabel}>Sources</span>
            {msg.sources.map((s, i) => (
              <span key={i} className={styles.sourceChip}>
                {s.recipe_name ?? s.source ?? `chunk ${i + 1}`}
              </span>
            ))}
          </div>
        )}

        {/* Latency badge */}
        {msg.latency && (
          <div className={styles.latency}>{msg.latency}ms</div>
        )}

        {/* Audio replay button */}
        {msg.audioUrl && (
          <button
            className={styles.audioBtn}
            onClick={() => new Audio(msg.audioUrl).play()}
            title="Replay audio response"
            aria-label="Replay audio response"
          >
            ▶ Replay
          </button>
        )}
      </div>

      {isUser && (
        <div className={`${styles.avatar} ${styles.avatarUser}`} aria-hidden="true">
          👤
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className={`${styles.row} ${styles.rowAssistant}`}>
      <div className={styles.avatar} aria-hidden="true">🍳</div>
      <div className={`${styles.bubble} ${styles.typingBubble}`} aria-label="Assistant is thinking">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
    </div>
  );
}
