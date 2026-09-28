import {
  BadRequestException,
  Controller,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
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
  mkdirSync,
} from "fs";

import {
  randomUUID,
} from "crypto";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  ProducerService,
} from "../services/producer.service";

import {
  UploadService,
} from "../../uploads/upload.service";

// ============================================================================
// FOCKIS MUSIC STUDIO UPLOAD
// ============================================================================
//
// POST /music/studio/upload
//
// FormData:
//   file = audio / video / image
//
// Optional:
//   ?context=music
//   ?context=story
//
// IMPORTANT:
//
// The multipart transport limit is intentionally 30 GB.
//
// This is the GLOBAL TRANSPORT LIMIT.
//
// The actual content-specific limits are enforced later by the
// MusicService / MusicMediaProcessingService.
//
// Professional Fockis limits:
//
//   Song / Single              500 MB   / 3 hours
//   Album / Long Audio           2 GB   / 12 hours
//   Music Video                  4 GB   / 3 hours
//   Video / Long-form Video    20 GB   / 8 hours
//   Recorded Live Stream       30 GB   / 12 hours
//
// DO NOT use memoryStorage() for these uploads.
// Files are written directly to disk with diskStorage().
//
// ============================================================================

const GB = 1024 * 1024 * 1024;

/**
 * Maximum multipart upload size accepted by the transport layer.
 *
 * This MUST be at least as large as the largest supported Fockis
 * media type.
 *
 * Largest supported media:
 *
 * Recorded Live Stream = 30 GB
 */
const MAX_MUSIC_STUDIO_UPLOAD_BYTES =
  30 * GB;

@Controller("music/studio")
export class MusicStudioUploadController {
  constructor(
    private readonly uploadService:
      UploadService,

    private readonly producerService:
      ProducerService,
  ) {}

  // ==========================================================================
  // POST /music/studio/upload
  // ==========================================================================

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: (
          _req,
          _file,
          callback,
        ) => {
          const directory =
            "./uploads/music";

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
            ).toLowerCase();

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
      }),

      // ======================================================================
      // IMPORTANT: 30 GB TRANSPORT LIMIT
      // ======================================================================
      //
      // This replaces the old:
      //
      // 100 * 1024 * 1024
      //
      // which was causing:
      //
      // HTTP 413 File too large
      //
      // ======================================================================

      limits: {
        fileSize:
          MAX_MUSIC_STUDIO_UPLOAD_BYTES,
      },

      // ======================================================================
      // ALLOWED FILE TYPES
      // ======================================================================

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        const mimeType =
          file.mimetype
            ?.toLowerCase()
            .trim() || "";

        const allowedTypes = [
          // ==================================================================
          // AUDIO
          // ==================================================================

          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/x-wav",
          "audio/wave",
          "audio/x-m4a",
          "audio/mp4",
          "audio/aac",
          "audio/ogg",
          "audio/opus",
          "audio/flac",
          "audio/x-flac",

          // ==================================================================
          // VIDEO
          // ==================================================================

          "video/mp4",
          "video/webm",
          "video/quicktime",
          "video/x-matroska",

          // Some browsers/devices may report these MIME types.
          "video/mov",
          "video/x-msvideo",

          // ==================================================================
          // IMAGE / COVER ART
          // ==================================================================

          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
          "image/avif",
        ];

        if (
          !allowedTypes.includes(
            mimeType,
          )
        ) {
          return callback(
            new BadRequestException(
              "Unsupported Music Studio file type. Upload MP3, WAV, M4A, AAC, OGG, FLAC, MP4, WebM, MOV, MKV, AVI, JPG, PNG, GIF, WebP, or AVIF.",
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
  async upload(
    @UploadedFile()
    file: Express.Multer.File,

    @Req()
    req: any,

    @Query("context")
    context?: string,
  ) {
    // =========================================================================
    // FILE VALIDATION
    // =========================================================================

    if (!file) {
      throw new BadRequestException(
        "No file uploaded.",
      );
    }

    // =========================================================================
    // AUTHENTICATED USER
    // =========================================================================

    const userId =
      req?.user?.id ??
      req?.user?._id;

    if (!userId) {
      throw new BadRequestException(
        "Authenticated user ID is missing.",
      );
    }

    // =========================================================================
    // PRODUCER AUTHORIZATION
    // =========================================================================
    //
    // Only approved Music creators can upload creator content.
    //
    // =========================================================================

    await this.producerService
      .requireApprovedProducer(
        String(userId),
      );

    // =========================================================================
    // PROCESS UPLOAD
    // =========================================================================

    const processed =
      await this.uploadService.processUpload(
        file,
        context,
      );

    if (!processed) {
      throw new BadRequestException(
        "Upload processing failed.",
      );
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    return {
      success: true,

      type:
        processed.type,

      filename:
        file.filename,

      originalName:
        file.originalname,

      mimetype:
        file.mimetype,

      size:
        file.size,

      storageKey:
        processed.storageKey,

      url:
        processed.url,

      path:
        processed.path,

      thumbnailUrl:
        processed.thumbnailUrl ??
        null,

      thumbnailPath:
        processed.thumbnailPath ??
        null,
    };
  }
}