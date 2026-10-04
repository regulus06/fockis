import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import { Storage } from "@google-cloud/storage";

import { randomUUID } from "crypto";

import { promises as fs } from "fs";

import * as path from "path";

import {
  RedisService,
} from "../../redis/redis.service";

import {
  AiJobService,
} from "../services/ai-job.service";

import {
  AiVideoService,
} from "../services/ai-video.service";

import {
  AiCreditsService,
} from "../services/ai-credits.service";

@Injectable()
export class AiVideoWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger =
    new Logger(AiVideoWorker.name);

  private readonly queue =
    "fockis:ai:video";

  private running = true;

  private readonly storage =
    new Storage();

  private readonly bucketName =
    process.env
      .GOOGLE_CLOUD_STORAGE_BUCKET;

  private readonly maxConcurrent =
    Math.max(
      1,
      Number(
        process.env
          .AI_WORKER_CONCURRENCY || 1,
      ),
    );

  private activeJobs = 0;

  constructor(
    private readonly redis: RedisService,
    private readonly jobs: AiJobService,
    private readonly videos: AiVideoService,
    private readonly credits: AiCreditsService,
  ) {}

  onModuleInit() {
    if (!this.bucketName) {
      this.logger.error(
        "GOOGLE_CLOUD_STORAGE_BUCKET is not configured.",
      );

      return;
    }

    for (
      let i = 0;
      i < this.maxConcurrent;
      i++
    ) {
      void this.consume();
    }

    this.logger.log(
      `AI video worker started with concurrency=${this.maxConcurrent}`,
    );
  }

  onModuleDestroy() {
    this.running = false;
  }

  /**
   * Continuously consume AI video jobs from Redis.
   *
   * IMPORTANT:
   * Never call BRPOP while Redis is disconnected.
   *
   * This prevents:
   *
   * "Stream isn't writable and enableOfflineQueue options is false"
   *
   * from repeatedly crashing the worker loop.
   */
  private async consume() {
    while (this.running) {
      if (
        this.activeJobs >=
        this.maxConcurrent
      ) {
        await this.sleep(1000);
        continue;
      }

      /*
       * Check the actual ioredis connection state before
       * attempting BRPOP.
       *
       * RedisService exposes the ioredis client, so using
       * client.status here keeps this worker independent of
       * an additional RedisService helper method.
       */
      if (
        this.redis.client.status !==
        "ready"
      ) {
        await this.sleep(3000);
        continue;
      }

      try {
        const item =
          await this.redis.client.brpop(
            this.queue,
            5,
          );

        if (!item) {
          continue;
        }

        const [, jobId] = item;

        if (!jobId) {
          continue;
        }

        this.activeJobs++;

        try {
          await this.process(jobId);
        } finally {
          this.activeJobs--;
        }
      } catch (error) {
        /*
         * Redis can disconnect while BRPOP is waiting.
         * Treat that as temporary infrastructure failure.
         */
        this.logger.error(
          "AI worker loop error.",
          error instanceof Error
            ? error.stack
            : String(error),
        );

        await this.sleep(3000);
      }
    }
  }

  private async process(
    jobId: string,
  ) {
    const job =
      await this.jobs.claim(jobId);

    if (!job) {
      return;
    }

    const userId =
      String(job.userId);

    const localFiles: string[] = [];

    let finalPath:
      | string
      | undefined;

    try {
      if (
        job.type !==
        "video"
      ) {
        throw new Error(
          `AI type "${job.type}" is not implemented by the video worker.`,
        );
      }

      const options =
        job.options || {};

      const imageGcsUri =
        typeof options.imageGcsUri ===
          "string" &&
        options.imageGcsUri.trim()
          .length > 0
          ? options.imageGcsUri.trim()
          : undefined;

      const imageMimeType =
        typeof options.imageMimeType ===
          "string" &&
        options.imageMimeType.trim()
          .length > 0
          ? options.imageMimeType.trim()
          : undefined;

      const duration =
        Number(
          options.durationSeconds,
        );

      const aspectRatio =
        options.aspectRatio ===
        "9:16"
          ? "9:16"
          : "16:9";

      const model =
        job.model === "quality"
          ? "quality"
          : job.model ===
              "standard"
            ? "standard"
            : "auto";

      const sceneCount =
        this.videos.calculateSceneCount(
          duration,
        );

      await this.jobs.updateProgress(
        jobId,
        {
          phase: "generating",

          completedScenes: 0,

          totalScenes:
            sceneCount,

          percentage: 1,

          message:
            "Starting real Google Veo 3.1 generation.",
        },
      );

      let generatedSeconds = 0;

      for (
        let sceneIndex = 0;
        sceneIndex < sceneCount;
        sceneIndex++
      ) {
        const current =
          await this.jobs.getRaw(
            jobId,
          );

        if (!current) {
          throw new Error(
            "AI job no longer exists.",
          );
        }

        if (
          current.status ===
          "cancelled"
        ) {
          await this.releaseReservedCredits(
            userId,
            current.creditsReserved,
          );

          return;
        }

        const remaining =
          duration -
          generatedSeconds;

        const sceneDuration =
          this.videos.getSceneDuration(
            remaining,
          );

        const scenePath =
          await this.generateScene(
            jobId,
            sceneIndex,
            sceneDuration,
            job.prompt,
            model,
            aspectRatio,
            sceneIndex === 0
              ? imageGcsUri
              : undefined,
            sceneIndex === 0
              ? imageMimeType
              : undefined,
          );

        localFiles.push(
          scenePath,
        );

        generatedSeconds +=
          sceneDuration;

        const percentage =
          Math.min(
            90,
            Math.round(
              ((sceneIndex + 1) /
                sceneCount) *
                90,
            ),
          );

        await this.jobs.updateProgress(
          jobId,
          {
            phase: "generating",

            completedScenes:
              sceneIndex + 1,

            totalScenes:
              sceneCount,

            currentScene:
              sceneIndex + 1,

            percentage,

            message:
              `Generated scene ${
                sceneIndex + 1
              } of ${sceneCount}.`,
          },
        );
      }

      const afterGeneration =
        await this.jobs.getRaw(
          jobId,
        );

      if (
        afterGeneration?.status ===
        "cancelled"
      ) {
        await this.releaseReservedCredits(
          userId,
          afterGeneration.creditsReserved,
        );

        return;
      }

      await this.jobs.updateProgress(
        jobId,
        {
          phase: "assembling",

          completedScenes:
            sceneCount,

          totalScenes:
            sceneCount,

          percentage: 92,

          message:
            "Assembling the final video.",
        },
      );

      finalPath =
        await this.assembleWithFfmpeg(
          jobId,
          localFiles,
        );

      await this.jobs.updateProgress(
        jobId,
        {
          phase: "finalizing",

          completedScenes:
            sceneCount,

          totalScenes:
            sceneCount,

          percentage: 96,

          message:
            "Uploading the final video.",
        },
      );

      const finalObject =
        await this.publishFinalVideo(
          finalPath,
          jobId,
        );

      const consumedCredits =
        Math.max(
          1,
          Math.ceil(
            duration / 8,
          ),
        );

      await this.credits.consume(
        userId,
        job.creditsReserved,
        consumedCredits,
      );

      await this.jobs.complete(
        jobId,
        {
          resultUrl:
            finalObject.mediaPath,

          durationSeconds:
            generatedSeconds,

          sceneCount,

          provider:
            "google-veo-3.1",

          creditsConsumed:
            consumedCredits,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI video generation failed.";

      this.logger.error(
        `AI job ${jobId} failed: ${message}`,
      );

      const failed =
        await this.jobs.getRaw(
          jobId,
        );

      if (
        failed &&
        failed.status !==
          "completed" &&
        failed.status !==
          "cancelled"
      ) {
        await this.releaseReservedCredits(
          userId,
          failed.creditsReserved,
        );

        await this.jobs.fail(
          jobId,
          message,
        );
      }
    } finally {
      await this.cleanup(
        localFiles,
      );

      if (finalPath) {
        await this.cleanup([
          finalPath,
        ]);
      }
    }
  }

  private async generateScene(
    jobId: string,
    index: number,
    duration: 4 | 6 | 8,
    basePrompt: string,
    model:
      | "auto"
      | "standard"
      | "quality",
    aspectRatio:
      | "16:9"
      | "9:16",
    imageGcsUri?: string,
    imageMimeType?: string,
  ): Promise<string> {
    const bucket =
      this.storage.bucket(
        this.bucketName!,
      );

    const gcsPrefix =
      `fockis-ai/jobs/${jobId}/scenes/scene-${String(
        index + 1,
      ).padStart(4, "0")}`;

    const outputGcsUri =
      `gs://${this.bucketName}/${gcsPrefix}/`;

    const request =
      await this.videos.generateScene({
        prompt:
          this.buildScenePrompt(
            basePrompt,
            index,
          ),

        model,

        aspectRatio,

        durationSeconds:
          duration,

        outputGcsUri,

        ...(imageGcsUri
          ? {
              imageGcsUri,

              imageMimeType:
                imageMimeType ||
                "image/jpeg",
            }
          : {}),
      });

    await this.jobs.setProviderOperation(
      jobId,
      request.operationName,
    );

    const completed =
      await this.videos.waitForScene(
        request.operationName,
      );

    const uri =
      completed.outputGcsUri;

    if (!uri) {
      throw new Error(
        "Veo completed without a video URI.",
      );
    }

    const localDirectory =
      path.join(
        process.cwd(),
        "uploads",
        "ai",
        jobId,
      );

    await fs.mkdir(
      localDirectory,
      {
        recursive: true,
      },
    );

    const localPath =
      path.join(
        localDirectory,
        `scene-${String(
          index + 1,
        ).padStart(4, "0")}.mp4`,
      );

    await this.downloadGcsObject(
      uri,
      localPath,
    );

    /*
     * Verify the downloaded file
     * actually exists and has data.
     */
    const stat =
      await fs.stat(
        localPath,
      );

    if (
      !stat.isFile() ||
      stat.size === 0
    ) {
      throw new Error(
        "Generated Veo scene is empty.",
      );
    }

    void bucket;

    return localPath;
  }

  private buildScenePrompt(
    prompt: string,
    index: number,
  ) {
    return [
      prompt.trim(),

      "",

      `This is scene ${
        index + 1
      } of a continuous video.`,

      "Maintain consistent visual identity, environment, subject appearance, lighting, camera language, and cinematic style with the overall story.",

      "Use natural movement and physically plausible motion.",

      "Do not add subtitles, captions, logos, watermarks, UI, or text overlays unless explicitly requested.",

      "Do not describe the scene in text; generate the actual video content.",
    ].join("\n");
  }

  private async downloadGcsObject(
    uri: string,
    destination: string,
  ) {
    const match =
      uri.match(
        /^gs:\/\/([^/]+)\/(.+)$/,
      );

    if (!match) {
      throw new Error(
        `Invalid Google Cloud Storage URI: ${uri}`,
      );
    }

    const [
      ,
      bucketName,
      objectName,
    ] = match;

    await this.storage
      .bucket(bucketName)
      .file(objectName)
      .download({
        destination,
      });
  }

  private async assembleWithFfmpeg(
    jobId: string,
    files: string[],
  ): Promise<string> {
    if (
      files.length === 0
    ) {
      throw new Error(
        "No video scenes were generated.",
      );
    }

    const outputDirectory =
      path.join(
        process.cwd(),
        "uploads",
        "ai",
        jobId,
      );

    await fs.mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );

    const concatFile =
      path.join(
        outputDirectory,
        `concat-${randomUUID()}.txt`,
      );

    const contents =
      files
        .map(
          (file) =>
            `file '${file.replace(
              /'/g,
              "'\\''",
            )}'`,
        )
        .join("\n");

    await fs.writeFile(
      concatFile,
      contents,
      "utf8",
    );

    const output =
      path.join(
        outputDirectory,
        "final.mp4",
      );

    const {
      execFile,
    } = await import(
      "child_process"
    );

    const ffmpegPath =
      process.env.FFMPEG_PATH ||
      require("ffmpeg-static");

    await new Promise<void>(
      (
        resolve,
        reject,
      ) => {
        execFile(
          ffmpegPath,
          [
            "-y",

            "-f",
            "concat",

            "-safe",
            "0",

            "-i",
            concatFile,

            "-c:v",
            "libx264",

            "-preset",
            "medium",

            "-crf",
            "20",

            "-pix_fmt",
            "yuv420p",

            "-c:a",
            "aac",

            "-b:a",
            "192k",

            "-movflags",
            "+faststart",

            output,
          ],
          {
            maxBuffer:
              20 *
              1024 *
              1024,
          },
          (
            error,
            _stdout,
            stderr,
          ) => {
            if (error) {
              reject(
                new Error(
                  `FFmpeg assembly failed: ${
                    stderr ||
                    error.message
                  }`,
                ),
              );

              return;
            }

            resolve();
          },
        );
      },
    );

    await this.cleanup([
      concatFile,
    ]);

    return output;
  }

  private async publishFinalVideo(
    localPath: string,
    jobId: string,
  ) {
    if (!this.bucketName) {
      throw new Error(
        "GOOGLE_CLOUD_STORAGE_BUCKET is not configured.",
      );
    }

    const objectName =
      `fockis-ai/jobs/${jobId}/final/final.mp4`;

    const bucket =
      this.storage.bucket(
        this.bucketName,
      );

    await bucket.upload(
      localPath,
      {
        destination:
          objectName,

        resumable: true,

        metadata: {
          contentType:
            "video/mp4",

          cacheControl:
            "private,max-age=0,no-store",
        },
      },
    );

    /*
     * Store the real Google Cloud Storage URI
     * in the AI job.
     */
    const mediaPath =
      `gs://${this.bucketName}/${objectName}`;

    this.logger.log(
      `[AI VIDEO] Final video uploaded: ${mediaPath}`,
    );

    return {
      objectName,
      mediaPath,
    };
  }

  private async releaseReservedCredits(
    userId: string,
    amount: number,
  ) {
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    try {
      await this.credits.release(
        userId,
        amount,
      );
    } catch (error) {
      this.logger.error(
        `Failed to release AI credits for user ${userId}: ${
          error instanceof Error
            ? error.message
            : String(error)
        }`,
      );
    }
  }

  private async cleanup(
    files: string[],
  ) {
    await Promise.all(
      files.map(
        async (file) => {
          try {
            await fs.unlink(
              file,
            );
          } catch {
            // Cleanup is best-effort.
          }
        },
      ),
    );
  }

  private sleep(
    ms: number,
  ) {
    return new Promise<void>(
      (resolve) =>
        setTimeout(
          resolve,
          ms,
        ),
    );
  }
}