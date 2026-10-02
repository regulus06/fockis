interface VoiceWaveformProps {
  bars: number[];
  progress?: number;
  animated?: boolean;
}

export default function VoiceWaveform({ bars, progress = 0, animated = false }: VoiceWaveformProps) {
  return (
    <div className={`voice-waveform ${animated ? 'voice-waveform--animated' : ''}`}>
      {bars.map((height, i) => {
        const isPlayed = (i / bars.length) * 100 <= progress;
        return (
          <span
            key={i}
            className={`voice-waveform__bar ${isPlayed ? 'is-played' : ''}`}
            style={{ height: `${Math.max(12, height * 100)}%` }}
          />
        );
      })}
    </div>
  );
}
