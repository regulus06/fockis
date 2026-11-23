/**
 * media-transcode.service.ts
 * -----------------------------------------------------------------------------
 * Makes uploaded videos playable in every browser.
 *
 * Phones often record HEVC (H.265) video in .mov files, which Chrome, Edge
 * and Firefox on most computers cannot play. After a video is uploaded to the
 * media library this service:
 *
 *   1. inspects it with ffmpeg (codec, audio, duration)
 *   2. leaves it alone if it already plays everywhere (H.264 MP4, WebM)
 *   3. otherwise converts it in the background:
 *        - H.264 already, just in a .mov  → fast re-package to MP4
 *        - HEVC / anything else           → re-encode to H.264 + AAC MP4
 *   4. swaps the media item to the new MP4 (and adds a thumbnail and the
 *      duration when they are missing), then deletes the original file.
 *
 * One conversion runs at a time so the API stays responsive. Jobs are kept
 * in MongoDB (processingStatus), so they resume after a restart, and videos
 * uploaded before this feature are checked once at startup.
 * -----------------------------------------------------------------------------
 */

import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { spawn } from "child_process";
import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import { join } from "path";

import { ChurchMedia, ChurchMediaDocument, ChurchMediaType } from "../schemas/church-media.schema";
import { MEDIA_PUBLIC_PREFIX, MEDIA_UPLOAD_ROOT } from "./church-media.service";

export type MediaProcessingStatus = "ready" | "pending" | "processing" | "failed";

const STORED_NAME = /^[a-f0-9]{24}-[0-9]+-[a-f0-9]{8}\.[a-z0-9]{2,5}$/;
/** Longest a single conversion may run before it is stopped. */
const MAX_JOB_MS = 3 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 2;

export interface ProbeResult {
  videoCodec: string | null;
  audioCodec: string | null;
  durationSeconds: number | null;
  container: string | null;
}

export type ConversionPlan = "none" | "remux" | "transcode";

/* ============================================================================
   PURE HELPERS (unit-tested)
   ========================================================================== */

/** Reads codec, audio and duration from `ffmpeg -i` output. */
export function parseProbe(stderr: string): ProbeResult {
  const video = stderr.match(/Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?: Video: ([a-z0-9_]+)/i);
  const audio = stderr.match(/Stream #\d+:\d+(?:\[[^\]]*\])?(?:\([^)]*\))?: Audio: ([a-z0-9_]+)/i);
  const duration = stderr.match(/Duration: (\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  const container = stderr.match(/Input #0, ([a-z0-9_,]+), from/i);

  return {
    videoCodec: video ? video[1].toLowerCase() : null,
    audioCodec: audio ? audio[1].toLowerCase() : null,
    durationSeconds: duration
      ? Math.round(Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]))
      : null,
    container: container ? container[1].toLowerCase() : null,
  };
}

/** What has to happen so every browser can play the file. */
export function planConversion(probe: ProbeResult, fileName: string): ConversionPlan {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  const video = probe.videoCodec;

  if (!video) return "none"; // not a video stream we can do anything with

  const audioOk = !probe.audioCodec || ["aac", "mp3"].includes(probe.audioCodec);

  if (ext === "webm" && ["vp8", "vp9", "av1"].includes(video)) return "none";

  if (video === "h264") {
    if (ext === "mp4" && audioOk) return "none";
    // H.264 in a .mov (or with unusual audio): re-package / re-encode audio only.
    return "remux";
  }

  return "transcode";
}

/** ffmpeg arguments for the chosen plan (output is a fast-start MP4). */
export function ffmpegArgs(plan: Exclude<ConversionPlan, "none">, input: string, output: string, audioCodec: string | null): string[] {
  const audio =
    !audioCodec ? ["-an"] : ["aac", "mp3"].includes(audioCodec) ? ["-c:a", "copy"] : ["-c:a", "aac", "-b:a", "128k"];

  if (plan === "remux") {
    return ["-hide_banner", "-nostdin", "-y", "-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "copy", ...audio, "-movflags", "+faststart", "-f", "mp4", output];
  }

  return [
    "-hide_banner", "-nostdin", "-y",
    "-i", input,
    "-map", "0:v:0", "-map", "0:a:0?",
    // Keep the picture size up to 1080p (either orientation), even dimensions.
    "-vf", "scale=w='min(1920,iw)':h='min(1920,ih)':force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-threads", "2",
    ...(audioCodec ? ["-c:a", "aac", "-b:a", "128k", "-ac", "2"] : ["-an"]),
    "-movflags", "+faststart",
    "-f", "mp4",
    output,
  ];
}

function resolveFfmpeg(): string {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bundled = require("ffmpeg-static");
    if (typeof bundled === "string" && bundled) return bundled;
  } catch {
    /* fall back to the system ffmpeg */
  }

  return "ffmpeg";
}

function run(binary: string, args: string[], timeoutMs: number): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(binary, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      // Keep only the tail (progress lines are long).
      if (stderr.length > 200_000) stderr = stderr.slice(-100_000);
    });

    const timer = setTimeout(() => child.kill("SIGKILL"), timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolvePromise({ code, stderr });
    });
  });
}

