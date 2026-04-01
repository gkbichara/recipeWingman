import React, { useState, useRef, useCallback } from 'react';
import './VoiceButton.css';

export default function VoiceButton({ onResult, disabled }) {
  const [state, setState] = useState('idle');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

        if (blob.size < 1000) {
          setState('idle');
          return;
        }

        setState('processing');
        Promise.resolve(onResult(blob))
          .catch(() => {})
          .finally(() => setState('idle'));
      };

      recorder.start(100);
      recorderRef.current = recorder;
      setState('recording');
    } catch {
      setState('idle');
    }
  }, [disabled, state, onResult]);

  const stopRecording = useCallback(() => {
    if (state !== 'recording') return;
    recorderRef.current?.stop();
  }, [state]);

  const handleClick = () => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'idle') {
      startRecording();
    }
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <button
      className={`voice-btn ${isRecording ? 'voice-btn-recording' : ''} ${isProcessing ? 'voice-btn-processing' : ''}`}
      onClick={handleClick}
      disabled={disabled || isProcessing}
      title={isRecording ? 'Click to stop' : isProcessing ? 'Processing...' : 'Click to speak'}
    >
      {isProcessing ? (
        <span className="voice-spinner" />
      ) : (
        <MicIcon active={isRecording} />
      )}
    </button>
  );
}

function MicIcon({ active }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? 'mic-active' : ''}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
