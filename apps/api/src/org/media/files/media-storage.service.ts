/**
 * media-storage.service.ts
 * -----------------------------------------------------------------------------
 * Keeps organization media (photos, videos, audio, documents) in Google Cloud
 * Storage so every server sees the same files.
 *
 * Files keep their existing URLs (/uploads/organization-media/<orgId>/<name>):
 *   - if the file is on this server's disk, the static file server sends it
 *   - otherwise GET …/uploads/organization-media/<orgId>/<name> streams the
 *     copy from Google Cloud Storage (see media-files.controller)
 *
 * Object key: organization-media/<orgId>/<name>
 *
 * At startup every local file is copied to the bucket if it is not there yet,
 * so files uploaded before this change (or on a developer machine that shares
 * the database) become available everywhere.
 * -----------------------------------------------------------------------------
 */

import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { promises as fs } from "fs";
import { extname, join, resolve } from "path";

import { CloudStorageService } from "../../../uploads/cloud-storage.service";

export const ORG_MEDIA_ROOT = resolve(process.cwd(), "uploads", "organization-media");
export const ORG_MEDIA_PREFIX = "/uploads/organization-media";
const ORG_ID = /^[a-f0-9]{24}$/;
const STORED_NAME = /^[a-f0-9]{24}-[0-9]+-[a-f0-9]{8}\.[a-z0-9]{2,5}$/;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
};

export function contentTypeFor(name: string): string {
  return CONTENT_TYPES[extname(name).toLowerCase()] ?? "application/octet-stream";
}

/** Parses an organization-media URL into its parts (null if not one). */
export function parseMediaUrl(url: string | null | undefined): { orgId: string; name: string } | null {
  const match = String(url ?? "").match(/^\/uploads\/organization-media\/([a-f0-9]{24})\/([^/?#]+)$/);

  if (!match || !STORED_NAME.test(match[2])) return null;

  return { orgId: match[1], name: match[2] };
}

export function objectKeyFor(orgId: string, name: string): string {
  return `organization-media/${orgId}/${name}`;
}

export function isValidMediaRef(orgId: string, name: string): boolean {
  return ORG_ID.test(orgId) && STORED_NAME.test(name);
}

@Injectable()
export class MediaStorageService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MediaStorageService.name);

  constructor(private readonly cloud: CloudStorageService) {}

  localPath(orgId: string, name: string): string {
    return join(ORG_MEDIA_ROOT, orgId, name);
  }

  /** Copy a local library file to the bucket. Never throws (logs instead). */
  async push(orgId: string, name: string): Promise<boolean> {
    if (!isValidMediaRef(orgId, name)) return false;

    try {
      await this.cloud.uploadFile(this.localPath(orgId, name), objectKeyFor(orgId, name), contentTypeFor(name));
      return true;
    } catch (error) {
      this.logger.error(`Could not copy ${orgId}/${name} to cloud storage: ${String(error)}`);
      return false;
    }
  }

  async pushUrl(url: string | null | undefined): Promise<boolean> {
    const ref = parseMediaUrl(url);
    return ref ? this.push(ref.orgId, ref.name) : false;
  }

  /** Make sure the file is on this server's disk (downloads it if needed). */
  async ensureLocal(orgId: string, name: string): Promise<string | null> {
    if (!isValidMediaRef(orgId, name)) return null;

    const path = this.localPath(orgId, name);

    if (await fs.stat(path).then(() => true).catch(() => false)) return path;

    if (!(await this.cloud.objectExists(objectKeyFor(orgId, name)))) return null;

    await fs.mkdir(join(ORG_MEDIA_ROOT, orgId), { recursive: true });
    const temp = `${path}.download`;

    try {
      await this.cloud.downloadToFile(objectKeyFor(orgId, name), temp);
      await fs.rename(temp, path);
      return path;
    } catch (error) {
      await fs.unlink(temp).catch(() => undefined);
      this.logger.error(`Could not download ${orgId}/${name}: ${String(error)}`);
      return null;
    }
  }

  /** Remove the bucket copy (and the local copy). */
  async remove(orgId: string, name: string): Promise<void> {
    if (!isValidMediaRef(orgId, name)) return;

    await fs.unlink(this.localPath(orgId, name)).catch(() => undefined);

    try {
      await this.cloud.deleteObject(objectKeyFor(orgId, name));
    } catch (error) {
      this.logger.warn(`Could not delete ${orgId}/${name} from cloud storage: ${String(error)}`);
    }
  }

  /** Size and type of the bucket copy (null if it is not there). */
  async info(orgId: string, name: string): Promise<{ size: number; contentType: string } | null> {
    if (!isValidMediaRef(orgId, name)) return null;

    const key = objectKeyFor(orgId, name);

    if (!(await this.cloud.objectExists(key))) return null;

    const meta = await this.cloud.getObjectInfo(key);

    return { size: meta.size, contentType: contentTypeFor(name) };
  }

  /** Read the bucket copy, optionally one inclusive byte range. */
  stream(orgId: string, name: string, range?: { start: number; end: number }) {
    return this.cloud.openReadStream(objectKeyFor(orgId, name), range);
  }

  // ==========================================================================
  // STARTUP SYNC
  // ==========================================================================

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === "test" || process.env.MEDIA_CLOUD_SYNC_DISABLED === "true") return;

    void this.syncLocalFiles().catch((error) => this.logger.error(`Media sync failed: ${String(error)}`));
  }

  /** Copy every local library file that is not yet in the bucket. */
  async syncLocalFiles(): Promise<{ uploaded: number; checked: number }> {
    let uploaded = 0;
    let checked = 0;

    const orgDirs = await fs.readdir(ORG_MEDIA_ROOT).catch(() => [] as string[]);

    for (const orgId of orgDirs) {
      if (!ORG_ID.test(orgId)) continue;

      const names = await fs.readdir(join(ORG_MEDIA_ROOT, orgId)).catch(() => [] as string[]);

      for (const name of names) {
        if (!STORED_NAME.test(name)) continue;

        checked += 1;

        if (await this.cloud.objectExists(objectKeyFor(orgId, name))) continue;

        if (await this.push(orgId, name)) uploaded += 1;
      }
    }

    if (uploaded) this.logger.log(`Copied ${uploaded} organization media file(s) to cloud storage (${checked} checked).`);

    return { uploaded, checked };
  }
}

/**
 * Parses a single "bytes=start-end" Range header.
 * Returns null (whole file), a range, or "invalid" (answer 416).
 */
export function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | null | "invalid" {
  if (!header) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());

  if (!match || (!match[1] && !match[2]) || size <= 0) return "invalid";

  let start: number;
  let end: number;

  if (!match[1]) {
    const suffix = Number(match[2]);
    if (suffix <= 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }

  if (start >= size || start > end) return "invalid";

  return { start, end };
}
