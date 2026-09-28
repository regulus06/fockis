import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import { RedisService } from "../../redis/redis.service";

import { AiCreditsService } from "./ai-credits.service";
import { AiJobService } from "./ai-job.service";

import { CreateAiJobDto } from "../dto/create-ai-job.dto";

@Injectable()
export class AiService {
  private readonly queue =
    "fockis:ai:video";

  constructor(
    private readonly jobs: AiJobService,
    private readonly credits: AiCreditsService,
    private readonly redis: RedisService,
  ) {}

  async createJob(
    userId: string,
    dto: CreateAiJobDto,
  ) {
    if (
      dto.type !== "video"
    ) {
      throw new BadRequestException(
        "The production AI worker currently supports video generation.",
      );
    }

    const prompt =
      dto.prompt?.trim();

    if (
      !prompt ||
      prompt.length < 3
    ) {
      throw new BadRequestException(
        "A video prompt is required.",
      );
    }

    if (
      prompt.length > 10000
    ) {
      throw new BadRequestException(
        "Video prompt is too long.",
      );
    }

    const duration =
      Number(
        dto.options
          ?.durationSeconds,
      );

    if (
      !Number.isFinite(
        duration,
      ) ||
      !Number.isInteger(
        duration,
      ) ||
      duration < 15 ||
      duration > 1200
    ) {
      throw new BadRequestException(
        "Video duration must be between 15 and 1200 seconds.",
      );
    }

    const aspectRatio =
      dto.options
        ?.aspectRatio;

    if (
      aspectRatio !== undefined &&
      aspectRatio !== "16:9" &&
      aspectRatio !== "9:16"
    ) {
      throw new BadRequestException(
        "Aspect ratio must be 16:9 or 9:16.",
      );
    }

    /**
     * Optional image-to-video input.
     */
    const imageGcsUri =
      dto.options
        ?.imageGcsUri
        ?.trim();

    const imageMimeType =
      dto.options
        ?.imageMimeType
        ?.trim();

    if (
      imageGcsUri &&
      !imageGcsUri.startsWith(
        "gs://",
      )
    ) {
      throw new BadRequestException(
        "The AI starting image must use a Google Cloud Storage URI.",
      );
    }

    if (
      imageGcsUri &&
      !imageMimeType
    ) {
      throw new BadRequestException(
        "The AI starting image MIME type is required.",
      );
    }

    const creditsRequired =
      Math.ceil(
        duration / 8,
      );

    await this.credits.reserve(
      userId,
      creditsRequired,
    );

    try {
      const job =
        await this.jobs.create({
          userId,

          type:
            dto.type,

          prompt,

          model:
            dto.model ||
            "auto",

          options: {
            ...(dto.options ||
              {}),

            durationSeconds:
              duration,

            aspectRatio:
              aspectRatio ||
              "16:9",

            ...(imageGcsUri
              ? {
                  imageGcsUri,
                  imageMimeType,
                }
              : {}),
          },

          creditsReserved:
            creditsRequired,
        });

      await this.redis.client.rpush(
        this.queue,
        job.id,
      );

      return job;
    } catch (error) {
      await this.credits.release(
        userId,
        creditsRequired,
      );

      throw error;
    }
  }

  async getCredits(
    userId: string,
  ) {
    return this.credits.getBalance(
      userId,
    );
  }

  async getHistory(
    userId: string,
  ) {
    return this.jobs.findForUser(
      userId,
    );
  }

  async getJob(
    userId: string,
    jobId: string,
  ) {
    return this.jobs.findOneForUser(
      userId,
      jobId,
    );
  }

  async cancelJob(
    userId: string,
    jobId: string,
  ) {
    const before =
      await this.jobs.getRaw(
        jobId,
      );

    if (
      !before ||
      String(before.userId) !==
        userId
    ) {
      return this.jobs.cancel(
        userId,
        jobId,
      );
    }

    if (
      before.status ===
      "queued"
    ) {
      await this.credits.release(
        userId,
        before.creditsReserved,
      );
    }

    return this.jobs.cancel(
      userId,
      jobId,
    );
  }
}