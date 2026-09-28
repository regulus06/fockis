import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { AiProviderFactory } from "../providers/ai-provider.factory";

import {
  AiVideoAspectRatio,
  AiVideoModel,
} from "../types/ai.types";

@Injectable()
export class AiVideoService {
  constructor(
    private readonly providerFactory: AiProviderFactory,
  ) {}

  getModel(
    requested: AiVideoModel = "auto",
  ): string {
    switch (requested) {
      case "quality":
        return (
          process.env.GOOGLE_VEO_QUALITY_MODEL ||
          "veo-3.1-generate-001"
        );

      case "standard":
        return (
          process.env.GOOGLE_VEO_STANDARD_MODEL ||
          "veo-3.1-fast-generate-001"
        );

      case "auto":
      default:
        return (
          process.env.GOOGLE_VEO_AUTO_MODEL ||
          "veo-3.1-fast-generate-001"
        );
    }
  }

  calculateSceneCount(
    durationSeconds: number,
  ): number {
    if (
      !Number.isFinite(
        durationSeconds,
      ) ||
      durationSeconds < 15 ||
      durationSeconds > 1200
    ) {
      throw new BadRequestException(
        "Video duration must be between 15 and 1200 seconds.",
      );
    }

    return Math.ceil(
      durationSeconds / 8,
    );
  }

  getSceneDuration(
    remainingSeconds: number,
  ): 4 | 6 | 8 {
    if (
      remainingSeconds >= 8
    ) {
      return 8;
    }

    if (
      remainingSeconds >= 6
    ) {
      return 6;
    }

    return 4;
  }

  async generateScene(input: {
    prompt: string;

    model: AiVideoModel;

    aspectRatio: AiVideoAspectRatio;

    durationSeconds:
      | 4
      | 6
      | 8;

    outputGcsUri: string;

    /**
     * Optional starting image.
     *
     * The worker should provide this only
     * for the first scene.
     */
    imageGcsUri?: string;

    imageMimeType?: string;
  }) {
    if (
      !input.prompt ||
      input.prompt.trim().length < 3
    ) {
      throw new BadRequestException(
        "A valid video prompt is required.",
      );
    }

    if (
      input.imageGcsUri &&
      !input.imageGcsUri.startsWith(
        "gs://",
      )
    ) {
      throw new BadRequestException(
        "AI starting image must be a valid gs:// URI.",
      );
    }

    const provider =
      this.providerFactory.getVideoProvider();

    return provider.generateVideo({
      prompt:
        input.prompt.trim(),

      model:
        this.getModel(
          input.model,
        ),

      aspectRatio:
        input.aspectRatio,

      durationSeconds:
        input.durationSeconds,

      outputGcsUri:
        input.outputGcsUri,

      ...(input.imageGcsUri
        ? {
            imageGcsUri:
              input.imageGcsUri,

            imageMimeType:
              input.imageMimeType ||
              "image/jpeg",
          }
        : {}),
    });
  }

  async waitForScene(
    operationName: string,
    signal?: AbortSignal,
  ) {
    const provider =
      this.providerFactory.getVideoProvider();

    return provider.waitForVideo(
      operationName,
      signal,
    );
  }
}