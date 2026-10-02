import type { AiJob } from "./aiTypes";

export interface AiVideoInput extends Record<string, unknown> {
  prompt: string;

  durationSeconds: number;

  model?: string;

  aspectRatio?: "16:9" | "9:16" | "1:1";

  style?: string;

  voiceover?: boolean;

  captions?: boolean;

  music?: boolean;
}

export interface VideoScene {
  id: string;

  index: number;

  title: string;

  description: string;

  durationSeconds: number;

  status?: "pending" | "processing" | "completed" | "failed";

  thumbnailUrl?: string;

  videoUrl?: string;
}

export interface VideoProject {
  id: string;

  title: string;

  durationSeconds: number;

  scenes: VideoScene[];

  job?: AiJob;
}