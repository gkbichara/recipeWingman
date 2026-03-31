import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './VoiceButton.module.css';

/**
 * VoiceButton
 * Hold to record voice. Releases and sends audio blob to onResult.
 *
 * Props:
 *   onResult(audioBlob): called when recording stops with the audio blob
 *   disabled: bool
 */
export default function VoiceButton({ onResult, disabled }) {
  const [state, setState] = useState('idle'); // 'idle' | 'recording' | 'processing'
  const [amplitude, setAmplitude] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, []);

  const stopAll = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const startRecording = useCallback(async () => {
    if (disabled || state !== 'idle') return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up analyser for amplitude visualization
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Animate amplitude
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAmplitude(avg / 128); // normalize to 0–1
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();

      // Start recording
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        cancelAnimationFrame(animFrameRef.current);
        setAmplitude(0);
        setState('processing');
        onResult(blob).finally(() => setState('idle'));
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch (err) {
      console.error('Microphone access denied:', err);
      setState('idle');
    }
  }, [disabled, state, onResult]);

  const stopRecording = useCallback(() => {
    if (state !== 'recording') return;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
  }, [state]);

  // Support both mouse and touch
  const handlePointerDown = (e) => {
    e.preventDefault();
    startRecording();
  };

  const handlePointerUp = (e) => {
    e.preventDefault();
    stopRecording();
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  // Scale the ring with amplitude
  const ringScale = isRecording ? 1 + amplitude * 0.5 : 1;
  const ringOpacity = isRecording ? 0.3 + amplitude * 0.5 : 0;

  return (
    <div className={styles.wrapper}>
      {/* Animated amplitude ring */}
      <div
        className={styles.ring}
        style={{
          transform: `scale(${ringScale})`,
          opacity: ringOpacity,
        }}
      />

      <button
        className={`${styles.btn} ${isRecording ? styles.btnRecording : ''} ${isProcessing ? styles.btnProcessing : ''}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        disabled={disabled || isProcessing}
        aria-label={
          isRecording ? 'Release to send voice message' :
          isProcessing ? 'Processing…' :
          'Hold to speak'
        }
        title={isRecording ? 'Release to send' : 'Hold to speak'}
      >
        {isProcessing ? (
          <span className={styles.spinner} />
        ) : (
          <MicIcon active={isRecording} />
        )}
      </button>

      {/* Tooltip */}
      <span className={styles.tooltip}>
        {isRecording ? 'Release to send' : isProcessing ? 'Processing…' : 'Hold to speak'}
      </span>
    </div>
  );
}

function MicIcon({ active }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      className={active ? styles.micActive : styles.mic}
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
