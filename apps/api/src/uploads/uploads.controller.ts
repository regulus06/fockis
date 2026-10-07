import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Req,
  Res,
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

import type {
  Request,
  Response,
} from "express";

import {
  UploadService,
} from "./upload.service";

import {
  CloudStorageService,
} from "./cloud-storage.service";

@Controller("uploads")
export class UploadsController {
  constructor(
    private readonly uploadService:
      UploadService,

    private readonly cloudStorageService:
      CloudStorageService,
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

  /**
   * Stream private GCS media through the API.
   *
   * Supports HTTP Range requests for
   * browser audio/video playback and seeking.
   */
  @Get("media/*")
  async streamMedia(
    @Req()
    req: Request,

    @Res()
    res: Response,

    @Headers("range")
    range?: string,
  ) {
    const objectKey =
      this.extractMediaKey(
        req,
      );

    if (!objectKey) {
      throw new BadRequestException(
        "Media storage key is required.",
      );
    }

    const metadata =
      await this.cloudStorageService.getFileMetadata(
        objectKey,
      );

    const size =
      Number(
        metadata.size || 0,
      );

    if (
      !Number.isFinite(size) ||
      size <= 0
    ) {
      throw new BadRequestException(
        "Media object has an invalid size.",
      );
    }

    const contentType =
      metadata.contentType ||
      this.guessContentType(
        objectKey,
      );

    res.setHeader(
      "Content-Type",
      contentType,
    );

    res.setHeader(
      "Accept-Ranges",
      "bytes",
    );

    res.setHeader(
      "Cache-Control",
      "private, max-age=3600",
    );

    /**
     * Normal request.
     */
    if (!range) {
      res.status(200);

      res.setHeader(
        "Content-Length",
        String(size),
      );

      const stream =
        this.cloudStorageService.createReadStream(
          objectKey,
        );

      stream.on(
        "error",
        (error) => {
          console.error(
            "[GCS STREAM] Stream failed:",
            {
              objectKey,
              error,
            },
          );

          if (!res.headersSent) {
            res.status(500);
          }

          res.end();
        },
      );

      stream.pipe(res);

      return;
    }

    /**
     * Browser requested a byte range.
     */
    const parsed =
      this.parseRange(
        range,
        size,
      );

    if (!parsed) {
      res.status(416);

      res.setHeader(
        "Content-Range",
        `bytes */${size}`,
      );

      res.end();

      return;
    }

    const {
      start,
      end,
    } = parsed;

    const contentLength =
      end -
      start +
      1;

    res.status(206);

    res.setHeader(
      "Content-Range",
      `bytes ${start}-${end}/${size}`,
    );

    res.setHeader(
      "Content-Length",
      String(contentLength),
    );

    const stream =
      this.cloudStorageService.createReadStream(
        objectKey,
        start,
        end,
      );

    stream.on(
      "error",
      (error) => {
        console.error(
          "[GCS RANGE STREAM] Stream failed:",
          {
            objectKey,
            start,
            end,
            error,
          },
        );

        if (!res.headersSent) {
          res.status(500);
        }

        res.end();
      },
    );

    stream.pipe(res);
  }

  private extractMediaKey(
    req: Request,
  ): string {
    const originalUrl =
      req.originalUrl ||
      req.url ||
      "";

    const marker =
      "/uploads/media/";

    const markerIndex =
      originalUrl.indexOf(
        marker,
      );

    if (
      markerIndex === -1
    ) {
      return "";
    }

    let key =
      originalUrl.substring(
        markerIndex +
          marker.length,
      );

    const queryIndex =
      key.indexOf("?");

    if (
      queryIndex !== -1
    ) {
      key =
        key.substring(
          0,
          queryIndex,
        );
    }

    try {
      key =
        decodeURIComponent(
          key,
        );
    } catch {
      return "";
    }

    return key
      .replace(/^\/+/, "")
      .trim();
  }

  private parseRange(
    range: string,
    size: number,
  ): {
    start: number;
    end: number;
  } | null {
    const match =
      /^bytes=(\d*)-(\d*)$/i.exec(
        range.trim(),
      );

    if (!match) {
      return null;
    }

    const startText =
      match[1];

    const endText =
      match[2];

    let start: number;
    let end: number;

    if (
      startText === "" &&
      endText === ""
    ) {
      return null;
    }

    /**
     * Suffix range:
     * bytes=-500
     */
    if (
      startText === ""
    ) {
      const suffixLength =
        Number(endText);

      if (
        !Number.isFinite(
          suffixLength,
        ) ||
        suffixLength <= 0
      ) {
        return null;
      }

      start =
        Math.max(
          0,
          size -
            suffixLength,
        );

      end =
        size - 1;
    } else {
      start =
        Number(startText);

      if (
        !Number.isFinite(start) ||
        start < 0 ||
        start >= size
      ) {
        return null;
      }

      /**
       * Open-ended range:
       * bytes=500-
       */
      if (
        endText === ""
      ) {
        end =
          size - 1;
      } else {
        end =
          Number(endText);

        if (
          !Number.isFinite(end)
        ) {
          return null;
        }

        end =
          Math.min(
            end,
            size - 1,
          );
      }
    }

    if (
      start > end
    ) {
      return null;
    }

    return {
      start,
      end,
    };
  }

  private guessContentType(
    objectKey: string,
  ): string {
    const lower =
      objectKey.toLowerCase();

    if (
      lower.endsWith(".mp4")
    ) {
      return "video/mp4";
    }

    if (
      lower.endsWith(".webm")
    ) {
      return "video/webm";
    }

    if (
      lower.endsWith(".mov")
    ) {
      return "video/quicktime";
    }

    if (
      lower.endsWith(".mp3")
    ) {
      return "audio/mpeg";
    }

    if (
      lower.endsWith(".wav")
    ) {
      return "audio/wav";
    }

    if (
      lower.endsWith(".ogg")
    ) {
      return "audio/ogg";
    }

    if (
      lower.endsWith(".aac")
    ) {
      return "audio/aac";
    }

    if (
      lower.endsWith(".flac")
    ) {
      return "audio/flac";
    }

    if (
      lower.endsWith(".m4a")
    ) {
      return "audio/mp4";
    }

    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg")
    ) {
      return "image/jpeg";
    }

    if (
      lower.endsWith(".png")
    ) {
      return "image/png";
    }

    if (
      lower.endsWith(".webp")
    ) {
      return "image/webp";
    }

    return "application/octet-stream";
  }
}