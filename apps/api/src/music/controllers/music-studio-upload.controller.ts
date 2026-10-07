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
  CloudStorageService,
} from "../../uploads/cloud-storage.service";

// ============================================================================
// FOCKIS MUSIC STUDIO UPLOAD
// ============================================================================
//
// POST /music/studio/upload
//
// FormData:
//
//   file = audio / video / image
//
// Optional:
//
//   ?context=music
//   ?context=story
//
// IMPORTANT:
//
// This endpoint ONLY handles:
//
//   1. Authentication
//   2. Producer authorization
//   3. Multipart upload
//   4. Original-file upload to Google Cloud Storage
//   5. Returning the storage key
//
// FFmpeg processing is NOT performed inside this HTTP request.
//
// This prevents Render HTTP 502 / timeout problems with large media files.
//
// The later MusicMediaProcessingService is responsible for:
//
//   GCS source
//      ↓
//   FFmpeg
//      ↓
//   processed media
//      ↓
//   GCS
//      ↓
//   READY
//
// ============================================================================

const GB =
  1024 *
  1024 *
  1024;

/**
 * Maximum multipart upload accepted by the transport layer.
 *
 * Largest supported Fockis media type:
 *
 * Recorded Live Stream = 30 GB
 */
const MAX_MUSIC_STUDIO_UPLOAD_BYTES =
  30 * GB;

@Controller("music/studio")
export class MusicStudioUploadController {
  constructor(
    private readonly producerService:
      ProducerService,

    private readonly cloudStorageService:
      CloudStorageService,
  ) {}

  // ==========================================================================
  // POST /music/studio/upload
  // ==========================================================================

  @Post("upload")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      // ========================================================================
      // DISK STORAGE
      // ========================================================================
      //
      // DO NOT use memoryStorage().
      //
      // Large music/video files must be written to disk.
      //
      // ========================================================================

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

      // ========================================================================
      // TRANSPORT LIMIT
      // ========================================================================

      limits: {
        fileSize:
          MAX_MUSIC_STUDIO_UPLOAD_BYTES,
      },

      // ========================================================================
      // ALLOWED FILE TYPES
      // ========================================================================

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
          // ====================================================================
          // AUDIO
          // ====================================================================

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

          // ====================================================================
          // VIDEO
          // ====================================================================

          "video/mp4",
          "video/webm",
          "video/quicktime",
          "video/x-matroska",
          "video/mov",
          "video/x-msvideo",

          // ====================================================================
          // IMAGE / COVER ART
          // ====================================================================

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
    // Keep this check.
    //
    // We are NOT removing the JwtAuthGuard or producer authorization.
    //
    // =========================================================================

    await this.producerService
      .requireApprovedProducer(
        String(userId),
      );

    // =========================================================================
    // CREATE GCS STORAGE KEY
    // =========================================================================

    const storageKey =
      this.cloudStorageService.createObjectKey(
        "music/source",
        file.originalname,
      );

    console.log(
      "[MUSIC STUDIO] Uploading source file to GCS:",
      {
        userId:
          String(userId),

        context:
          context ||
          "music",

        originalName:
          file.originalname,

        mimeType:
          file.mimetype,

        size:
          file.size,

        storageKey,
      },
    );

    // =========================================================================
    // UPLOAD ORIGINAL FILE TO GOOGLE CLOUD STORAGE
    // =========================================================================

    await this.cloudStorageService.uploadFile(
      file.path,
      storageKey,
      file.mimetype,
    );

    console.log(
      "[MUSIC STUDIO] Source upload complete:",
      {
        storageKey,
      },
    );

    // =========================================================================
    // REMOVE TEMPORARY RENDER DISK FILE
    // =========================================================================

    try {
      const {
        unlink,
      } = await import(
        "fs/promises"
      );

      await unlink(
        file.path,
      );
    } catch (error) {
      console.warn(
        "[MUSIC STUDIO] Could not remove temporary upload file:",
        error,
      );
    }

    // =========================================================================
    // FOCKIS MEDIA GATEWAY URL
    // =========================================================================
    //
    // IMPORTANT:
    //
    // Do NOT expose a private GCS signed URL to the browser.
    //
    // The browser uses:
    //
    //   /uploads/media/<storageKey>
    //
    // The Fockis API streams the private GCS object.
    //
    // =========================================================================

    const apiBaseUrl =
      (
        process.env.PUBLIC_API_URL ||
        process.env.API_PUBLIC_URL ||
        "https://fockis.onrender.com"
      )
        .trim()
        .replace(
          /\/+$/,
          "",
        );

    const mediaUrl =
      `${apiBaseUrl}/uploads/media/${encodeURIComponent(
        storageKey,
      )}`;

    // =========================================================================
    // DETERMINE MEDIA TYPE
    // =========================================================================

    let type:
      | "audio"
      | "video"
      | "image";

    if (
      file.mimetype
        ?.toLowerCase()
        .startsWith("audio/")
    ) {
      type = "audio";
    } else if (
      file.mimetype
        ?.toLowerCase()
        .startsWith("video/")
    ) {
      type = "video";
    } else {
      type = "image";
    }

    // =========================================================================
    // RESPONSE
    // =========================================================================

    return {
      success: true,

      type,

      filename:
        file.filename,

      originalName:
        file.originalname,

      mimetype:
        file.mimetype,

      size:
        file.size,

      storageKey,

      url:
        mediaUrl,

      path:
        mediaUrl,

      thumbnailUrl:
        null,

      thumbnailPath:
        null,

      processing:
        true,
    };
  }
}