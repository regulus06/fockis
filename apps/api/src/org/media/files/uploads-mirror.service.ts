/**
 * uploads-mirror.service.ts
 * -----------------------------------------------------------------------------
 * Every public upload folder (logos, covers, badge photos, events, posts, …)
 * is saved on the server's own disk. On Render that disk is wiped by every
 * deploy, and a developer machine that shares the database has files the live
 * server never received.
 *
 * This service mirrors the public uploads folder into Google Cloud Storage
 * (key: uploads-mirror/<relative path>) and serves the mirror when a file is
 * missing from this server's disk (see uploads-mirror.controller):
 *
 *   - at startup: copies every local file not yet in the bucket
 *   - every 2 minutes: copies files added since the last scan
 *
 * Folders that are not publicly served or are private/temporary are never
 * mirrored (music, documents, scans, raw processing files, temp folders).
 * organization-media has its own handling (media-storage.service).
 * -----------------------------------------------------------------------------
 */

import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { promises as fs } from "fs";
import { join, relative, resolve, sep } from "path";

import { CloudStorageService } from "../../../uploads/cloud-storage.service";
import { contentTypeFor } from "./media-storage.service";

export const UPLOADS_ROOT = resolve(process.cwd(), "uploads");
const MIRROR_PREFIX = "uploads-mirror/";
const SCAN_INTERVAL_MS = 2 * 60_000;
const MAX_DEPTH = 6;

/** Top-level folders that are never mirrored or served from the mirror. */
export const EXCLUDED_TOP_FOLDERS = new Set([
  "music",
  "documents",
  "scans",
  "raw",
  "processed",
  "academy-tmp",
  "organization-media",
  // GET /uploads/media/* is the cloud media gateway in uploads.controller.ts.
  "media",
]);

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._ ()@+,-]*$/;

/**
 * Validates a path below /uploads and returns it normalized ("a/b/c.jpg"),
 * or null when it is unsafe or excluded.
 */
export function normalizeUploadPath(raw: string | string[] | undefined): string | null {
  const joined = Array.isArray(raw) ? raw.join("/") : String(raw ?? "");
  let decoded: string;

  try {
    decoded = decodeURIComponent(joined);
  } catch {
    return null;
  }

  const segments = decoded.replace(/\\/g, "/").split("/").filter((s) => s.length > 0);

  if (!segments.length || segments.length > MAX_DEPTH + 1) return null;
  if (segments.some((s) => s === "." || s === ".." || !SAFE_SEGMENT.test(s) || s.includes("\0"))) return null;
  if (EXCLUDED_TOP_FOLDERS.has(segments[0].toLowerCase())) return null;
  if (segments[segments.length - 1].startsWith(".")) return null;

  return segments.join("/");
}

export function mirrorKey(path: string): string {
  return `${MIRROR_PREFIX}${path}`;
}

@Injectable()
export class UploadsMirrorService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(UploadsMirrorService.name);
  /** Paths known to be in the bucket (avoids re-checking every scan). */
  private readonly mirrored = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private scanning = false;

  constructor(private readonly cloud: CloudStorageService) {}

  onApplicationBootstrap(): void {
    if (process.env.NODE_ENV === "test" || process.env.MEDIA_CLOUD_SYNC_DISABLED === "true") return;

    const run = () => {
      void this.scan().catch((error) => this.logger.error(`Uploads mirror scan failed: ${String(error)}`));
    };

    run();
    this.timer = setInterval(run, SCAN_INTERVAL_MS);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async listFiles(dir: string, depth: number, out: string[]): Promise<void> {
    if (depth > MAX_DEPTH) return;

    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);

    for (const entry of entries) {
      const full = join(dir, entry.name);
      const rel = relative(UPLOADS_ROOT, full).split(sep).join("/");

      if (entry.isDirectory()) {
        if (depth === 0 && EXCLUDED_TOP_FOLDERS.has(entry.name.toLowerCase())) continue;
        await this.listFiles(full, depth + 1, out);
      } else if (entry.isFile()) {
        const normalized = normalizeUploadPath(rel);
        if (normalized) out.push(normalized);
      }
    }
  }

  async scan(): Promise<number> {
    if (this.scanning) return 0;

    this.scanning = true;
    let copied = 0;

    try {
      const files: string[] = [];
      await this.listFiles(UPLOADS_ROOT, 0, files);

      for (const path of files) {
        if (this.mirrored.has(path)) continue;

        const full = join(UPLOADS_ROOT, ...path.split("/"));
        const stat = await fs.stat(full).catch(() => null);

        // Skip empty files and files still being written.
        if (!stat || stat.size === 0 || Date.now() - stat.mtimeMs < 10_000) continue;

        const key = mirrorKey(path);

        if (!(await this.cloud.objectExists(key))) {
          try {
            await this.cloud.uploadFile(full, key, contentTypeFor(path));
            copied += 1;
          } catch (error) {
            this.logger.warn(`Could not mirror ${path}: ${String(error)}`);
            continue;
          }
        }

        this.mirrored.add(path);
      }

      if (copied) this.logger.log(`Mirrored ${copied} upload(s) to cloud storage.`);
    } finally {
      this.scanning = false;
    }

    return copied;
  }

  async info(path: string): Promise<{ size: number; contentType: string } | null> {
    const key = mirrorKey(path);

    if (!(await this.cloud.objectExists(key))) return null;

    const meta = await this.cloud.getObjectInfo(key);

    return { size: meta.size, contentType: contentTypeFor(path) };
  }

  stream(path: string, range?: { start: number; end: number }) {
    return this.cloud.openReadStream(mirrorKey(path), range);
  }
}
