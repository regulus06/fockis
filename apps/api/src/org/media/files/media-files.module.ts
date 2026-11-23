import { Module } from "@nestjs/common";

import { UploadsModule } from "../../../uploads/uploads.module";
import { MediaFilesController } from "./media-files.controller";
import { MediaStorageService } from "./media-storage.service";
import { UploadsMirrorService } from "./uploads-mirror.service";

/**
 * Organization media files in Google Cloud Storage.
 * Not under the "church" route prefix: it serves /uploads/… when a file is
 * missing from this server's disk.
 */
@Module({
  imports: [UploadsModule],
  controllers: [MediaFilesController],
  providers: [MediaStorageService, UploadsMirrorService],
  exports: [MediaStorageService],
})
export class MediaFilesModule {}
