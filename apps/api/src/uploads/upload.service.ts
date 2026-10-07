import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  unlink,
} from "fs/promises";

import {
  CloudStorageService,
} from "./cloud-storage.service";

import {
  VideoProcessingService,
} from "./video-processing.service";

const STORY_MAX_VIDEO_SECONDS = 60;

const MB =
  1024 * 1024;

const GB =
  1024 *
  1024 *
  1024;

export const FOCKIS_UPLOAD_LIMITS = {
  song: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
  },

  single: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
  },

  track: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
  },

  beat: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
  },

  instrumental: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      500 * MB,
  },

  album: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
  },

  ep: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
  },

  music: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
  },

  audio: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      2 * GB,
  },

  music_video: {
    maxDurationSeconds:
      3 * 60 * 60,
    maxFileSizeBytes:
      4 * GB,
  },

  video: {
    maxDurationSeconds:
      8 * 60 * 60,
    maxFileSizeBytes:
      20 * GB,
  },

  live_performance: {
    maxDurationSeconds:
      12 * 60 * 60,
    maxFileSizeBytes:
      30 * GB,
  },
} as const;

@Injectable()
export class UploadService {
  constructor(
    private readonly videoProcessingService:
      VideoProcessingService,

    private readonly cloudStorageService:
      CloudStorageService,
  ) {}

  async processUpload(
    file: Express.Multer.File,
    context?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        "No file uploaded.",
      );
    }

    const mimeType =
      file.mimetype
        ?.toLowerCase() ||
      "";

    try {
      if (
        mimeType.startsWith(
          "image/",
        )
      ) {
        return await this.processImage(
          file,
        );
      }

      if (
        mimeType.startsWith(
          "audio/",
        )
      ) {
        return await this.processAudio(
          file,
        );
      }

      if (
        mimeType.startsWith(
          "video/",
        )
      ) {
        return await this.processVideo(
          file,
          context,
        );
      }

      throw new BadRequestException(
        "Only image, audio, and video files are supported.",
      );
    } finally {
      await this.cleanupFile(
        file.path,
      );
    }
  }

  private async processImage(
    file: Express.Multer.File,
  ) {
    const storageKey =
      this.cloudStorageService.createObjectKey(
        "posts/images",
        file.originalname,
      );

    const url =
      await this.cloudStorageService.uploadAndSign(
        file.path,
        storageKey,
        file.mimetype,
      );

    return {
      success: true,

      type: "image",

      url,

      path: file.path,

      storageKey,

      thumbnailUrl: url,

      thumbnailPath: file.path,
    };
  }

  private async processAudio(
    file: Express.Multer.File,
  ) {
    const storageKey =
      this.cloudStorageService.createObjectKey(
        "music",
        file.originalname,
      );

    const url =
      await this.cloudStorageService.uploadAndSign(
        file.path,
        storageKey,
        file.mimetype,
      );

    return {
      success: true,

      type: "audio",

      url,

      path: file.path,

      storageKey,

      thumbnailUrl: null,

      thumbnailPath: null,
    };
  }

  private async processVideo(
    file: Express.Multer.File,
    context?: string,
  ) {
    const isStory =
      context
        ?.trim()
        .toLowerCase() ===
      "story";

    const maxDurationSeconds =
      isStory
        ? STORY_MAX_VIDEO_SECONDS
        : undefined;

    const processed =
      await this.videoProcessingService.processVideo(
        file.path,
        maxDurationSeconds,
      );

    if (!processed) {
      throw new BadRequestException(
        "Video processing failed.",
      );
    }

    if (!processed.videoUrl) {
      throw new BadRequestException(
        "Video processing did not return a cloud URL.",
      );
    }

    return {
      success: true,

      type: "video",

      url:
        processed.videoUrl,

      path:
        processed.videoPath,

      storageKey:
        processed.videoStorageKey,

      thumbnailUrl:
        processed.thumbnailUrl,

      thumbnailPath:
        processed.thumbnailPath,

      thumbnailStorageKey:
        processed.thumbnailStorageKey,

      durationSeconds:
        processed.durationSeconds,
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