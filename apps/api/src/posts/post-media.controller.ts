import {
  Controller,
  Get,
  Head,
  Param,
  NotFoundException,
  Req,
  Res,
} from "@nestjs/common";

import { Storage } from "@google-cloud/storage";

import type { Request, Response } from "express";

import { Public } from "../auth/public.decorator";

@Public()
@Controller("post-media")
export class PostMediaController {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor() {
    this.bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() || "";

    if (!this.bucketName) {
      console.error(
        "❌ GOOGLE_CLOUD_STORAGE_BUCKET is not configured.",
      );
    }

    this.storage = this.createStorage();
  }

  /**
   * GET /post-media/:filename
   *
   * Streams a post image/video directly from Google Cloud Storage.
   *
   * Render acts as the stable media gateway for Fockis.
   */
  @Get(":filename")
  async getMedia(
    @Param("filename") filename: string,
    @Res() res: Response,
    @Req() req: Request,
  ): Promise<void> {
    await this.streamMedia(filename, req, res);
  }

  /**
   * HEAD /post-media/:filename
   *
   * Lets browsers/CDNs inspect media metadata without downloading
   * the entire file.
   */
  @Head(":filename")
  async headMedia(
    @Param("filename") filename: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.bucketName) {
      throw new NotFoundException(
        "Google Cloud Storage bucket is not configured.",
      );
    }

    const safeFilename = this.sanitizeFilename(filename);

    if (!safeFilename) {
      throw new NotFoundException("Invalid media filename.");
    }

    const objectName = `posts/${safeFilename}`;

    const file = this.storage
      .bucket(this.bucketName)
      .file(objectName);

