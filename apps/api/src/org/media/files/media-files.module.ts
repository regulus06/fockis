import { Module } from "@nestjs/common";

import { UploadsModule } from "../../../uploads/uploads.module";
import { MediaFilesController } from "./media-files.controller";
import { MediaStorageService } from "./media-storage.service";

/**
 * Organization media files in Google Cloud Storage.
 * Not under the "church" route prefix: it serves /uploads/organization-media/…
 */
@Module({
  imports: [UploadsModule],
  controllers: [MediaFilesController],
  providers: [MediaStorageService],
  exports: [MediaStorageService],
})
export class MediaFilesModule {}
