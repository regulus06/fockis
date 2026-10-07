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
  CloudStorageService,
} from "./cloud-storage.service";

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

    CloudStorageService,

    FfmpegService,

    ThumbnailService,

    VideoProcessingService,
  ],

  exports: [
    UploadService,

    CloudStorageService,

    FfmpegService,

    ThumbnailService,

    VideoProcessingService,
  ],
})
export class UploadsModule {}