    try {
      const [metadata] = await file.getMetadata();

      const contentType =
        metadata.contentType ||
        this.detectContentType(safeFilename);

      const size = Number(metadata.size || 0);

      res.status(200);

      this.setMediaHeaders(res, {
        contentType,
        contentLength: size,
      });

      res.end();
    } catch (error) {
      console.error(
        `❌ GCS HEAD failed for ${objectName}:`,
        this.getErrorMessage(error),
      );

      throw new NotFoundException("Media file not found.");
    }
  }

  /**
   * Streams media from Google Cloud Storage.
   *
   * Supports:
   * - images
   * - MP4/video
   * - HTTP range requests
   * - seeking
   * - progressive playback
   * - browser cross-origin loading
   */
  private async streamMedia(
    filename: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    if (!this.bucketName) {
      throw new NotFoundException(
        "Google Cloud Storage bucket is not configured.",
      );
    }

    const safeFilename = this.sanitizeFilename(filename);

    if (!safeFilename) {
      throw new NotFoundException("Invalid media filename.");
    }

    const objectName = `posts/${safeFilename}`;

    const file = this.storage
      .bucket(this.bucketName)
      .file(objectName);

    try {
      const [metadata] = await file.getMetadata();

      const totalSize = Number(metadata.size || 0);

      if (!Number.isFinite(totalSize) || totalSize <= 0) {
        throw new Error("GCS object has an invalid size.");
      }

      const contentType =
        metadata.contentType ||
        this.detectContentType(safeFilename);

      const rangeHeader = req.headers.range;

      /**
       * No Range header:
       * return the complete file.
       */
      if (!rangeHeader) {
        res.status(200);

        this.setMediaHeaders(res, {
          contentType,
          contentLength: totalSize,
        });

        const stream = file.createReadStream();

        stream.on("error", (error) => {
          console.error(
            `❌ GCS media stream failed for ${objectName}:`,
            this.getErrorMessage(error),
          );

          if (!res.headersSent) {
            res.status(404).end();
          } else {
            res.end();
          }
        });

        stream.pipe(res);

        return;
      }

      /**
       * HTTP Range support.
       *
       * Required for:
       * - MP4 playback
       * - seeking
       * - progressive loading
       * - browser video controls
       */
      const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(
        rangeHeader,
      );

      if (!rangeMatch) {
        res.status(416);

        res.setHeader(
          "Content-Range",
          `bytes */${totalSize}`,
        );

        this.setCrossOriginHeaders(res);

        res.end();

        return;
      }

      const startText = rangeMatch[1] || "";
      const endText = rangeMatch[2] || "";

      let start = startText ? Number(startText) : 0;

      let end = endText
        ? Number(endText)
        : totalSize - 1;

      /**
       * Suffix range:
       *
       * bytes=-500000
       */
      if (!startText && endText) {
        const suffixLength = Number(endText);

        if (
          !Number.isFinite(suffixLength) ||
          suffixLength <= 0
        ) {
          res.status(416);

          res.setHeader(
            "Content-Range",
            `bytes */${totalSize}`,
          );

          this.setCrossOriginHeaders(res);

          res.end();

          return;
        }

        start = Math.max(
          totalSize - suffixLength,
          0,
        );

        end = totalSize - 1;
      }

      /**
       * Validate requested range.
       */
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 0 ||
        end < start ||
        start >= totalSize
      ) {
        res.status(416);

        res.setHeader(
          "Content-Range",
          `bytes */${totalSize}`,
        );

        this.setCrossOriginHeaders(res);

        res.end();

        return;
      }

      /**
       * Clamp end to the actual file size.
       */
      end = Math.min(end, totalSize - 1);

      const chunkSize = end - start + 1;

      res.status(206);

      this.setMediaHeaders(res, {
        contentType,
        contentLength: chunkSize,
        contentRange: `bytes ${start}-${end}/${totalSize}`,
      });

      const stream = file.createReadStream({
        start,
        end,
      });

      stream.on("error", (error) => {
        console.error(
          `❌ GCS range stream failed for ${objectName}:`,
          this.getErrorMessage(error),
        );

        if (!res.headersSent) {
          res.status(404).end();
        } else {
          res.end();
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error(
        `❌ GCS media request failed for ${objectName}:`,
        this.getErrorMessage(error),
      );

      throw new NotFoundException(
        "Media file not found.",
      );
    }
  }

  /**
   * Apply all headers required for Fockis media.
   *
   * IMPORTANT:
   * Fockis frontend is hosted on Vercel while media
   * is served from Render. Chrome therefore needs the
   * response explicitly marked as cross-origin safe.
   */
  private setMediaHeaders(
    res: Response,
    options: {
      contentType: string;
      contentLength: number;
      contentRange?: string;
    },
  ): void {
    res.setHeader(
      "Content-Type",
      options.contentType,
    );

    res.setHeader(
      "Content-Length",
      String(options.contentLength),
    );

    res.setHeader(
      "Accept-Ranges",
      "bytes",
    );

    if (options.contentRange) {
      res.setHeader(
        "Content-Range",
        options.contentRange,
      );
    }

    res.setHeader(
      "Cache-Control",
      "public, max-age=3600",
    );

    res.setHeader(
      "Content-Disposition",
      "inline",
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff",
    );

    this.setCrossOriginHeaders(res);
  }

  /**
   * Cross-origin headers required because:
   *
   * Frontend:
   *   https://fockis.vercel.app
   *
   * Backend/media:
   *   https://fockis.onrender.com
   */
  private setCrossOriginHeaders(
    res: Response,
  ): void {
    res.setHeader(
      "Cross-Origin-Resource-Policy",
      "cross-origin",
    );

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*",
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, HEAD, OPTIONS",
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Range, Cache-Control, Pragma, Content-Type",
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    );

    res.setHeader(
      "Vary",
      "Origin",
    );
  }

  /**
   * Prevent path traversal.
   */
  private sanitizeFilename(
    filename: string,
  ): string {
    let decoded: string;

    try {
      decoded = decodeURIComponent(
        String(filename || ""),
      );
    } catch {
      return "";
    }

    const clean =
      decoded
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        ?.trim() || "";

    if (
      !clean ||
      clean === "." ||
      clean === ".." ||
      clean.includes("..")
    ) {
      return "";
    }

    return clean;
  }

  /**
   * Detect media type when GCS metadata doesn't contain it.
   */
  private detectContentType(
    filename: string,
  ): string {
    const lower = filename.toLowerCase();

    if (
      lower.endsWith(".mp4") ||
      lower.endsWith(".m4v")
    ) {
      return "video/mp4";
    }

    if (lower.endsWith(".webm")) {
      return "video/webm";
    }

    if (lower.endsWith(".mov")) {
      return "video/quicktime";
    }

    if (lower.endsWith(".avi")) {
      return "video/x-msvideo";
    }

    if (lower.endsWith(".mkv")) {
      return "video/x-matroska";
    }

    if (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg")
    ) {
      return "image/jpeg";
    }

    if (lower.endsWith(".png")) {
      return "image/png";
    }

    if (lower.endsWith(".gif")) {
      return "image/gif";
    }

    if (lower.endsWith(".webp")) {
      return "image/webp";
    }

    if (lower.endsWith(".avif")) {
      return "image/avif";
    }

    if (lower.endsWith(".svg")) {
      return "image/svg+xml";
    }

    return "application/octet-stream";
  }

  /**
   * Create the Google Cloud Storage client.
   */
  private createStorage(): Storage {
    const projectId =
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      undefined;

    const rawCredentials =
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();

    if (!rawCredentials) {
      console.warn(
        "⚠️ GOOGLE_SERVICE_ACCOUNT_JSON is not configured. Using Application Default Credentials.",
      );

      return new Storage({
        projectId,
      });
    }

    try {
      const parsed = JSON.parse(rawCredentials);

      const clientEmail = String(
        parsed.client_email || "",
      ).trim();

      const privateKey = String(
        parsed.private_key || "",
      )
        .replace(/\\n/g, "\n")
        .replace(/\r\n/g, "\n")
        .trim();

      if (!clientEmail) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email.",
        );
      }

      if (!privateKey) {
        throw new Error(
          "GOOGLE_SERVICE_ACCOUNT_JSON is missing private_key.",
        );
      }

      console.log(
        "✅ Post media GCS credentials loaded:",
        {
          projectId,
          clientEmail,
          hasPrivateKey: true,
        },
      );

      return new Storage({
        projectId,
        credentials: {
          client_email: clientEmail,
          private_key: privateKey,
        },
      });
    } catch (error) {
      const message =
        this.getErrorMessage(error);

      console.error(
        "❌ Failed to initialize post media GCS:",
        message,
      );

      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_JSON is invalid: ${message}`,
      );
    }
  }

  private getErrorMessage(
    error: unknown,
  ): string {
    return error instanceof Error
      ? error.message
      : String(error);
  }
}