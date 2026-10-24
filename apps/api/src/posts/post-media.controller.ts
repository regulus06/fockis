import {
  Controller,
  Get,
  Head,
  NotFoundException,
  Param,
  Req,
  Res,
} from "@nestjs/common";
import { File, Storage } from "@google-cloud/storage";
import { createReadStream, existsSync } from "fs";
import { stat } from "fs/promises";
import { basename, resolve } from "path";
import type { Request, Response } from "express";
import { Public } from "../auth/public.decorator";

type ResolvedMedia =
  | { source: "gcs"; file: File; objectName: string }
  | { source: "local"; filePath: string; objectName: string };

@Controller("post-media")
@Public()
export class PostMediaController {
  private readonly storage: Storage;
  private readonly bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() || "";
  private readonly localUploadDirectories = [
    resolve(process.cwd(), "uploads"),
    resolve(process.cwd(), "apps", "api", "uploads"),
  ].filter((directory, index, all) => all.indexOf(directory) === index);

  // Keep legacy locations while also checking the folder used for uploaded images.
  private readonly mediaPrefixes = [
    "posts",
    "posts/images",
    "posts/videos",
    "post-media",
    "stories",
    "story-media",
  ];

  constructor() {
    this.storage = this.createStorage();
    if (!this.bucketName) {
      console.error("[PostMedia] GOOGLE_CLOUD_STORAGE_BUCKET is not configured.");
    } else {
      console.log(`[PostMedia] Configured storage bucket: ${this.bucketName}`);
    }
    console.log("[PostMedia] Local upload directories:", this.localUploadDirectories);
  }

  @Get(":filename")
  async getMedia(@Param("filename") filename: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    await this.streamMedia(filename, req, res);
  }

  @Head(":filename")
  async headMedia(@Param("filename") filename: string, @Res() res: Response): Promise<void> {
    const safeFilename = this.sanitizeFilename(filename);
    if (!safeFilename) throw new NotFoundException("Invalid media filename.");
    const resolved = await this.findMediaFile(safeFilename);
    if (!resolved) throw new NotFoundException("Media file not found.");

    try {
      let contentType = this.detectContentType(safeFilename);
      let contentLength: number;
      if (resolved.source === "local") {
        contentLength = (await stat(resolved.filePath)).size;
      } else {
        const [metadata] = await resolved.file.getMetadata();
        contentLength = Number(metadata.size || 0);
        contentType = metadata.contentType || contentType;
      }
      res.status(200);
      this.setMediaHeaders(res, { contentType, contentLength });
      res.end();
    } catch (error) {
      console.error(`[PostMedia] HEAD failed for ${safeFilename}:`, this.errorMessage(error));
      if (!res.headersSent) throw new NotFoundException("Media file not found.");
      res.end();
    }
  }

