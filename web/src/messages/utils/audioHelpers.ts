/** Generates a pseudo-random waveform for demo/preview purposes. */
export function generateWaveform(bars = 40): number[] {
  return Array.from({ length: bars }, () => Math.random() * 0.75 + 0.15);
}

/** Downsamples raw analyser data into a fixed number of bars for the live-recording waveform. */
export function downsampleFrequencyData(data: Uint8Array, bars: number): number[] {
  const chunkSize = Math.floor(data.length / bars) || 1;
  const result: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    let sum = 0;
    const start = i * chunkSize;
    for (let j = start; j < start + chunkSize && j < data.length; j += 1) {
      sum += data[j];
    }
    result.push(Math.min(1, sum / chunkSize / 255));
  }
  return result;
}

export function isMicrophoneSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
}
