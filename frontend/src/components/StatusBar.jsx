import React, { useMemo } from 'react';
import styles from './StatusBar.module.css';

/**
 * StatusBar
 * Thin bar below the input. Shows live session stats derived from messages.
 *
 * Props:
 *   messages: message array from useChatState
 *   providers: { stt, llm, tts }
 */
export default function StatusBar({ messages, providers }) {
  const stats = useMemo(() => {
    const assistantMsgs = messages.filter(m => m.role === 'assistant' && m.latency);
    const avgLatency = assistantMsgs.length
      ? Math.round(assistantMsgs.reduce((s, m) => s + m.latency, 0) / assistantMsgs.length)
      : null;
    const turns = messages.filter(m => m.role === 'user').length;
    const sourcesUsed = messages.filter(m => m.sources?.length > 0).length;
    return { avgLatency, turns, sourcesUsed };
  }, [messages]);

  const providerLabel = `${providers.stt} · ${providers.llm} · ${providers.tts}`;

  return (
    <div className={styles.bar} aria-label="Session stats">
      <span className={styles.item} title="Active providers">
        <Dot color="sage" />
        {providerLabel}
      </span>

      {stats.turns > 0 && (
        <span className={styles.item} title="Turns in this conversation">
          {stats.turns} {stats.turns === 1 ? 'turn' : 'turns'}
        </span>
      )}

      {stats.sourcesUsed > 0 && (
        <span className={styles.item} title="Responses grounded in RAG sources">
          <Dot color="sage" />
          {stats.sourcesUsed} RAG-grounded
        </span>
      )}

      {stats.avgLatency !== null && (
        <span
          className={`${styles.item} ${styles.latency} ${latencyClass(stats.avgLatency)}`}
          title="Average response latency"
        >
          ⏱ avg {stats.avgLatency}ms
        </span>
      )}
    </div>
  );
}

function Dot({ color }) {
  return (
    <span
      className={styles.dot}
      style={{ background: color === 'sage' ? 'var(--accent-sage)' : 'var(--accent-saffron)' }}
      aria-hidden="true"
    />
  );
}

function latencyClass(ms) {
  if (ms < 1000) return styles.fast;
  if (ms < 3000) return styles.medium;
  return styles.slow;
}
