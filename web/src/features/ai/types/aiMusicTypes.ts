export interface AiMusicInput extends Record<string, unknown> {
  prompt: string;

  durationSeconds: number;

  style?: string;

  mood?: string;

  vocals?: boolean;

  instrumental?: boolean;

  model?: string;
}

export interface MusicResult {
  id: string;

  title: string;

  audioUrl?: string;

  coverUrl?: string;

  durationSeconds?: number;
}