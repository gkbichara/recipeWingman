import React, { useState } from 'react';
import { runBenchmark } from '../api';
import styles from './BenchmarkPanel.module.css';

const BENCHMARKS = [
  {
    key: 'stt',
    label: 'STT',
    icon: '🎙',
    description: 'Whisper vs Google vs Deepgram — WER & latency',
    metrics: ['WER (%)', 'Latency (ms)'],
  },
  {
    key: 'llm',
    label: 'LLM',
    icon: '🧠',
    description: 'GPT-4o vs Gemini vs Llama 3 — accuracy & speed',
    metrics: ['ROUGE-L', 'Accuracy (%)', 'Latency (ms)'],
  },
  {
    key: 'tts',
    label: 'TTS',
    icon: '🔊',
    description: 'ElevenLabs vs Google TTS — synthesis latency',
    metrics: ['Latency (ms)', 'TTFB (ms)'],
  },
  {
    key: 'pipeline',
    label: 'Full Pipeline',
    icon: '⚡',
    description: 'End-to-end silence-to-speech with best components',
    metrics: ['Total Latency (ms)', 'Answer Accuracy (%)'],
  },
];

/**
 * BenchmarkPanel
 * Modal overlay. Lets you trigger any benchmark and see tabular results.
 *
 * Props:
 *   onClose(): called when dismissed
 */
export default function BenchmarkPanel({ onClose }) {
  const [running, setRunning] = useState(null); // key of running benchmark
  const [results, setResults] = useState({});   // { [key]: result object }
  const [errors, setErrors]   = useState({});

  const handleRun = async (key) => {
    setRunning(key);
    setErrors(e => ({ ...e, [key]: null }));
    try {
      const result = await runBenchmark(key);
      setResults(r => ({ ...r, [key]: result }));
    } catch (err) {
      setErrors(e => ({ ...e, [key]: 'Benchmark failed. Is the backend running?' }));
    } finally {
      setRunning(null);
    }
  };

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.backdrop} onClick={handleBackdropClick} role="dialog" aria-modal="true" aria-label="Benchmark panel">
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Benchmarks</h2>
            <p className={styles.subtitle}>Run component-isolation benchmarks. Each test fixes all other components.</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close benchmark panel">✕</button>
        </div>

        {/* Benchmark cards */}
        <div className={styles.grid}>
          {BENCHMARKS.map((bench) => (
            <BenchmarkCard
              key={bench.key}
              bench={bench}
              result={results[bench.key]}
              error={errors[bench.key]}
              isRunning={running === bench.key}
              isDisabled={running !== null && running !== bench.key}
              onRun={() => handleRun(bench.key)}
            />
          ))}
        </div>

        <p className={styles.note}>
          Results are saved to <code>benchmarks/results/</code> and can be analyzed in <code>notebooks/benchmark_analysis.ipynb</code>.
        </p>
      </div>
    </div>
  );
}

// ── Individual benchmark card ───────────────────────────────
function BenchmarkCard({ bench, result, error, isRunning, isDisabled, onRun }) {
  return (
    <div className={`${styles.card} ${isRunning ? styles.cardRunning : ''}`}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{bench.icon}</span>
        <div>
          <h3 className={styles.cardTitle}>{bench.label}</h3>
          <p className={styles.cardDesc}>{bench.description}</p>
        </div>
      </div>

      {/* Metrics expected */}
      <div className={styles.metricChips}>
        {bench.metrics.map(m => (
          <span key={m} className={styles.metricChip}>{m}</span>
        ))}
      </div>

      {/* Error */}
      {error && <div className={styles.cardError}>{error}</div>}

      {/* Results table */}
      {result && <ResultTable result={result} />}

      {/* Run button */}
      <button
        className={styles.runBtn}
        onClick={onRun}
        disabled={isRunning || isDisabled}
      >
        {isRunning ? (
          <><span className={styles.spinner} /> Running…</>
        ) : result ? (
          '↺ Re-run'
        ) : (
          '▶ Run benchmark'
        )}
      </button>
    </div>
  );
}

// ── Result display ──────────────────────────────────────────
function ResultTable({ result }) {
  // result is a free-form object from the backend — render key/value pairs
  const entries = Object.entries(result).filter(([k]) => k !== 'raw');

  if (entries.length === 0) return null;

  return (
    <div className={styles.resultTable}>
      {entries.map(([key, val]) => (
        <div key={key} className={styles.resultRow}>
          <span className={styles.resultKey}>{humanize(key)}</span>
          <span className={styles.resultVal}>{formatVal(val)}</span>
        </div>
      ))}
    </div>
  );
}

function humanize(str) {
  return str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatVal(val) {
  if (typeof val === 'number') return Number.isInteger(val) ? val : val.toFixed(3);
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}
