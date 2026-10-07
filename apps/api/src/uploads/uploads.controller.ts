import {
  BadRequestException,
  Controller,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";

import {
  FileInterceptor,
} from "@nestjs/platform-express";

import {
  diskStorage,
} from "multer";

import {
  extname,
} from "path";

import {
  randomUUID,
} from "crypto";

import {
  mkdirSync,
} from "fs";

import {
  UploadService,
} from "./upload.service";

@Controller("uploads")
export class UploadsController {
  constructor(
    private readonly uploadService:
      UploadService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (
          _req,
          _file,
          callback,
        ) => {
          const directory =
            "./uploads";

          mkdirSync(
            directory,
            {
              recursive: true,
            },
          );

          callback(
            null,
            directory,
          );
        },

        filename: (
          _req,
          file,
          callback,
        ) => {
          const extension =
            extname(
              file.originalname,
            );

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
      }),

      limits: {
        fileSize:
          500 *
          1024 *
          1024,
      },

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/avif",

          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/ogg",
          "audio/aac",
          "audio/mp4",
          "audio/flac",

          "video/mp4",
          "video/webm",
          "video/quicktime",
          "video/x-matroska",
        ];

        if (
          !allowedTypes.includes(
            file.mimetype,
          )
        ) {
          return callback(
            new BadRequestException(
              "Unsupported media type.",
            ),
            false,
          );
        }

        callback(
          null,
          true,
        );
      },
    }),
  )
  async uploadFile(
    @UploadedFile()
    file: Express.Multer.File,

    @Query("context")
    context?: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        "No file uploaded.",
      );
    }

    const processed =
      await this.uploadService.processUpload(
        file,
        context,
      );

    const durationSeconds =
      "durationSeconds" in processed
        ? processed.durationSeconds
        : null;

    return {
      success: true,

      filename:
        file.filename,

      originalName:
        file.originalname,

      mimetype:
        file.mimetype,

      type:
        processed.type,

      media:
        processed.url,

      thumbnailUrl:
        processed.thumbnailUrl ??
        null,

      storageKey:
        processed.storageKey ??
        null,

      durationSeconds,
    };
  }
}