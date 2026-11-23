import { Controller, Get, Head, NotFoundException, Param, Req, Res } from '@nestjs/common';
import { File, Storage } from '@google-cloud/storage';
import { createReadStream, existsSync } from 'fs';
import { stat } from 'fs/promises';
import { basename, resolve } from 'path';
import type { Request, Response } from 'express';
import type { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { Public } from '../auth/public.decorator';

type ResolvedMedia =
  | { source: 'gcs'; file: File; objectName: string; size: number; contentType: string }
  | { source: 'local'; filePath: string; objectName: string; size: number; contentType: string };

@Controller('post-media')
@Public()
export class PostMediaController {
  private readonly storage: Storage;
  private readonly bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() || '';
  private readonly localUploadDirectories = [
    resolve(process.cwd(), 'uploads'),
    resolve(process.cwd(), 'apps', 'api', 'uploads'),
  ].filter((directory, index, all) => all.indexOf(directory) === index);
  private readonly mediaPrefixes = ['posts', 'posts/images', 'posts/videos', 'post-media', 'stories', 'story-media'];
  private readonly metadataCache = new Map<string, { expiresAt: number; value: ResolvedMedia }>();
  private readonly cacheTtlMs = 30_000;
  private readonly maxCacheEntries = 500;
  private readonly videoChunkSize = 2 * 1024 * 1024;

  constructor() {
    this.storage = this.createStorage();
    if (!this.bucketName) console.warn('[PostMedia] GOOGLE_CLOUD_STORAGE_BUCKET is not configured.');
  }

  @Get(':filename')
  async getMedia(@Param('filename') filename: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    await this.serve(filename, req, res, false);
  }

  @Head(':filename')
  async headMedia(@Param('filename') filename: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    await this.serve(filename, req, res, true);
  }

  private async serve(filename: string, req: Request, res: Response, head: boolean): Promise<void> {
    const safeFilename = this.sanitizeFilename(filename);
    if (!safeFilename) throw new NotFoundException('Invalid media filename.');

    // If the browser disconnects during an asynchronous GCS lookup, do not start a stream.
    if (res.destroyed) return;
    const media = await this.findMediaFile(safeFilename);
    if (!media) throw new NotFoundException('Media file not found.');
    if (res.destroyed) return;
    if (!Number.isSafeInteger(media.size) || media.size <= 0) {
      if (!res.headersSent) res.status(404).end();
      return;
    }

    const rangeHeader = req.headers.range;
    const isVideo = media.contentType.startsWith('video/');
    let start = 0;
    let end = media.size - 1;
    let partial = false;

    if (rangeHeader) {
      const parsed = this.parseRange(rangeHeader, media.size);
      if (!parsed) {
        res.status(416).setHeader('Content-Range', `bytes */${media.size}`);
        this.setCrossOriginHeaders(res);
        res.end();
        return;
      }
      start = parsed.start;
      end = parsed.end;
      partial = true;
    }

    // For video, serve a bounded chunk even when the browser asks for an open-ended range.
    // This avoids long-lived full-file streams and lets the browser request the next segment.
    if (isVideo && !head && (rangeHeader || media.size > this.videoChunkSize)) {
      end = Math.min(end, start + this.videoChunkSize - 1);
      partial = true;
    }

    res.status(partial ? 206 : 200);
    this.setMediaHeaders(res, {
      contentType: media.contentType,
      contentLength: end - start + 1,
      contentRange: partial ? `bytes ${start}-${end}/${media.size}` : undefined,
    });
    if (head) {
      res.end();
      return;
    }

    const stream: Readable = media.source === 'local'
      ? createReadStream(media.filePath, { start, end })
      : media.file.createReadStream({ start, end, validation: false });

    const abort = () => stream.destroy();
    res.once('close', abort);
    try {
      await pipeline(stream, res);
    } catch (error) {
      // A client navigating away from a video is expected, not a server failure.
      const code = (error as NodeJS.ErrnoException)?.code;
      if (!res.destroyed && code !== 'ERR_STREAM_PREMATURE_CLOSE' && code !== 'ECONNRESET') {
        console.error(`[PostMedia] Stream failed for ${safeFilename}:`, this.errorMessage(error));
        if (!res.headersSent) res.status(502).end();
        else res.destroy();
      }
    } finally {
      res.off('close', abort);
      stream.destroy();
    }
  }

  private parseRange(header: string, size: number): { start: number; end: number } | null {
    const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
    if (!match || (!match[1] && !match[2])) return null;
    let start: number;
    let end: number;
    if (!match[1]) {
      const suffix = Number(match[2]);
      if (!Number.isSafeInteger(suffix) || suffix <= 0) return null;
      start = Math.max(0, size - suffix);
      end = size - 1;
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : size - 1;
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return null;
    return { start, end: Math.min(end, size - 1) };
  }

  private async findMediaFile(filename: string): Promise<ResolvedMedia | null> {
    const now = Date.now();
    const cached = this.metadataCache.get(filename);
    if (cached && cached.expiresAt > now) return cached.value;
    if (cached) this.metadataCache.delete(filename);

    if (this.bucketName) {
      const bucket = this.storage.bucket(this.bucketName);
      for (const prefix of this.mediaPrefixes) {
        const objectName = `${prefix}/${filename}`;
        const file = bucket.file(objectName);
        try {
          const [metadata] = await file.getMetadata();
          const value: ResolvedMedia = {
            source: 'gcs', file, objectName,
            size: Number(metadata.size || 0),
            contentType: metadata.contentType || this.detectContentType(filename),
          };
          this.cacheMedia(filename, value);
          return value;
        } catch (error) {
          const code = (error as { code?: number })?.code;
          if (code !== 404) {
            console.error(`[PostMedia] GCS lookup failed for ${objectName}:`, this.errorMessage(error));
            // Do not silently fall back to another location on auth or network errors.
            throw error;
          }
        }
      }
    }

    for (const directory of this.localUploadDirectories) {
      const filePath = resolve(directory, filename);
      if (basename(filePath) !== filename) continue;
      try {
        const metadata = await stat(filePath);
        if (metadata.isFile()) {
          const value: ResolvedMedia = {
            source: 'local', filePath, objectName: `uploads/${filename}`,
            size: metadata.size, contentType: this.detectContentType(filename),
          };
          this.cacheMedia(filename, value);
          return value;
        }
      } catch { /* Try next local directory. */ }
    }
    return null;
  }

  private cacheMedia(filename: string, value: ResolvedMedia): void {
    if (this.metadataCache.size >= this.maxCacheEntries) {
      const oldest = this.metadataCache.keys().next().value;
      if (oldest !== undefined) this.metadataCache.delete(oldest);
    }
    this.metadataCache.set(filename, { value, expiresAt: Date.now() + this.cacheTtlMs });
  }

  private createStorage(): Storage {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT?.trim() || 'fockis';
    const rawServiceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (rawServiceAccount) {
      let account: { project_id?: string; client_email?: string; private_key?: string };
      try { account = JSON.parse(rawServiceAccount); }
      catch { throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.'); }
      if (!account.client_email || !account.private_key) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON is missing client_email or private_key.');
      }
      return new Storage({
        projectId: process.env.GOOGLE_CLOUD_PROJECT?.trim() || account.project_id || projectId,
        credentials: {
          client_email: account.client_email,
          private_key: account.private_key.replace(/\\n/g, '\n'),
        },
      });
    }
    const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
    if (configuredPath) {
      const credentialsPath = resolve(configuredPath);
      if (!existsSync(credentialsPath)) throw new Error(`[PostMedia] GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`);
      return new Storage({ projectId, keyFilename: credentialsPath });
    }
    return new Storage({ projectId });
  }

  private sanitizeFilename(filename: string): string {
    let decoded: string;
    try { decoded = decodeURIComponent(String(filename || '')); }
    catch { return ''; }
    // Reject encoded paths rather than allowing a caller to choose a basename from a path.
    if (decoded.includes('/') || decoded.includes('\\') || decoded.includes('..')) return '';
    return decoded.trim();
  }

  private detectContentType(filename: string): string {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4';
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.avi')) return 'video/x-msvideo';
    if (lower.endsWith('.mkv')) return 'video/x-matroska';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.avif')) return 'image/avif';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    return 'application/octet-stream';
  }

  private setMediaHeaders(res: Response, options: { contentType: string; contentLength: number; contentRange?: string }): void {
    res.setHeader('Content-Type', options.contentType);
    res.setHeader('Content-Length', String(options.contentLength));
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (options.contentRange) res.setHeader('Content-Range', options.contentRange);
    this.setCrossOriginHeaders(res);
  }

  private setCrossOriginHeaders(res: Response): void {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Cache-Control, Pragma, Content-Type');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');
    res.setHeader('Vary', 'Origin');
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