/* ============================================================================
   SERVICE
   ========================================================================== */

@Injectable()
export class MediaTranscodeService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MediaTranscodeService.name);
  private readonly ffmpeg = resolveFfmpeg();
  private readonly queue: string[] = [];
  private running = false;
  private stopped = false;

  constructor(
    @InjectModel(ChurchMedia.name)
    private readonly mediaModel: Model<ChurchMediaDocument>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === "test" || process.env.MEDIA_TRANSCODE_DISABLED === "true") return;

    try {
      // Jobs interrupted by a restart run again.
      await this.mediaModel.updateMany(
        { processingStatus: "processing" },
        { $set: { processingStatus: "pending" } },
      );

      // Videos uploaded before this feature: check each one once.
      await this.mediaModel.updateMany(
        {
          mediaType: ChurchMediaType.Video,
          fileUrl: { $regex: `^${MEDIA_PUBLIC_PREFIX.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}/` },
          processingStatus: { $exists: false },
        },
        { $set: { processingStatus: "pending", processingAttempts: 0 } },
      );

      const pending = await this.mediaModel
        .find({ processingStatus: "pending" })
        .select("_id")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean()
        .exec();

      for (const doc of pending) this.enqueue(String(doc._id));

      if (pending.length) this.logger.log(`${pending.length} video(s) queued for browser-compatibility checks.`);
    } catch (error) {
      this.logger.error(`Could not resume video conversions: ${String(error)}`);
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
  }

  /** Is this a library upload that should be checked/converted? */
  static needsCheck(mediaType: string, fileUrl: string | null | undefined): boolean {
    return mediaType === ChurchMediaType.Video && Boolean(fileUrl?.startsWith(`${MEDIA_PUBLIC_PREFIX}/`));
  }

  enqueue(mediaId: string): void {
    if (!Types.ObjectId.isValid(mediaId) || this.queue.includes(mediaId)) return;

    this.queue.push(mediaId);
    void this.drain();
  }

  private async drain(): Promise<void> {
    if (this.running) return;

    this.running = true;

    try {
      while (this.queue.length && !this.stopped) {
        const id = this.queue.shift() as string;

        try {
          await this.process(id);
        } catch (error) {
          this.logger.error(`Video ${id} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private localPath(fileUrl: string): { orgId: string; name: string; path: string } | null {
    const match = fileUrl.match(new RegExp(`^${MEDIA_PUBLIC_PREFIX}/([a-f0-9]{24})/([^/]+)$`));

    if (!match || !STORED_NAME.test(match[2])) return null;

    return { orgId: match[1], name: match[2], path: join(MEDIA_UPLOAD_ROOT, match[1], match[2]) };
  }

  private async fail(id: Types.ObjectId, fileUrl: string, message: string): Promise<void> {
    await this.mediaModel.updateOne(
      { _id: id, fileUrl },
      { $set: { processingStatus: "failed", processingError: message.slice(0, 300) } },
    );
  }

  async process(mediaId: string): Promise<void> {
    // Claim the job (another API instance may have taken it).
    const doc = await this.mediaModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(mediaId), processingStatus: "pending" },
        { $set: { processingStatus: "processing", processingError: null }, $inc: { processingAttempts: 1 } },
        { new: true },
      )
      .exec();

    if (!doc) return;

    const fileUrl = doc.fileUrl;
    const local = this.localPath(fileUrl);

    if (!local || doc.mediaType !== ChurchMediaType.Video) {
      await this.mediaModel.updateOne({ _id: doc._id }, { $set: { processingStatus: "ready" } });
      return;
    }

    const exists = await fs.stat(local.path).then(() => true).catch(() => false);

    if (!exists) {
      await this.fail(doc._id as Types.ObjectId, fileUrl, "The original file is missing on the server.");
      return;
    }

    // 1. Inspect
    const probeRun = await run(this.ffmpeg, ["-hide_banner", "-nostdin", "-i", local.path], 60_000);
    const probe = parseProbe(probeRun.stderr);
    const plan = planConversion(probe, local.name);

    const extras: Record<string, unknown> = {};

    if (!doc.durationSeconds && probe.durationSeconds) extras.durationSeconds = probe.durationSeconds;

    if (plan === "none") {
      if (!doc.thumbnailUrl) {
        const thumb = await this.makeThumbnail(local.path, local.orgId, probe.durationSeconds);
        if (thumb) extras.thumbnailUrl = thumb;
      }

      await this.mediaModel.updateOne(
        { _id: doc._id, fileUrl },
        { $set: { processingStatus: "ready", processingError: null, ...extras } },
      );
      return;
    }

    // 2. Convert into a temporary file next to the original
    const baseName = local.name.replace(/\.[a-z0-9]+$/, "");
    const outName = `${baseName}.mp4`;
    const finalName = outName === local.name ? `${local.orgId}-${Date.now()}-${randomBytes(4).toString("hex")}.mp4` : outName;
    const tempPath = join(MEDIA_UPLOAD_ROOT, local.orgId, `${finalName}.part`);
    const finalPath = join(MEDIA_UPLOAD_ROOT, local.orgId, finalName);

    const started = Date.now();
    const result = await run(this.ffmpeg, ffmpegArgs(plan, local.path, tempPath, probe.audioCodec), MAX_JOB_MS);

    if (result.code !== 0) {
      await fs.unlink(tempPath).catch(() => undefined);
      const reason = result.stderr.split("\n").filter(Boolean).slice(-2).join(" ").slice(0, 300);

      if (Number(doc.processingAttempts ?? 1) < MAX_ATTEMPTS) {
        await this.mediaModel.updateOne({ _id: doc._id, fileUrl }, { $set: { processingStatus: "pending" } });
        this.enqueue(String(doc._id));
      } else {
        await this.fail(doc._id as Types.ObjectId, fileUrl, `Conversion failed. ${reason}`);
      }

      return;
    }

    await fs.rename(tempPath, finalPath);
    const stat = await fs.stat(finalPath);

    if (!doc.thumbnailUrl) {
      const thumb = await this.makeThumbnail(finalPath, local.orgId, probe.durationSeconds);
      if (thumb) extras.thumbnailUrl = thumb;
    }

    // 3. Swap — only if nobody replaced the file meanwhile.
    const newUrl = `${MEDIA_PUBLIC_PREFIX}/${local.orgId}/${finalName}`;
    const fileName = String(doc.fileName ?? local.name).replace(/\.[^.]+$/, "") + ".mp4";

    const swapped = await this.mediaModel.updateOne(
      { _id: doc._id, fileUrl },
      {
        $set: {
          fileUrl: newUrl,
          fileName: fileName.slice(0, 255),
          mimeType: "video/mp4",
          fileSize: stat.size,
          processingStatus: "ready",
          processingError: null,
          ...extras,
        },
      },
    );

    if (!swapped.modifiedCount) {
      await fs.unlink(finalPath).catch(() => undefined);
      if (typeof extras.thumbnailUrl === "string") await this.removeLocal(extras.thumbnailUrl);
      return;
    }

    // The original is no longer referenced by this item; remove it unless
    // another item still points at it.
    const stillUsed = await this.mediaModel.exists({
      organizationId: doc.organizationId,
      $or: [{ fileUrl }, { thumbnailUrl: fileUrl }],
    });

    if (!stillUsed) await fs.unlink(local.path).catch(() => undefined);

    this.logger.log(
      `Video ${mediaId} converted (${plan}, ${probe.videoCodec} → h264) in ${Math.round((Date.now() - started) / 1000)}s.`,
    );
  }

  private async makeThumbnail(videoPath: string, orgId: string, duration: number | null): Promise<string | null> {
    const name = `${orgId}-${Date.now()}-${randomBytes(4).toString("hex")}.jpg`;
    const out = join(MEDIA_UPLOAD_ROOT, orgId, name);
    const at = duration && duration > 4 ? Math.min(5, Math.floor(duration / 3)) : 0;

    const result = await run(
      this.ffmpeg,
      ["-hide_banner", "-nostdin", "-y", "-ss", String(at), "-i", videoPath, "-frames:v", "1", "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", out],
      60_000,
    ).catch(() => null);

    if (!result || result.code !== 0) {
      await fs.unlink(out).catch(() => undefined);
      return null;
    }

    return `${MEDIA_PUBLIC_PREFIX}/${orgId}/${name}`;
  }

  private async removeLocal(url: string): Promise<void> {
    const local = this.localPath(url);
    if (local) await fs.unlink(local.path).catch(() => undefined);
  }

  /** Ask for another try after a failure (managers, via the API). */
  async retry(organizationId: string, mediaId: string): Promise<boolean> {
    const result = await this.mediaModel.updateOne(
      { _id: new Types.ObjectId(mediaId), organizationId: new Types.ObjectId(organizationId), processingStatus: "failed" },
      { $set: { processingStatus: "pending", processingAttempts: 0, processingError: null } },
    );

    if (result.modifiedCount) this.enqueue(mediaId);

    return result.modifiedCount === 1;
  }
}
