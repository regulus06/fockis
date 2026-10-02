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

export interface AiJob {
  id: string;
  type: AiToolType;
  status: AiJobStatus;
  progress?: number;
  prompt?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AiCredits {
  balance: number;
  monthlyAllowance?: number;
  usedThisPeriod?: number;
  resetAt?: string;
}

export interface CreateAiJobInput {
  type: AiToolType;
  prompt: string;
  model?: string;
  options?: Record<string, unknown>;
}

export interface AiModel {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  creditsPerJob?: number;
}

export interface AiGenerationState {
  loading: boolean;
  jobId?: string;
  error?: string;
  result?: AiJob;
}
