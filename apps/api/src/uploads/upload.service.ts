import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  VideoProcessingService,
} from "./video-processing.service";

// ============================================================================
// STORY LIMIT
// ============================================================================
//
// Stories are intentionally short.
// This is separate from Fockis Music / Studio professional uploads.
//
// ============================================================================

const STORY_MAX_VIDEO_SECONDS = 60;

// ============================================================================
// PROFESSIONAL UPLOAD LIMITS
// ============================================================================
//
// The actual transport/upload interceptor should allow up to 30 GB.
//
// These limits are primarily enforced by the appropriate processing pipeline:
//
// Audio:
//   Song / Single / Track     -> 500 MB / 3 hours
//   Album / EP / Long Audio   -> 2 GB / 12 hours
//
// Video:
//   Music Video               -> 4 GB / 3 hours
//   Video / Long-form Video   -> 20 GB / 8 hours
//   Recorded Live             -> 30 GB / 12 hours
//
// This generic UploadService does not know the Music content type.
// Therefore it must NOT apply a generic 100 MB restriction.
//
// ============================================================================

const MB = 1024 * 1024;
const GB = 1024 * 1024 * 1024;

export const FOCKIS_UPLOAD_LIMITS = {
  song: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  single: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  track: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  beat: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  instrumental: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 500 * MB,
  },

  album: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  ep: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  music: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  audio: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 2 * GB,
  },

  music_video: {
    maxDurationSeconds: 3 * 60 * 60,
    maxFileSizeBytes: 4 * GB,
  },

  video: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  live_performance: {
    maxDurationSeconds: 12 * 60 * 60,
    maxFileSizeBytes: 30 * GB,
  },

  interview: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  behind_the_scenes: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  tutorial: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  exclusive: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },

  exclusive_video: {
    maxDurationSeconds: 8 * 60 * 60,
    maxFileSizeBytes: 20 * GB,
  },
} as const;

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class UploadService {
  constructor(
    private readonly videoProcessingService:
      VideoProcessingService,
  ) {}

  // ==========================================================================
  // MAIN UPLOAD PROCESSOR
  // ==========================================================================

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
      file.mimetype?.toLowerCase() ??
      "";

    // ========================================================================
    // IMAGE
    // ========================================================================

    if (
      mimeType.startsWith(
        "image/",
      )
    ) {
      return this.processImage(
        file,
      );
    }

    // ========================================================================
    // AUDIO
    // ========================================================================

    if (
      mimeType.startsWith(
        "audio/",
      )
    ) {
      return this.processAudio(
        file,
      );
    }

    // ========================================================================
    // VIDEO
    // ========================================================================

    if (
      mimeType.startsWith(
        "video/",
      )
    ) {
      return this.processVideo(
        file,
        context,
      );
    }

    // ========================================================================
    // UNSUPPORTED
    // ========================================================================

    throw new BadRequestException(
      "Only image, audio, and video files are supported.",
    );
  }

  // ==========================================================================
  // IMAGE
  // ==========================================================================

  private processImage(
    file: Express.Multer.File,
  ) {
    const storageKey =
      this.normalizeStorageKey(
        file.filename,
      );

    const url =
      `/uploads/${storageKey}`;

    return {
      success: true,

      type: "image",

      url,

      path: url,

      storageKey,

      thumbnailUrl: url,

      thumbnailPath: url,
    };
  }

  // ==========================================================================
  // AUDIO
  // ==========================================================================

  private processAudio(
    file: Express.Multer.File,
  ) {
    const storageKey =
      this.normalizeStorageKey(
        `music/${file.filename}`,
      );

    const url =
      `/uploads/${storageKey}`;

    return {
      success: true,

      type: "audio",

      url,

      path: url,

      storageKey,

      thumbnailUrl: null,

      thumbnailPath: null,
    };
  }

  // ==========================================================================
  // VIDEO
  // ==========================================================================

  private async processVideo(
    file: Express.Multer.File,
    context?: string,
  ) {
    const isStory =
      context?.trim()
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

    const videoUrl =
      String(
        processed.videoUrl ??
        "",
      ).trim();

    if (!videoUrl) {
      throw new BadRequestException(
        "Video processing did not return a video URL.",
      );
    }

    const videoStorageKey =
      this.toStorageKey(
        videoUrl,
      );

    if (!videoStorageKey) {
      throw new BadRequestException(
        "Unable to determine video storage key.",
      );
    }

    return {
      success: true,

      type: "video",

      url: videoUrl,

      path:
        processed.videoPath,

      storageKey:
        videoStorageKey,

      thumbnailUrl:
        processed.thumbnailUrl ??
        null,

      thumbnailPath:
        processed.thumbnailPath ??
        null,
    };
  }

  // ==========================================================================
  // STORAGE KEY NORMALIZATION
  // ==========================================================================

  /**
   * Converts a storage path into the canonical Fockis storage-key format.
   *
   * Examples:
   *
   *   uploads/music/file.mp3
   *   /uploads/music/file.mp3
   *   http://localhost:3000/uploads/music/file.mp3
   *
   * become:
   *
   *   music/file.mp3
   */
  private toStorageKey(
    value: string,
  ): string {
    let normalized =
      String(
        value ?? "",
      ).trim();

    if (!normalized) {
      return "";
    }

    // Normalize Windows separators.
    normalized =
      normalized.replace(
        /\\/g,
        "/",
      );

    // Remove query string.
    normalized =
      normalized.split("?")[0];

    // Remove fragment.
    normalized =
      normalized.split("#")[0];

    // Remove absolute HTTP/HTTPS origin.
    normalized =
      normalized.replace(
        /^https?:\/\/[^/]+/i,
        "",
      );

    // Remove leading slashes.
    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    // Remove uploads prefix.
    normalized =
      normalized.replace(
        /^uploads\/?/i,
        "",
      );

    // Remove any remaining leading slash.
    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    return normalized.trim();
  }

  /**
   * Normalizes a known relative storage key.
   */
  private normalizeStorageKey(
    value: string,
  ): string {
    let normalized =
      String(
        value ?? "",
      ).trim();

    if (!normalized) {
      return "";
    }

    normalized =
      normalized.replace(
        /\\/g,
        "/",
      );

    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    normalized =
      normalized.replace(
        /^uploads\/?/i,
        "",
      );

    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    return normalized.trim();
  }
}