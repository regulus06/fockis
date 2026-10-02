export interface AiImageInput extends Record<string, unknown> {
  prompt: string;

  model?: string;

  aspectRatio?: "1:1" | "16:9" | "9:16" | "4:5";

  style?: string;

  count?: number;
}

export interface ImageResult {
  id: string;

  imageUrl: string;

  thumbnailUrl?: string;
}