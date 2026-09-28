import {
  Module,
} from "@nestjs/common";

import {
  UploadsController,
} from "./uploads.controller";

import {
  UploadService,
} from "./upload.service";

import {
  FfmpegService,
} from "./ffmpeg.service";

import {
  ThumbnailService,
} from "./thumbnails/thumbnail.service";

import {
  VideoProcessingService,
} from "./video-processing.service";

@Module({
  controllers: [
    UploadsController,
  ],

  providers: [
    UploadService,

    FfmpegService,

    ThumbnailService,

    VideoProcessingService,
  ],

  exports: [
    UploadService,

    FfmpegService,

    ThumbnailService,

    VideoProcessingService,
  ],
})
export class UploadsModule {}