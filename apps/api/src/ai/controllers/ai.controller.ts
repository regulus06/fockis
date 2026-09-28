import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Request } from "express";
import type { Response } from "express";
import { Storage } from "@google-cloud/storage";
import { FileInterceptor } from "@nestjs/platform-express";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CreateAiJobDto } from "../dto/create-ai-job.dto";
import { AiService } from "../services/ai.service";

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    _id?: string;
    userId?: string;
    sub?: string;
  };
}

@Controller("ai")
@UseGuards(JwtAuthGuard)
export class AiController {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(
    private readonly aiService: AiService,
  ) {
    this.storage = new Storage();

    this.bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET ||
      "fockis-ai-media-2026";
  }

  // ============================================================
  // AI CREDITS
  // ============================================================

  @Get("credits")
  async getCredits(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.getCredits(
      this.getUserId(req),
    );
  }

  // ============================================================
  // CREATE AI JOB
  // ============================================================

  @Post("jobs")
  async createJob(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAiJobDto,
  ) {
    return this.aiService.createJob(
      this.getUserId(req),
      dto,
    );
  }

  // ============================================================
  // UPLOAD AI VIDEO STARTING IMAGE
  // ============================================================

  @Post("jobs/image-upload")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },

      fileFilter: (
        _req,
        file,
        callback,
      ) => {
        const allowed = new Set([
          "image/jpeg",
          "image/png",
          "image/webp",
        ]);

        if (
          !allowed.has(
            file.mimetype.toLowerCase(),
          )
        ) {
          callback(
            new BadRequestException(
              "Only JPEG, PNG, and WebP images are supported.",
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadVideoImage(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const userId =
      this.getUserId(req);

    if (!file) {
      throw new BadRequestException(
        "An image file is required.",
      );
    }

    const extension =
      file.mimetype === "image/png"
        ? "png"
        : file.mimetype === "image/webp"
          ? "webp"
          : "jpg";

    const objectName =
      `fockis-ai/users/${userId}/video-inputs/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}.${extension}`;

    const storageFile =
      this.storage
        .bucket(this.bucketName)
        .file(objectName);

    await storageFile.save(
      file.buffer,
      {
        resumable: false,

        metadata: {
          contentType:
            file.mimetype,

          cacheControl:
            "private,max-age=0,no-store",
        },
      },
    );

    const imageGcsUri =
      `gs://${this.bucketName}/${objectName}`;

    return {
      imageGcsUri,
      imageMimeType:
        file.mimetype,
      objectName,
    };
  }

  // ============================================================
  // AI JOB HISTORY
  // ============================================================

  @Get("jobs")
  async getHistory(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.aiService.getHistory(
      this.getUserId(req),
    );
  }

  // ============================================================
  // GET AI JOB
  // ============================================================

  @Get("jobs/:id")
  async getJob(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.aiService.getJob(
      this.getUserId(req),
      id,
    );
  }

  // ============================================================
  // GET SIGNED AI VIDEO URL
  //
  // IMPORTANT:
  // This endpoint NEVER returns gs:// to the browser.
  // It ALWAYS converts GCS storage locations into
  // an HTTPS V4 signed URL.
  // ============================================================

  @Get("jobs/:id/media-url")
  async getMediaUrl(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    const userId =
      this.getUserId(req);

    try {
      const job =
        await this.aiService.getJob(
          userId,
          id,
        );

      if (!job) {
        throw new NotFoundException(
          "AI job was not found.",
        );
      }

      const jobData =
        job as any;

      const status =
        String(
          jobData.status ?? "",
        ).toLowerCase();

      const completed =
        status === "completed" ||
        status === "complete" ||
        status === "succeeded" ||
        status === "success";

      if (!completed) {
        throw new NotFoundException(
          `Video is not available. Current job status: ${
            jobData.status || "unknown"
          }`,
        );
      }

      // ----------------------------------------------------------
      // Find stored media URI
      // ----------------------------------------------------------

      let gcsUri =
        jobData.resultUrl ??
        jobData.mediaUrl ??
        jobData.videoUrl ??
        jobData.outputUrl ??
        jobData.outputGcsUri ??
        jobData.result?.resultUrl ??
        jobData.result?.mediaUrl ??
        jobData.result?.videoUrl ??
        jobData.result?.outputUrl ??
        jobData.result?.outputGcsUri ??
        jobData.metadata?.resultUrl ??
        jobData.metadata?.outputGcsUri;

      // ----------------------------------------------------------
      // Repair old jobs
      // ----------------------------------------------------------

      const legacyMediaPath =
        `/ai/jobs/${id}/media`;

      if (
        typeof gcsUri === "string" &&
        (
          gcsUri === legacyMediaPath ||
          gcsUri.endsWith(legacyMediaPath)
        )
      ) {
        gcsUri =
          `gs://${this.bucketName}/fockis-ai/jobs/${id}/final/final.mp4`;
      }

      console.log(
        "[FOCKIS AI] MEDIA URL REQUEST",
        {
          jobId: id,
          status,
          storedResultUrl:
            jobData.resultUrl,
          resolvedGcsUri:
            gcsUri,
        },
      );

      if (
        !gcsUri ||
        typeof gcsUri !== "string"
      ) {
        throw new NotFoundException(
          "The completed AI job does not contain a video location.",
        );
      }

      // ----------------------------------------------------------
      // IMPORTANT:
      // Never expose gs:// to browser.
      // ----------------------------------------------------------

      if (
        gcsUri.startsWith("gs://")
      ) {
        const storagePath =
          gcsUri.substring(
            "gs://".length,
          );

        const slashIndex =
          storagePath.indexOf("/");

        if (slashIndex === -1) {
          throw new NotFoundException(
            "Invalid Google Cloud Storage video path.",
          );
        }

        const bucketName =
          storagePath.substring(
            0,
            slashIndex,
          );

        const objectName =
          storagePath.substring(
            slashIndex + 1,
          );

        if (
          bucketName !==
          this.bucketName
        ) {
          throw new NotFoundException(
            "The AI video belongs to an unexpected storage bucket.",
          );
        }

        if (!objectName) {
          throw new NotFoundException(
            "The AI video object name is missing.",
          );
        }

        const file =
          this.storage
            .bucket(bucketName)
            .file(objectName);

        const [
          exists,
        ] =
          await file.exists();

        if (!exists) {
          console.error(
            "[FOCKIS AI] VIDEO OBJECT NOT FOUND",
            {
              bucketName,
              objectName,
            },
          );

          throw new NotFoundException(
            "The generated video file could not be found in Google Cloud Storage.",
          );
        }

        // --------------------------------------------------------
        // Generate HTTPS V4 signed URL
        // --------------------------------------------------------

        const expiresAt =
          Date.now() +
          60 * 60 * 1000;

        const [
          signedUrl,
        ] =
          await file.getSignedUrl({
            version: "v4",
            action: "read",
            expires: expiresAt,
          });

        // Safety check.
        // If Google somehow returned anything other than HTTPS,
        // do not send it to the browser.
        if (
          !signedUrl.startsWith(
            "https://",
          )
        ) {
          throw new InternalServerErrorException(
            "Google Cloud Storage did not return a valid HTTPS signed URL.",
          );
        }

        console.log(
          "[FOCKIS AI] HTTPS SIGNED VIDEO URL CREATED",
          {
            jobId: id,
            bucket: bucketName,
            objectName,
            isHttps:
              signedUrl.startsWith(
                "https://",
              ),
          },
        );

        return {
          url: signedUrl,
          signedUrl,
          jobId: id,
          bucket: bucketName,
          objectName,
        };
      }

      // ----------------------------------------------------------
      // Existing HTTPS URL
      // ----------------------------------------------------------

      if (
        gcsUri.startsWith(
          "https://",
        )
      ) {
        return {
          url: gcsUri,
          signedUrl: gcsUri,
          jobId: id,
        };
      }

      // ----------------------------------------------------------
      // Reject everything else.
      // ----------------------------------------------------------

      throw new NotFoundException(
        "The AI video location is not a valid HTTPS or Google Cloud Storage URI.",
      );
    } catch (error) {
      if (
        error instanceof
        NotFoundException
      ) {
        throw error;
      }

      if (
        error instanceof
        UnauthorizedException
      ) {
        throw error;
      }

      console.error(
        "[FOCKIS AI] MEDIA URL ERROR",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to create a playable video URL.",
      );
    }
  }

  // ============================================================
  // PLAY / DOWNLOAD AI VIDEO
  // ============================================================

  @Get("jobs/:id/media")
  async getMedia(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
    @Res() res: Response,
  ) {
    const userId =
      this.getUserId(req);

    try {
      const job =
        await this.aiService.getJob(
          userId,
          id,
        );

      if (!job) {
        throw new NotFoundException(
          "AI job was not found.",
        );
      }

      const jobData =
        job as any;

      const status =
        String(
          jobData.status ?? "",
        ).toLowerCase();

      const completed =
        status === "completed" ||
        status === "complete" ||
        status === "succeeded" ||
        status === "success";

      if (!completed) {
        throw new NotFoundException(
          `Video is not available. Current job status: ${
            jobData.status || "unknown"
          }`,
        );
      }

      let gcsUri =
        jobData.resultUrl ??
        jobData.mediaUrl ??
        jobData.videoUrl ??
        jobData.outputUrl ??
        jobData.outputGcsUri ??
        jobData.result?.resultUrl ??
        jobData.result?.mediaUrl ??
        jobData.result?.videoUrl ??
        jobData.result?.outputUrl ??
        jobData.result?.outputGcsUri ??
        jobData.metadata?.resultUrl ??
        jobData.metadata?.outputGcsUri;

      const legacyMediaPath =
        `/ai/jobs/${id}/media`;

      if (
        typeof gcsUri === "string" &&
        (
          gcsUri === legacyMediaPath ||
          gcsUri.endsWith(legacyMediaPath)
        )
      ) {
        gcsUri =
          `gs://${this.bucketName}/fockis-ai/jobs/${id}/final/final.mp4`;
      }

      if (
        !gcsUri ||
        typeof gcsUri !== "string"
      ) {
        throw new NotFoundException(
          "The completed AI job does not contain a video location.",
        );
      }

      // HTTPS URL
      if (
        gcsUri.startsWith(
          "https://",
        )
      ) {
        return res.redirect(
          302,
          gcsUri,
        );
      }

      // GCS URI
      if (
        !gcsUri.startsWith(
          "gs://",
        )
      ) {
        throw new NotFoundException(
          "The AI video location is invalid.",
        );
      }

      const storagePath =
        gcsUri.substring(
          "gs://".length,
        );

      const slashIndex =
        storagePath.indexOf("/");

      if (slashIndex === -1) {
        throw new NotFoundException(
          "Invalid Google Cloud Storage video path.",
        );
      }

      const bucketName =
        storagePath.substring(
          0,
          slashIndex,
        );

      const objectName =
        storagePath.substring(
          slashIndex + 1,
        );

      if (
        bucketName !==
        this.bucketName
      ) {
        throw new NotFoundException(
          "The AI video belongs to an unexpected storage bucket.",
        );
      }

      const file =
        this.storage
          .bucket(bucketName)
          .file(objectName);

      const [
        exists,
      ] =
        await file.exists();

      if (!exists) {
        throw new NotFoundException(
          "The generated video file could not be found in Google Cloud Storage.",
        );
      }

      const expiresAt =
        Date.now() +
        60 * 60 * 1000;

      const [
        signedUrl,
      ] =
        await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: expiresAt,
        });

      return res.redirect(
        302,
        signedUrl,
      );
    } catch (error) {
      if (
        error instanceof
        NotFoundException
      ) {
        throw error;
      }

      if (
        error instanceof
        UnauthorizedException
      ) {
        throw error;
      }

      console.error(
        "[FOCKIS AI] MEDIA ERROR",
        error,
      );

      throw new InternalServerErrorException(
        "Unable to create a playable video URL.",
      );
    }
  }

  // ============================================================
  // CANCEL AI JOB
  // ============================================================

  @Post("jobs/:id/cancel")
  async cancelJob(
    @Req() req: AuthenticatedRequest,
    @Param("id") id: string,
  ) {
    return this.aiService.cancelJob(
      this.getUserId(req),
      id,
    );
  }

  // ============================================================
  // AUTHENTICATED USER ID
  // ============================================================

  private getUserId(
    req: AuthenticatedRequest,
  ): string {
    const user =
      req.user;

    const id =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!id) {
      throw new UnauthorizedException(
        "Authenticated user ID was not found.",
      );
    }

    return String(id);
  }
}