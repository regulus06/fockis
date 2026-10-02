import { useEffect } from 'react';
import { Trash2, Send, Pause, Play, Mic } from 'lucide-react';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { formatDuration } from '../utils/dateHelpers';
import VoiceWaveform from './VoiceWaveform';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const recorder = useVoiceRecorder();

  useEffect(() => {
    recorder.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (recorder.status === 'denied' || recorder.status === 'error') {
    return (
      <div className="voice-recorder voice-recorder--error">
        <Mic size={18} />
        <span>{recorder.errorMessage}</span>
        <button type="button" onClick={onCancel}>Close</button>
      </div>
    );
  }

  if (recorder.status === 'preview') {
    return (
      <div className="voice-recorder voice-recorder--preview">
        <button type="button" className="voice-recorder__icon-btn is-danger" onClick={() => { recorder.reset(); onCancel(); }} aria-label="Delete">
          <Trash2 size={18} />
        </button>
        <VoiceWaveform bars={Array(32).fill(0.5)} animated={false} />
        <span className="voice-recorder__timer">{formatDuration(recorder.duration)}</span>
        <button
          type="button"
          className="voice-recorder__icon-btn voice-recorder__send-btn"
          onClick={() => {
            if (recorder.previewBlob) onSend(recorder.previewBlob, recorder.duration);
          }}
          aria-label="Send voice message"
        >
          <Send size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="voice-recorder voice-recorder--recording">
      <button type="button" className="voice-recorder__icon-btn is-danger" onClick={() => { recorder.cancel(); onCancel(); }} aria-label="Cancel recording">
        <Trash2 size={18} />
      </button>
      <span className="voice-recorder__pulse" />
      <VoiceWaveform bars={recorder.liveWaveform} animated />
      <span className="voice-recorder__timer">{formatDuration(recorder.duration)}</span>
      {recorder.status === 'recording' ? (
        <button type="button" className="voice-recorder__icon-btn" onClick={recorder.pause} aria-label="Pause">
          <Pause size={18} />
        </button>
      ) : (
        <button type="button" className="voice-recorder__icon-btn" onClick={recorder.resume} aria-label="Resume">
          <Play size={18} />
        </button>
      )}
      <button
        type="button"
        className="voice-recorder__icon-btn voice-recorder__send-btn"
        onClick={async () => {
          await recorder.stop();
        }}
        aria-label="Stop and preview"
      >
        <Send size={18} />
      </button>
    </div>
  );
}
