import {
  AiProviderVideoRequest,
  AiProviderVideoResult,
} from "../types/ai.types";

export interface AiVideoProvider {
  readonly name: string;

  generateVideo(
    request: AiProviderVideoRequest,
  ): Promise<AiProviderVideoResult>;

  waitForVideo(
    operationName: string,
    signal?: AbortSignal,
  ): Promise<AiProviderVideoResult>;

  cancelVideo?(
    operationName: string,
  ): Promise<void>;
}