import type { Attachment } from '../types';

let counter = 0;
const nextId = () => `att-${++counter}`;

export const mockImageAttachment = (seed: string, caption?: string): Attachment => ({
  id: nextId(),
  kind: 'image',
  url: `https://picsum.photos/seed/${seed}/800/600`,
  name: `${seed}.jpg`,
  size: 482_000,
  mimeType: 'image/jpeg',
  width: 800,
  height: 600,
  caption,
});

export const mockVideoAttachment = (seed: string): Attachment => ({
  id: nextId(),
  kind: 'video',
  url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  thumbnailUrl: `https://picsum.photos/seed/${seed}/800/450`,
  name: `${seed}.mp4`,
  size: 3_200_000,
  mimeType: 'video/mp4',
  width: 800,
  height: 450,
  duration: 14,
});

export const mockDocumentAttachment = (name: string, mimeType: string, size: number): Attachment => ({
  id: nextId(),
  kind: 'document',
  url: '#',
  name,
  size,
  mimeType,
});

export const mockAudioAttachment = (durationSec: number): Attachment => ({
  id: nextId(),
  kind: 'audio',
  url: '',
  name: 'voice-message.webm',
  size: durationSec * 4200,
  mimeType: 'audio/webm',
  duration: durationSec,
  waveform: Array.from({ length: 40 }, () => Math.random() * 0.8 + 0.2),
});
