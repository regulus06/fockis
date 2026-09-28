import { useCallback, useRef, useState } from 'react';
import { downsampleFrequencyData, isMicrophoneSupported } from '../utils/audioHelpers';
import { createTrackedObjectUrl, revokeTrackedObjectUrl } from '../utils/fileHelpers';

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'preview' | 'denied' | 'error';

export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [liveWaveform, setLiveWaveform] = useState<number[]>(Array(32).fill(0.1));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);

  const stopTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const tickWaveform = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    setLiveWaveform(downsampleFrequencyData(data, 32));
    animationRef.current = requestAnimationFrame(tickWaveform);
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);
    if (!isMicrophoneSupported()) {
      setStatus('error');
      setErrorMessage('Voice recording is not supported in this browser.');
      return;
    }
    setStatus('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      audioCtxRef.current = audioCtx;
      analyserRef.current = analyser;

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;

      setStatus('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      tickWaveform();
    } catch (err) {
      setStatus('denied');
      setErrorMessage('Microphone access was denied. Enable it in your browser settings to record voice messages.');
    }
  }, [tickWaveform]);

  const cleanupStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    analyserRef.current = null;
  };

  const pause = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      stopTimers();
      setStatus('paused');
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
      tickWaveform();
      setStatus('recording');
    }
  }, [tickWaveform]);

  const stop = useCallback(() => {
    return new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        resolve();
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = createTrackedObjectUrl(blob);
        setPreviewBlob(blob);
        setPreviewUrl(url);
        setStatus('preview');
        stopTimers();
        cleanupStream();
        resolve();
      };
      recorder.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    mediaRecorderRef.current?.stop();
    stopTimers();
    cleanupStream();
    if (previewUrl) revokeTrackedObjectUrl(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setDuration(0);
    setStatus('idle');
  }, [previewUrl]);

  const reset = useCallback(() => {
    if (previewUrl) revokeTrackedObjectUrl(previewUrl);
    setPreviewUrl(null);
    setPreviewBlob(null);
    setDuration(0);
    setStatus('idle');
    setErrorMessage(null);
  }, [previewUrl]);

  return {
    status,
    duration,
    liveWaveform,
    previewUrl,
    previewBlob,
    errorMessage,
    start,
    pause,
    resume,
    stop,
    cancel,
    reset,
  };
}
