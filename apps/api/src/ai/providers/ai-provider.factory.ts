import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

import type {
  AiVideoProvider,
} from "./ai-provider.interface";

@Injectable()
export class AiProviderFactory {
  constructor(
    @Inject("AI_VIDEO_PROVIDER")
    private readonly videoProvider:
      AiVideoProvider,
  ) {}

  getVideoProvider():
    AiVideoProvider {
    if (
      !this.videoProvider
    ) {
      throw new InternalServerErrorException(
        "Google Veo video provider is not configured.",
      );
    }

    return this.videoProvider;
  }
}