  private async streamMedia(filename: string, req: Request, res: Response): Promise<void> {
    const safeFilename = this.sanitizeFilename(filename);
    if (!safeFilename) throw new NotFoundException("Invalid media filename.");
    const resolved = await this.findMediaFile(safeFilename);
    if (!resolved) {
      console.error(`[PostMedia] Media not found in cloud storage or local uploads: ${safeFilename}`);
      throw new NotFoundException("Media file not found.");
    }

    try {
      let totalSize: number;
      let contentType = this.detectContentType(safeFilename);
      if (resolved.source === "local") {
        totalSize = (await stat(resolved.filePath)).size;
      } else {
        const [metadata] = await resolved.file.getMetadata();
        totalSize = Number(metadata.size || 0);
        contentType = metadata.contentType || contentType;
      }
      if (!Number.isFinite(totalSize) || totalSize <= 0) throw new Error("Media file has an invalid size.");

      console.log(`[PostMedia] Streaming ${safeFilename} from ${resolved.source}: ${resolved.objectName}`);
      const openStream = (start?: number, end?: number) => resolved.source === "local"
        ? createReadStream(resolved.filePath, start !== undefined && end !== undefined ? { start, end } : undefined)
        : resolved.file.createReadStream(start !== undefined && end !== undefined ? { start, end } : undefined);

      const rangeHeader = req.headers.range;
      if (!rangeHeader) {
        res.status(200);
        this.setMediaHeaders(res, { contentType, contentLength: totalSize });
        const stream = openStream();
        stream.on("error", (error) => this.handleStreamError(error, res, safeFilename));
        stream.pipe(res);
        return;
      }

      const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
      if (!match) return this.sendRangeNotSatisfiable(res, totalSize);
      const startText = match[1] || "";
      const endText = match[2] || "";
      let start = startText ? Number(startText) : 0;
      let end = endText ? Number(endText) : totalSize - 1;
      if (!startText && endText) {
        const suffixLength = Number(endText);
        if (!Number.isFinite(suffixLength) || suffixLength <= 0) return this.sendRangeNotSatisfiable(res, totalSize);
        start = Math.max(totalSize - suffixLength, 0);
        end = totalSize - 1;
      }
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= totalSize) {
        return this.sendRangeNotSatisfiable(res, totalSize);
      }
      end = Math.min(end, totalSize - 1);
      res.status(206);
      this.setMediaHeaders(res, {
        contentType,
        contentLength: end - start + 1,
        contentRange: `bytes ${start}-${end}/${totalSize}`,
      });
      const stream = openStream(start, end);
      stream.on("error", (error) => this.handleStreamError(error, res, safeFilename));
      stream.pipe(res);
    } catch (error) {
      console.error(`[PostMedia] Media request failed for ${safeFilename}:`, this.errorMessage(error));
      if (!res.headersSent) throw new NotFoundException("Media file not found.");
      res.end();
    }
  }

  private async findMediaFile(filename: string): Promise<ResolvedMedia | null> {
    if (this.bucketName) {
      const bucket = this.storage.bucket(this.bucketName);
      for (const prefix of this.mediaPrefixes) {
        const objectName = `${prefix}/${filename}`;
        const file = bucket.file(objectName);
        try {
          await file.getMetadata();
          console.log(`[PostMedia] Cloud media found: gs://${this.bucketName}/${objectName}`);
          return { source: "gcs", file, objectName };
        } catch (error) {
          const message = this.errorMessage(error);
          // Do not spam logs for normal missing-object results. Surface auth failures clearly.
          if (!/\b(404|Not Found)\b/i.test(message)) {
            console.error(`[PostMedia] GCS lookup failed for ${objectName}: ${message}`);
          }
        }
      }
    }

    for (const directory of this.localUploadDirectories) {
      const filePath = resolve(directory, filename);
      if (basename(filePath) !== filename) continue;
      try {
        const metadata = await stat(filePath);
        if (metadata.isFile()) return { source: "local", filePath, objectName: `uploads/${filename}` };
      } catch {
        // Try the next known local upload directory.
      }
    }
    return null;
  }

  private createStorage(): Storage {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || "fockis";
    const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    // Match CloudStorageService's preferred credential source so both use the same identity.
    if (rawServiceAccount) {
      let account: { project_id?: string; client_email?: string; private_key?: string };
      try {
        account = JSON.parse(rawServiceAccount);
      } catch {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
      }
      if (!account.client_email || !account.private_key) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.");
      }
      return new Storage({
        projectId: projectId || account.project_id,
        credentials: {
          client_email: account.client_email,
          private_key: account.private_key.replace(/\\n/g, "\n"),
        },
      });
    }

    const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (configuredPath) {
      const credentialsPath = resolve(configuredPath);
      if (!existsSync(credentialsPath)) {
        throw new Error(`[PostMedia] GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`);
      }
      return new Storage({ projectId, keyFilename: credentialsPath });
    }

    // Allow Google Application Default Credentials in deployed environments.
    return new Storage({ projectId });
  }

  private sanitizeFilename(filename: string): string {
    let decoded: string;
    try { decoded = decodeURIComponent(String(filename || "")); } catch { return ""; }
    const clean = decoded.replace(/\\/g, "/").split("/").pop()?.trim() || "";
    if (!clean || clean === "." || clean === ".." || clean.includes("..")) return "";
    return clean;
  }

  private detectContentType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".mp4") || lower.endsWith(".m4v")) return "video/mp4";
    if (lower.endsWith(".webm")) return "video/webm";
    if (lower.endsWith(".mov")) return "video/quicktime";
    if (lower.endsWith(".avi")) return "video/x-msvideo";
    if (lower.endsWith(".mkv")) return "video/x-matroska";
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".gif")) return "image/gif";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".avif")) return "image/avif";
    if (lower.endsWith(".svg")) return "image/svg+xml";
    return "application/octet-stream";
  }

  private setMediaHeaders(res: Response, options: { contentType: string; contentLength: number; contentRange?: string }): void {
    res.setHeader("Content-Type", options.contentType);
    res.setHeader("Content-Length", String(options.contentLength));
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (options.contentRange) res.setHeader("Content-Range", options.contentRange);
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Cache-Control, Pragma, Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");
    res.setHeader("Vary", "Origin");
  }

  private sendRangeNotSatisfiable(res: Response, totalSize: number): void {
    res.status(416);
    res.setHeader("Content-Range", `bytes */${totalSize}`);
    this.setCrossOriginHeaders(res);
    res.end();
  }

  private setCrossOriginHeaders(res: Response): void {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Range, Cache-Control, Pragma, Content-Type");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Accept-Ranges, Content-Type");
    res.setHeader("Vary", "Origin");
  }

  private handleStreamError(error: unknown, res: Response, filename: string): void {
    console.error(`[PostMedia] Stream failed for ${filename}:`, this.errorMessage(error));
    if (!res.headersSent) res.status(404).end();
    else res.end();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
