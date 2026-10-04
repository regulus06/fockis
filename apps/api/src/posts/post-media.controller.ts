import {

  Controller,

  Get,

  Head,

  Param,

  NotFoundException,

  Req,

  Res,

} from "@nestjs/common";



import { File, Storage } from "@google-cloud/storage";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { basename, resolve } from "path";

import type { Request, Response } from "express";



import { Public } from "../auth/public.decorator";



@Public()

@Controller("post-media")

export class PostMediaController {

  private readonly storage: Storage;

  private readonly bucketName: string;
  private readonly localUploadDirectories: string[];

  private readonly mediaPrefixes = [
    "posts",
    "stories",
    "story-media",
  ];



  constructor() {

    this.bucketName =

      process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() || "";



    if (!this.bucketName) {

      console.error(

        "❌ GOOGLE_CLOUD_STORAGE_BUCKET is not configured.",

      );

    }



    this.storage = this.createStorage();

    this.localUploadDirectories = [
      resolve(process.cwd(), "uploads"),
      resolve(process.cwd(), "apps", "api", "uploads"),
    ].filter(
      (directory, index, all) =>
        all.indexOf(directory) === index,
    );

  }



  /**

   * GET /post-media/:filename

   *

   * Streams an image/video from Google Cloud Storage.

   *

   * The gateway searches the supported Fockis media folders so existing

   * post media and story media can use the same frontend URL.

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
    const safeFilename = this.sanitizeFilename(filename);

    if (!safeFilename) {
      throw new NotFoundException("Invalid media filename.");
    }

    const resolved = await this.findMediaFile(safeFilename);

    if (!resolved) {
      throw new NotFoundException("Media file not found.");
    }

    try {
      if (resolved.source === "local") {
        const metadata = await stat(resolved.filePath);
        const contentType = this.detectContentType(safeFilename);

        res.status(200);
        this.setMediaHeaders(res, {
          contentType,
          contentLength: metadata.size,
        });
        res.end();
        return;
      }

      const [metadata] = await resolved.file.getMetadata();
      const contentType =
        metadata.contentType ||
        this.detectContentType(safeFilename);
      const size = Number(metadata.size || 0);

      if (!Number.isFinite(size) || size < 0) {
        throw new Error("GCS object has an invalid size.");
      }

      res.status(200);
      this.setMediaHeaders(res, {
        contentType,
        contentLength: size,
      });
      res.end();
    } catch (error) {
      console.error(
        `❌ HEAD media failed for ${safeFilename}:`,
        this.getErrorMessage(error),
      );
      throw new NotFoundException("Media file not found.");
    }
  }

  /**
   * Streams media from Google Cloud Storage or the local uploads folder.
   *
   * Supports:
   * - images
   * - MP4/video
   * - HTTP range requests
   * - seeking
   * - progressive loading
   */
  private async streamMedia(
    filename: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const safeFilename = this.sanitizeFilename(filename);

    if (!safeFilename) {
      throw new NotFoundException("Invalid media filename.");
    }

    const resolved = await this.findMediaFile(safeFilename);

    if (!resolved) {
      console.error(
        `❌ Media file not found in GCS or local uploads: ${safeFilename}`,
      );
      throw new NotFoundException("Media file not found.");
    }

    try {
      let totalSize = 0;
      let contentType = this.detectContentType(safeFilename);

      if (resolved.source === "local") {
        const metadata = await stat(resolved.filePath);
        totalSize = Number(metadata.size);

        if (!Number.isFinite(totalSize) || totalSize <= 0) {
          throw new Error("Local media file has an invalid size.");
        }
      } else {
        const [metadata] = await resolved.file.getMetadata();
        totalSize = Number(metadata.size || 0);
        contentType =
          metadata.contentType ||
          contentType;

        if (!Number.isFinite(totalSize) || totalSize <= 0) {
          throw new Error("GCS object has an invalid size.");
        }
      }

      const rangeHeader = req.headers.range;

      const openStream = (start?: number, end?: number) => {
        if (resolved.source === "local") {
          return createReadStream(
            resolved.filePath,
            start !== undefined && end !== undefined
              ? { start, end }
              : undefined,
          );
        }

        return resolved.file.createReadStream(
          start !== undefined && end !== undefined
            ? { start, end }
            : undefined,
        );
      };

      if (!rangeHeader) {
        res.status(200);
        this.setMediaHeaders(res, {
          contentType,
          contentLength: totalSize,
        });

        const stream = openStream();

        stream.on("error", (error) => {
          console.error(
            `❌ Media stream failed for ${safeFilename}:`,
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

      const rangeMatch =
        /^bytes=(\d*)-(\d*)$/.exec(
          String(rangeHeader),
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

      end = Math.min(end, totalSize - 1);

      const chunkSize = end - start + 1;

      res.status(206);
      this.setMediaHeaders(res, {
        contentType,
        contentLength: chunkSize,
        contentRange: `bytes ${start}-${end}/${totalSize}`,
      });

      const stream = openStream(start, end);

      stream.on("error", (error) => {
        console.error(
          `❌ Media range stream failed for ${safeFilename}:`,
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
        `❌ Media request failed for ${safeFilename}:`,
        this.getErrorMessage(error),
      );

      throw new NotFoundException(
        "Media file not found.",
      );
    }
  }

  /**
   * Locate media in GCS first, then fall back to the local
   * ./uploads directory used by the NestJS upload endpoint.
   */
  private async findMediaFile(
    filename: string,
  ): Promise<
    | {
        source: "gcs";
        file: File;
        objectName: string;
      }
    | {
        source: "local";
        filePath: string;
        objectName: string;
      }
    | null
  > {
    if (this.bucketName) {
      const bucket = this.storage.bucket(
        this.bucketName,
      );

      for (const prefix of this.mediaPrefixes) {
        const objectName = `${prefix}/${filename}`;
        const file = bucket.file(objectName);

        try {
          await file.getMetadata();

          console.log(
            `✅ Fockis media resolved from GCS: ${objectName}`,
          );

          return {
            source: "gcs",
            file,
            objectName,
          };
        } catch {
          // Continue to the next GCS media prefix.
        }
      }
    }

    for (const directory of this.localUploadDirectories) {
      const filePath = resolve(
        directory,
        filename,
      );

      if (basename(filePath) !== filename) {
        continue;
      }

      try {
        const metadata = await stat(filePath);

        if (!metadata.isFile()) {
          continue;
        }

        console.log(
          `✅ Fockis media resolved from local uploads: ${filePath}`,
        );

        return {
          source: "local",
          filePath,
          objectName: `uploads/${filename}`,
        };
      } catch {
        // Continue to the next local uploads directory.
      }
    }

    return null;
  }

/**

   * Apply all headers required for Fockis media.

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

   *   https\://fockis.vercel.app

   *

   * Backend/media:

   *   https\://fockis.onrender.com

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



    const clean = decoded

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

        error instanceof Error

          ? error.message

          : String(error);



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
