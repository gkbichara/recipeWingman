import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useVoiceRecorder
 * Encapsulates all MediaRecorder + AudioContext logic.
 * Returns controls and state — no UI assumptions.
 *
 * Usage:
 *   const { state, amplitude, start, stop } = useVoiceRecorder({ onBlob });
 *
 * state: 'idle' | 'recording' | 'processing' | 'error'
 * amplitude: 0–1 float, updates ~60fps while recording
 * start(): request mic + begin recording
 * stop(): stop recording and emit blob via onBlob(blob)
 * error: string | null
 */
export function useVoiceRecorder({ onBlob }) {
  const [state, setState] = useState('idle');
  const [amplitude, setAmplitude] = useState(0);
  const [error, setError] = useState(null);

  const recorderRef  = useRef(null);
  const streamRef    = useRef(null);
  const chunksRef    = useRef([]);
  const analyserRef  = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef  = useRef(null);

  // Clean up everything on unmount
  useEffect(() => () => teardown(), []);

  const teardown = () => {
    cancelAnimationFrame(animFrameRef.current);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    setAmplitude(0);
  };

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    setError(null);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone in your browser settings.'
        : 'Could not access microphone.';
      setError(msg);
      setState('idle');
      return;
    }

    streamRef.current = stream;

    // ── Amplitude analysis ──────────────────────────
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setAmplitude(Math.min(1, avg / 100));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // Amplitude visualization is non-critical; continue without it
    }

    // ── Recording ───────────────────────────────────
    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data?.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      cancelAnimationFrame(animFrameRef.current);
      setAmplitude(0);
      stream.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close().catch(() => {});

      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

      if (blob.size < 1000) {
        // Recording was too short (< ~0.1s)
        setState('idle');
        return;
      }

      setState('processing');
      Promise.resolve(onBlob(blob))
        .catch(err => {
          setError(err?.message ?? 'Voice processing failed.');
        })
        .finally(() => setState('idle'));
    };

    recorder.onerror = () => {
      setError('Recording failed unexpectedly.');
      setState('idle');
    };

    recorder.start(100); // collect chunks every 100ms
    recorderRef.current = recorder;
    setState('recording');
  }, [state, onBlob]);

  const stop = useCallback(() => {
    if (state !== 'recording') return;
    recorderRef.current?.stop();
    // onstop handler takes it from here
  }, [state]);

  return { state, amplitude, error, start, stop };
}

// Pick the best supported audio MIME type for the current browser
function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  return candidates.find(t => MediaRecorder.isTypeSupported(t)) ?? null;
}