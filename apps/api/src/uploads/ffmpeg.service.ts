import {
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

import { Storage } from "@google-cloud/storage";

import ffmpeg = require("fluent-ffmpeg");
import ffmpegPath = require("ffmpeg-static");

import { randomUUID } from "crypto";

import {
  join,
  resolve,
} from "path";

import {
  mkdir,
  stat,
} from "fs/promises";

// ============================================================================
// FFMPEG CONFIGURATION
// ============================================================================

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(
    ffmpegPath as unknown as string,
  );
}

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessedVideoResult {
  outputPath: string;
  url: string;
  storageKey: string;
  durationSeconds: number;
}

export interface ProcessedAudioResult {
  outputPath: string;
  url: string;
  storageKey: string;
  durationSeconds: number;
}

export interface GeneratedVideoCoverResult {
  outputPath: string;
  url: string;
  storageKey: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class FfmpegService {
  private readonly storage: Storage;

  private readonly bucketName: string;

  private readonly gcsEnabled: boolean;

  constructor() {
    this.storage =
      this.createStorage();

    this.bucketName =
      process.env
        .GOOGLE_CLOUD_STORAGE_BUCKET
        ?.trim() ||
      "fockis-ai-media-2026";

    this.gcsEnabled =
      Boolean(
        process.env
          .GOOGLE_CLOUD_STORAGE_BUCKET
          ?.trim(),
      );
  }

  // ==========================================================================
  // GOOGLE CLOUD STORAGE INITIALIZATION
  // ==========================================================================

  private createStorage(): Storage {
    const projectId =
      process.env
        .GOOGLE_CLOUD_PROJECT
        ?.trim() ||
      undefined;

    const rawCredentials =
      process.env
        .GOOGLE_SERVICE_ACCOUNT_JSON
        ?.trim();

    if (!rawCredentials) {
      console.warn(
        "⚠️ GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Using Application Default Credentials.",
      );

      return new Storage({
        projectId,
      });
    }

    try {
      const parsed =
        JSON.parse(
          rawCredentials,
        );

      const clientEmail =
        String(
          parsed.client_email ||
            "",
        ).trim();

      const privateKey =
        String(
          parsed.private_key ||
            "",
        )
          .replace(
            /\\n/g,
            "\n",
          )
          .replace(
            /\r\n/g,
            "\n",
          )
          .trim();

      if (!clientEmail) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email.",
        );
      }

      if (!privateKey) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON is missing private_key.",
        );
      }

      console.log(
        "✅ FFmpeg GCS credentials loaded:",
        {
          projectId,
          clientEmail,
          hasPrivateKey: true,
        },
      );

      return new Storage({
        projectId,
        credentials: {
          client_email:
            clientEmail,
          private_key:
            privateKey,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.error(
        "❌ Failed to initialize FFmpeg GCS:",
        message,
      );

      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON is invalid: ${message}`,
      );
    }
  }

  // ==========================================================================
  // VIDEO PROCESSING
  // ==========================================================================

  /**
   * Processes the complete video.
   *
   * IMPORTANT:
   *
   * This method does NOT truncate the uploaded video.
   *
   * Content-specific duration limits are enforced by
   * MusicService / MusicMediaProcessingService.
   *
   * This version includes:
   *
   * - FFmpeg command logging
   * - FFmpeg stderr logging
   * - Progress logging
   * - Error logging
   * - 10-minute timeout
   * - Single-thread encoding for Render Free
   */

  async processVideo(
    inputPath: string,
    _maxDurationSeconds?: number,
  ): Promise<ProcessedVideoResult> {
    if (!inputPath?.trim()) {
      throw new InternalServerErrorException(
        "Video input path is required.",
      );
    }

    const outputDirectory =
      resolve(
        process.cwd(),
        "uploads/videos",
      );

    await mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );

    const outputName =
      `${randomUUID()}.mp4`;

    const outputPath =
      join(
        outputDirectory,
        outputName,
      );

    return new Promise(
      (
        resolvePromise,
        rejectPromise,
      ) => {
        let lastTimemark =
          "00:00:00.00";

        let lastProgressLogAt =
          0;

        let finished =
          false;

        let timeoutHandle:
          NodeJS.Timeout | null =
          null;

        const stderrLines:
          string[] = [];

        const command =
          ffmpeg(inputPath)
            .outputOptions([
              "-c:v",
              "libx264",

              "-preset",
              "fast",

              "-crf",
              "28",

              "-c:a",
              "aac",

              "-movflags",
              "+faststart",

              "-threads",
              "1",

              "-max_muxing_queue_size",
              "4096",

              "-y",
            ]);

        // --------------------------------------------------------------------
        // CLEANUP
        // --------------------------------------------------------------------

        const cleanup = () => {
          if (
            timeoutHandle
          ) {
            clearTimeout(
              timeoutHandle,
            );

            timeoutHandle =
              null;
          }
        };

        // --------------------------------------------------------------------
        // FAILURE HANDLER
        // --------------------------------------------------------------------

        const fail = (
          error: unknown,
        ) => {
          if (finished) {
            return;
          }

          finished =
            true;

          cleanup();

          const message =
            error instanceof Error
              ? error.message
              : String(error);

          console.error(
            "[FFMPEG VIDEO ERROR]",
            {
              inputPath,
              outputPath,
              message,
              lastTimemark,
              stderr:
                stderrLines
                  .slice(-30)
                  .join("\n"),
            },
          );

          rejectPromise(
            error instanceof Error
              ? error
              : new Error(
                  message,
                ),
          );
        };

        // --------------------------------------------------------------------
        // START LOG
        // --------------------------------------------------------------------

        console.log(
          "[FFMPEG VIDEO COMMAND START]",
          {
            inputPath,
            outputPath,
            ffmpegPath:
              ffmpegPath ||
              "system",
          },
        );

        command
          .output(outputPath)

          // ------------------------------------------------------------------
          // FFMPEG PROCESS STARTED
          // ------------------------------------------------------------------

          .on(
            "start",
            (
              commandLine,
            ) => {
              console.log(
                "[FFMPEG VIDEO PROCESS STARTED]",
                {
                  command:
                    commandLine,
                },
              );
            },
          )

          // ------------------------------------------------------------------
          // PROGRESS
          // ------------------------------------------------------------------

          .on(
            "progress",
            (
              progress,
            ) => {
              if (
                progress?.timemark
              ) {
                lastTimemark =
                  progress.timemark;
              }

              const now =
                Date.now();

              if (
                now -
                  lastProgressLogAt >=
                5000
              ) {
                lastProgressLogAt =
                  now;

                console.log(
                  "[FFMPEG VIDEO PROGRESS]",
                  {
                    timemark:
                      lastTimemark,

                    percent:
                      progress?.percent ??
                      null,

                    frames:
                      progress?.frames ??
                      null,

                    currentFps:
                      progress?.currentFps ??
                      null,

                    currentKbps:
                      progress?.currentKbps ??
                      null,
                  },
                );
              }
            },
          )

          // ------------------------------------------------------------------
          // FFMPEG STDERR
          // ------------------------------------------------------------------

          .on(
            "stderr",
            (
              line: string,
            ) => {
              const trimmed =
                String(
                  line || "",
                ).trim();

              if (!trimmed) {
                return;
              }

              stderrLines.push(
                trimmed,
              );

              if (
                stderrLines.length >
                100
              ) {
                stderrLines.shift();
              }

              console.log(
                "[FFMPEG STDERR]",
                trimmed,
              );
            },
          )

          // ------------------------------------------------------------------
          // COMPLETE
          // ------------------------------------------------------------------

          .on(
            "end",
            async () => {
              if (finished) {
                return;
              }

              console.log(
                "[FFMPEG VIDEO END]",
                {
                  outputPath,
                  lastTimemark,
                },
              );

              let durationSeconds =
                0;

              // --------------------------------------------------------------
              // DETERMINE DURATION
              // --------------------------------------------------------------

              try {
                durationSeconds =
                  await this.getMediaDuration(
                    outputPath,
                  );
              } catch (
                durationError
              ) {
                console.warn(
                  "[FFMPEG VIDEO] ffprobe duration lookup failed. Using timemark fallback.",
                  {
                    error:
                      durationError,
                  },
                );

                durationSeconds =
                  this.parseTimemark(
                    lastTimemark,
                  );
              }

              // --------------------------------------------------------------
              // VALIDATE DURATION
              // --------------------------------------------------------------

              if (
                !Number.isFinite(
                  durationSeconds,
                ) ||
                durationSeconds <=
                  0
              ) {
                fail(
                  new InternalServerErrorException(
                    "Unable to determine processed video duration.",
                  ),
                );

                return;
              }

              // --------------------------------------------------------------
              // UPLOAD PROCESSED VIDEO
              // --------------------------------------------------------------

              try {
                console.log(
                  "[FFMPEG VIDEO] Uploading processed file to GCS:",
                  {
                    outputPath,

                    storageKey:
                      `posts/${outputName}`,

                    durationSeconds,
                  },
                );

                const cloud =
                  await this.uploadToGoogleCloudStorage(
                    outputPath,

                    `posts/${outputName}`,

                    "video/mp4",
                  );

                finished =
                  true;

                cleanup();

                console.log(
                  "[FFMPEG VIDEO COMPLETE]",
                  {
                    outputPath,

                    storageKey:
                      cloud?.storageKey ??
                      `videos/${outputName}`,

                    durationSeconds,
                  },
                );

                resolvePromise({
                  outputPath,

                  url:
                    cloud?.url ??
                    `/uploads/videos/${outputName}`,

                  storageKey:
                    cloud?.storageKey ??
                    `videos/${outputName}`,

                  durationSeconds,
                });
              } catch (
                uploadError
              ) {
                fail(
                  uploadError,
                );
              }
            },
          )

          // ------------------------------------------------------------------
          // FFMPEG ERROR
          // ------------------------------------------------------------------

          .on(
            "error",
            (
              error,
            ) => {
              fail(error);
            },
          );

        // --------------------------------------------------------------------
        // TEN-MINUTE TIMEOUT
        // --------------------------------------------------------------------

        timeoutHandle =
          setTimeout(
            () => {
              if (finished) {
                return;
              }

              console.error(
                "[FFMPEG VIDEO TIMEOUT]",
                {
                  inputPath,

                  outputPath,

                  lastTimemark,

                  stderr:
                    stderrLines
                      .slice(-30)
                      .join("\n"),
                },
              );

              try {
                command.kill(
                  "SIGKILL",
                );
              } catch (
                killError
              ) {
                console.error(
                  "[FFMPEG VIDEO] Failed to kill timed-out process:",
                  killError,
                );
              }

              fail(
                new Error(
                  "FFmpeg video processing timed out after 10 minutes.",
                ),
              );
            },

            10 *
              60 *
              1000,
          );

        // --------------------------------------------------------------------
        // RUN FFMPEG
        // --------------------------------------------------------------------

        command.run();
      },
    );
  }

  // ==========================================================================
  // AUTOMATIC VIDEO COVER
  // ==========================================================================

  /**
   * Generates a public JPG cover from a video.
   *
   * The generated image is intentionally stored at:
   *
   *   uploads/music-covers/
   *
   * rather than:
   *
   *   uploads/music/
   *
   * because /uploads/music/* is protected by main.ts.
   *
   * The video itself remains protected.
   */

  async generateVideoCover(
    inputPath: string,
  ): Promise<GeneratedVideoCoverResult> {
    if (!inputPath?.trim()) {
      throw new InternalServerErrorException(
        "Video input path is required for cover generation.",
      );
    }

    const outputDirectory =
      resolve(
        process.cwd(),
        "uploads/music-covers",
      );

    await mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );

    const outputName =
      `${randomUUID()}.jpg`;

    const outputPath =
      join(
        outputDirectory,
        outputName,
      );

    // ------------------------------------------------------------------------
    // DETERMINE VIDEO DURATION
    // ------------------------------------------------------------------------

    let durationSeconds =
      0;

    try {
      durationSeconds =
        await this.getMediaDuration(
          inputPath,
        );
    } catch {
      durationSeconds =
        0;
    }

    // ------------------------------------------------------------------------
    // CHOOSE REPRESENTATIVE FRAME
    // ------------------------------------------------------------------------

    let seekSeconds =
      1;

    if (
      Number.isFinite(
        durationSeconds,
      ) &&
      durationSeconds > 0
    ) {
      if (
        durationSeconds <=
        2
      ) {
        seekSeconds =
          Math.max(
            durationSeconds *
              0.5,
            0,
          );
      } else {
        const fivePercent =
          durationSeconds *
          0.05;

        seekSeconds =
          Math.min(
            Math.max(
              fivePercent,
              1,
            ),
            10,
          );

        if (
          seekSeconds >=
          durationSeconds
        ) {
          seekSeconds =
            Math.max(
              durationSeconds -
                0.1,
              0,
            );
        }
      }
    }

    // ------------------------------------------------------------------------
    // EXTRACT FRAME
    // ------------------------------------------------------------------------

    return new Promise(
      (
        resolvePromise,
        rejectPromise,
      ) => {
        ffmpeg(inputPath)

          .seekInput(
            seekSeconds,
          )

          .frames(1)

          .outputOptions([
            "-q:v",
            "2",

            "-vf",
            "scale='min(1920,iw)':-2",

            "-f",
            "image2",
          ])

          .output(
            outputPath,
          )

          .on(
            "end",
            async () => {
              try {
                const fileStats =
                  await stat(
                    outputPath,
                  );

                if (
                  !fileStats.isFile() ||
                  fileStats.size <= 0
                ) {
                  rejectPromise(
                    new InternalServerErrorException(
                      "FFmpeg completed but generated an empty video cover.",
                    ),
                  );

                  return;
                }

                const cloud =
                  await this.uploadToGoogleCloudStorage(
                    outputPath,

                    `posts/${outputName}`,

                    "image/jpeg",
                  );

                resolvePromise({
                  outputPath,

                  url:
                    cloud?.url ??
                    `/uploads/music-covers/${outputName}`,

                  storageKey:
                    cloud?.storageKey ??
                    `music-covers/${outputName}`,
                });
              } catch {
                rejectPromise(
                  new InternalServerErrorException(
                    "FFmpeg completed but the generated video cover could not be verified.",
                  ),
                );
              }
            },
          )

          .on(
            "error",
            (
              error,
            ) => {
              rejectPromise(
                new InternalServerErrorException(
                  `Unable to generate video cover: ${
                    error?.message ??
                    "Unknown FFmpeg error"
                  }`,
                ),
              );
            },
          )

          .run();
      },
    );
  }

  // ==========================================================================
  // AUDIO PROCESSING
  // ==========================================================================

  async processAudio(
    inputPath: string,
  ): Promise<ProcessedAudioResult> {
    if (!inputPath?.trim()) {
      throw new InternalServerErrorException(
        "Audio input path is required.",
      );
    }

    const outputDirectory =
      resolve(
        process.cwd(),
        "uploads/music/processed",
      );

    await mkdir(
      outputDirectory,
      {
        recursive: true,
      },
    );

    const outputName =
      `${randomUUID()}.mp3`;

    const outputPath =
      join(
        outputDirectory,
        outputName,
      );

    return new Promise(
      (
        resolvePromise,
        rejectPromise,
      ) => {
        let lastTimemark =
          "00:00:00.00";

        ffmpeg(inputPath)

          .outputOptions([
            "-vn",

            "-c:a",
            "libmp3lame",

            "-b:a",
            "192k",

            "-ar",
            "44100",

            "-ac",
            "2",
          ])

          .output(
            outputPath,
          )

          .on(
            "progress",
            (
              progress,
            ) => {
              if (
                progress?.timemark
              ) {
                lastTimemark =
                  progress.timemark;
              }
            },
          )

          .on(
            "end",
            async () => {
              let durationSeconds =
                0;

              try {
                durationSeconds =
                  await this.getMediaDuration(
                    outputPath,
                  );
              } catch {
                durationSeconds =
                  this.parseTimemark(
                    lastTimemark,
                  );
              }

              if (
                !Number.isFinite(
                  durationSeconds,
                ) ||
                durationSeconds <=
                  0
              ) {
                rejectPromise(
                  new InternalServerErrorException(
                    "Unable to determine audio duration.",
                  ),
                );

                return;
              }

              try {
                const cloud =
                  await this.uploadToGoogleCloudStorage(
                    outputPath,

                    `posts/${outputName}`,

                    "audio/mpeg",
                  );

                resolvePromise({
                  outputPath,

                  url:
                    cloud?.url ??
                    `/uploads/music/processed/${outputName}`,

                  storageKey:
                    cloud?.storageKey ??
                    `music/processed/${outputName}`,

                  durationSeconds,
                });
              } catch (
                uploadError
              ) {
                rejectPromise(
                  uploadError,
                );
              }
            },
          )

          .on(
            "error",
            (
              error,
            ) => {
              rejectPromise(
                error,
              );
            },
          )

          .run();
      },
    );
  }

  // ==========================================================================
  // GOOGLE CLOUD STORAGE
  // ==========================================================================

  private async uploadToGoogleCloudStorage(
    localPath: string,

    objectName: string,

    contentType: string,
  ): Promise<{
    url: string;
    storageKey: string;
  } | null> {
    if (!this.gcsEnabled) {
      return null;
    }

    await this.storage
      .bucket(
        this.bucketName,
      )
      .upload(
        localPath,
        {
          destination:
            objectName,

          resumable:
            true,

          metadata: {
            contentType,

            cacheControl:
              "public, max-age=31536000, immutable",
          },
        },
      );

    const filename =
      objectName
        .split("/")
        .pop() ||
      objectName;

    return {
      url:
        `/post-media/${encodeURIComponent(
          filename,
        )}`,

      storageKey:
        `post-media/${filename}`,
    };
  }

  // ==========================================================================
  // MEDIA DURATION
  // ==========================================================================

  async getMediaDuration(
    inputPath: string,
  ): Promise<number> {
    if (!inputPath?.trim()) {
      throw new InternalServerErrorException(
        "Media input path is required.",
      );
    }

    return new Promise(
      (
        resolvePromise,
        rejectPromise,
      ) => {
        ffmpeg.ffprobe(
          inputPath,

          (
            error,
            metadata,
          ) => {
            if (error) {
              rejectPromise(
                error,
              );

              return;
            }

            const duration =
              Number(
                metadata
                  ?.format
                  ?.duration,
              );

            if (
              !Number.isFinite(
                duration,
              ) ||
              duration <= 0
            ) {
              rejectPromise(
                new Error(
                  "Media duration is unavailable.",
                ),
              );

              return;
            }

            resolvePromise(
              duration,
            );
          },
        );
      },
    );
  }

  // ==========================================================================
  // TIMEMARK FALLBACK
  // ==========================================================================

  private parseTimemark(
    timemark?: string,
  ): number {
    if (
      !timemark ||
      typeof timemark !==
        "string"
    ) {
      return 0;
    }

    const parts =
      timemark
        .split(":")
        .map(
          (
            value,
          ) =>
            Number(value),
        );

    if (
      parts.length !== 3 ||
      parts.some(
        (
          part,
        ) =>
          !Number.isFinite(
            part,
          ),
      )
    ) {
      return 0;
    }

    const [
      hours,
      minutes,
      seconds,
    ] = parts;

    return (
      hours * 3600 +
      minutes * 60 +
      seconds
    );
  }
}