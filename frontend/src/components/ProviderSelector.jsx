import React, { useState } from 'react';
import { setConfig } from '../api';
import styles from './ProviderSelector.module.css';

const OPTIONS = {
  stt: [
    { value: 'whisper',  label: 'Whisper' },
    { value: 'google',   label: 'Google STT' },
    { value: 'deepgram', label: 'Deepgram' },
  ],
  llm: [
    { value: 'gpt4o',   label: 'GPT-4o' },
    { value: 'gemini',  label: 'Gemini' },
    { value: 'llama3',  label: 'Llama 3' },
  ],
  tts: [
    { value: 'google',     label: 'Google TTS' },
    { value: 'elevenlabs', label: 'ElevenLabs' },
  ],
};

/**
 * ProviderSelector
 * Compact dropdowns for STT / LLM / TTS providers.
 * Calls backend /api/config on change.
 *
 * Props:
 *   providers: { stt, llm, tts }
 *   onChange(newProviders): updates parent state
 */
export default function ProviderSelector({ providers, onChange }) {
  const [saving, setSaving] = useState(false);

  const handleChange = async (key, value) => {
    const next = { ...providers, [key]: value };
    onChange(next);
    setSaving(true);
    try {
      await setConfig(next);
    } catch {
      // Config save failed silently — provider still updates in UI
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.row} aria-label="Provider configuration">
      {Object.entries(OPTIONS).map(([key, opts]) => (
        <label key={key} className={styles.field}>
          <span className={styles.label}>{key.toUpperCase()}</span>
          <select
            className={styles.select}
            value={providers[key] ?? opts[0].value}
            onChange={e => handleChange(key, e.target.value)}
            disabled={saving}
            aria-label={`Select ${key} provider`}
          >
            {opts.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      ))}

      {saving && <span className={styles.saving}>saving…</span>}
    </div>
  );
}
