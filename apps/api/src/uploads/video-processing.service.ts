import {
  Injectable,
} from "@nestjs/common";

import {
  unlink,
} from "fs/promises";

import {
  CloudStorageService,
} from "./cloud-storage.service";

import {
  FfmpegService,
} from "./ffmpeg.service";

import {
  ThumbnailService,
} from "./thumbnails/thumbnail.service";

@Injectable()
export class VideoProcessingService {
  constructor(
    private readonly ffmpegService:
      FfmpegService,

    private readonly thumbnailService:
      ThumbnailService,

    private readonly cloudStorageService:
      CloudStorageService,
  ) {}

  async processVideo(
    inputPath: string,
    maxDurationSeconds?: number,
  ) {
    if (
      !inputPath ||
      !inputPath.trim()
    ) {
      throw new Error(
        "Video processing requires a valid input file path.",
      );
    }

    const processedVideo =
      await this.ffmpegService.processVideo(
        inputPath,
        maxDurationSeconds,
      );

    if (!processedVideo) {
      throw new Error(
        "FFmpeg did not return a processed video.",
      );
    }

    if (
      !processedVideo.outputPath
    ) {
      throw new Error(
        "FFmpeg did not return a processed video path.",
      );
    }

    const thumbnail =
      await this.thumbnailService.generateVideoThumbnail(
        inputPath,
      );

    const videoKey =
      this.cloudStorageService.createObjectKey(
        "posts/videos",
        processedVideo.outputPath,
      );

    const videoUrl =
      await this.cloudStorageService.uploadAndSign(
        processedVideo.outputPath,
        videoKey,
        "video/mp4",
      );

    let thumbnailUrl:
      | string
      | null = null;

    let thumbnailKey:
      | string
      | null = null;

    if (
      thumbnail?.path
    ) {
      thumbnailKey =
        this.cloudStorageService.createObjectKey(
          "posts/thumbnails",
          thumbnail.path,
        );

      thumbnailUrl =
        await this.cloudStorageService.uploadAndSign(
          thumbnail.path,
          thumbnailKey,
          "image/jpeg",
        );
    }

    await this.cleanupFile(
      processedVideo.outputPath,
    );

    if (
      thumbnail?.path
    ) {
      await this.cleanupFile(
        thumbnail.path,
      );
    }

    return {
      type: "video",

      videoUrl,

      videoPath:
        processedVideo.outputPath,

      videoStorageKey:
        videoKey,

      durationSeconds:
        processedVideo.durationSeconds,

      thumbnailUrl,

      thumbnailPath:
        thumbnail?.path ?? null,

      thumbnailStorageKey:
        thumbnailKey,
    };
  }

  private async cleanupFile(
    filePath?: string,
  ) {
    if (!filePath) {
      return;
    }

    try {
      await unlink(filePath);
    } catch {
      return;
    }
  }
}