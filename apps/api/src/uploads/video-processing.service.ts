import {
  Injectable,
} from "@nestjs/common";

import {
  FfmpegService,
} from "./ffmpeg.service";

import {
  ThumbnailService,
} from "./thumbnails/thumbnail.service";

@Injectable()
export class VideoProcessingService {
  constructor(
    private readonly ffmpegService: FfmpegService,

    private readonly thumbnailService: ThumbnailService,
  ) {}

  /**
   * Process an uploaded video.
   *
   * IMPORTANT:
   * This service runs AFTER the multipart upload has already
   * been accepted by Multer/the upload controller.
   *
   * Therefore, HTTP 413 "File too large" is NOT generated here.
   *
   * The upload interceptor/Multer configuration must allow
   * the required transport size before this method is reached.
   */
  async processVideo(
    inputPath: string,
    maxDurationSeconds?: number,
  ) {
    if (!inputPath || !inputPath.trim()) {
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

    const thumbnail =
      await this.thumbnailService.generateVideoThumbnail(
        inputPath,
      );

    return {
      type: "video",

      videoUrl:
        processedVideo.url,

      videoPath:
        processedVideo.outputPath,

      durationSeconds:
        processedVideo.durationSeconds,

      thumbnailUrl:
        thumbnail?.url ?? null,

      thumbnailPath:
        thumbnail?.path ?? null,
    };
  }
}