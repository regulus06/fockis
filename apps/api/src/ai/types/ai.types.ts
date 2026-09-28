export type AiToolType =
  | "video"
  | "music"
  | "image"
  | "design"
  | "voice"
  | "document"
  | "translation";

export type AiJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type AiVideoModel =
  | "auto"
  | "standard"
  | "quality";

export type AiVideoAspectRatio =
  | "16:9"
  | "9:16";

export interface AiVideoOptions {
  durationSeconds: number;

  aspectRatio?: AiVideoAspectRatio;

  style?: string;

  voiceover?: boolean;

  captions?: boolean;

  music?: boolean;

  /**
   * Optional starting image stored in Google Cloud Storage.
   *
   * Example:
   *
   * gs://fockis-ai-media-2026/fockis-ai/jobs/<jobId>/input/image.jpg
   */
  imageGcsUri?: string;

  /**
   * MIME type of the starting image.
   *
   * Examples:
   * image/jpeg
   * image/png
   * image/webp
   */
  imageMimeType?: string;
}

export interface AiJobProgress {
  phase:
    | "queued"
    | "planning"
    | "generating"
    | "assembling"
    | "finalizing"
    | "completed"
    | "failed"
    | "cancelled";

  completedScenes: number;

  totalScenes: number;

  currentScene?: number;

  percentage: number;

  message?: string;
}

export interface AiProviderVideoRequest {
  prompt: string;

  model: string;

  aspectRatio: AiVideoAspectRatio;

  durationSeconds: 4 | 6 | 8;

  outputGcsUri: string;

  /**
   * Optional starting image.
   *
   * The worker sends this only for the first scene.
   */
  imageGcsUri?: string;

  imageMimeType?: string;

  seed?: number;
}

export interface AiProviderVideoResult {
  operationName: string;

  outputGcsUri?: string;

  provider: string;

  model: string;
}

export interface AiJobResult {
  resultUrl?: string;

  thumbnailUrl?: string;

  durationSeconds?: number;

  sceneCount?: number;
}

export interface AiQueueJob {
  jobId: string;
}

export interface AiUserLike {
  id?: string;

  _id?: string;

  userId?: string;

  sub?: string;
}