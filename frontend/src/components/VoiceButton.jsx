import React, { useState, useRef, useCallback } from 'react';
import './VoiceButton.css';

const SILENCE_RMS_THRESHOLD = 0.015;
const INITIAL_GRACE_MS = 10000;
const POST_SPEECH_SILENCE_MS = 10000;
const SILENCE_CHECK_INTERVAL_MS = 100;
const MIN_BLOB_BYTES = 1000;

export default function VoiceButton({ onResult, disabled, onStartRecording }) {
  const [state, setState] = useState('idle');
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const silenceCheckRef = useRef(null);

  const teardownSilenceDetection = useCallback(() => {
    if (silenceCheckRef.current) {
      clearInterval(silenceCheckRef.current);
      silenceCheckRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return;
    onStartRecording?.();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) || '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      if (audioContext.state === 'suspended') {
        try { await audioContext.resume(); } catch { /* ignore */ }
      }
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      const muteGain = audioContext.createGain();
      muteGain.gain.value = 0;
      source.connect(analyser);
      analyser.connect(muteGain);
      muteGain.connect(audioContext.destination);
      const samples = new Float32Array(analyser.fftSize);

      const recordingStartedAt = Date.now();
      let firstSoundAt = null;
      let lastSoundAt = null;

      recorder.ondataavailable = (e) => {
        if (e.data?.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        teardownSilenceDetection();
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

        if (blob.size < MIN_BLOB_BYTES) {
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

      silenceCheckRef.current = setInterval(() => {
        if (!recorderRef.current || recorderRef.current.state !== 'recording') return;

        analyser.getFloatTimeDomainData(samples);
        let sumSquares = 0;
        for (let i = 0; i < samples.length; i++) {
          sumSquares += samples[i] * samples[i];
        }
        const rms = Math.sqrt(sumSquares / samples.length);

        const now = Date.now();
        if (rms > SILENCE_RMS_THRESHOLD) {
          if (firstSoundAt === null) firstSoundAt = now;
          lastSoundAt = now;
        }

        const shouldAutoStop = firstSoundAt === null
          ? now - recordingStartedAt >= INITIAL_GRACE_MS
          : now - lastSoundAt >= POST_SPEECH_SILENCE_MS;

        if (shouldAutoStop) {
          recorderRef.current.stop();
        }
      }, SILENCE_CHECK_INTERVAL_MS);
    } catch {
      teardownSilenceDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setState('idle');
    }
  }, [disabled, state, onResult, onStartRecording, teardownSilenceDetection]);

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
