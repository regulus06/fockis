import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  ServiceUnavailableException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import { Model } from "mongoose";

import { readFileSync } from "fs";

import {
  EgressClient,
  EgressInfo,
  EgressStatus,
  EncodedFileOutput,
  EncodedFileType,
  GCPUpload,
  WebhookReceiver,
} from "livekit-server-sdk";

import {
  LiveRecordingStatus,
  LiveStream,
  LiveStreamDocument,
} from "../schemas/live-stream.schema";

import {
  LiveView,
  LiveViewDocument,
} from "../schemas/live-view.schema";

import {
  User,
  UserDocument,
} from "../../users/user.schema";

import { CloudStorageService } from "../../uploads/cloud-storage.service";

import { PostsService } from "../../posts/posts.service";

import { AccountRestrictionsService } from "../../reports/services/account-restrictions.service";

/*
 * ============================================================================
 * LIVE RECORDING SERVICE
 * ============================================================================
 *
 * Pipeline:
 *
 *   1. Host joins their LIVE  -> scheduleStart()   starts a LiveKit
 *      room-composite Egress that writes an MP4 straight into the
 *      project's GCS bucket (live-recordings/<streamId>/...).
 *   2. Host ends the LIVE      -> stopForStream()  status = "processing".
 *   3. LiveKit finishes upload -> webhook (egress_ended) or a lazy
 *      status sync from the API marks the recording "ready" (or "failed")
 *      and stores size + duration in MongoDB.
 *   4. Owner watches / downloads through short-lived signed URLs and can
 *      publish a server-side copy as a normal Fockis video post.
 *
 * Nothing here ever stores a temporary/local path as a public URL.
 */

const ACTIVE_STATES: LiveRecordingStatus[] = [
  "starting",
  "recording",
  "processing",
];

const START_RETRY_DELAY_MS = 5000;
const START_MAX_ATTEMPTS = 24; // ~2 minutes of retries while the host connects
const SYNC_THROTTLE_MS = 5000;
const PROCESSING_TIMEOUT_MS = 3 * 60 * 60 * 1000; // give up after 3h
const PUBLISH_LOCK_TIMEOUT_MS = 5 * 60 * 1000;
const PLAYBACK_URL_TTL_SECONDS = 4 * 60 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 15 * 60;

export interface RecordingSummary {
  status: LiveRecordingStatus;
  durationSeconds: number;
  sizeBytes: number;
  contentType: string;
  fileName: string;
  readyAt: Date | null;
  error: string;
  publishedPostId: string;
  publishedAt: Date | null;
  playbackUrl: string;
  message: string;
}

@Injectable()
export class LiveRecordingService
  implements OnModuleDestroy
{
  private readonly logger = new Logger(
    LiveRecordingService.name,
  );

  private egressClient: EgressClient | null = null;

  private readonly startTimers = new Map<
    string,
    NodeJS.Timeout
  >();

  private readonly lastSync = new Map<
    string,
    number
  >();

  constructor(
    @InjectModel(LiveStream.name)
    private readonly liveModel: Model<LiveStreamDocument>,

    @InjectModel(LiveView.name)
    private readonly liveViewModel: Model<LiveViewDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly storage: CloudStorageService,

    private readonly postsService: PostsService,

    private readonly accountRestrictions: AccountRestrictionsService,
  ) {}

  onModuleDestroy() {
    for (const timer of this.startTimers.values()) {
      clearTimeout(timer);
    }

    this.startTimers.clear();
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  private get apiKey() {
    return process.env.LIVEKIT_API_KEY?.trim() || "";
  }

  private get apiSecret() {
    return process.env.LIVEKIT_API_SECRET?.trim() || "";
  }

  private get bucket() {
    return (
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() || ""
    );
  }

  /**
   * LiveKit's REST API uses https:// while clients use wss://.
   */
  private get livekitHost() {
    const raw =
      process.env.LIVEKIT_API_URL?.trim() ||
      process.env.LIVEKIT_URL?.trim() ||
      "";

    return raw
      .replace(/^wss:\/\//i, "https://")
      .replace(/^ws:\/\//i, "http://")
      .replace(/\/+$/, "");
  }

  /**
   * Service-account JSON handed to LiveKit Egress so it can upload
   * the finished MP4 into our bucket. Prefer a dedicated, write-only
   * account (LIVEKIT_EGRESS_GCP_CREDENTIALS); fall back to the
   * existing project credentials.
   */
  private getEgressGcpCredentials(): string {
    const inline =
      process.env.LIVEKIT_EGRESS_GCP_CREDENTIALS?.trim() ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
      "";

    if (inline) {
      return inline;
    }

    const filePath =
      process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

    if (filePath) {
      try {
        return readFileSync(filePath, "utf8");
      } catch (error) {
        this.logger.error(
          `Unable to read GOOGLE_APPLICATION_CREDENTIALS file: ${String(error)}`,
        );
      }
    }

    return "";
  }

  isEnabled(): boolean {
    return (
      String(
        process.env.LIVE_RECORDING_ENABLED ?? "true",
      )
        .trim()
        .toLowerCase() !== "false"
    );
  }

  /**
   * Returns a human-readable reason when recording cannot work,
   * or "" when everything required is configured.
   */
  getConfigurationProblem(): string {
    if (!this.isEnabled()) {
      return "Recording is disabled on the server (LIVE_RECORDING_ENABLED=false).";
    }

    const missing: string[] = [];

    if (!this.livekitHost) missing.push("LIVEKIT_URL");
    if (!this.apiKey) missing.push("LIVEKIT_API_KEY");
    if (!this.apiSecret) missing.push("LIVEKIT_API_SECRET");
    if (!this.bucket) missing.push("GOOGLE_CLOUD_STORAGE_BUCKET");

    if (!this.getEgressGcpCredentials()) {
      missing.push(
        "LIVEKIT_EGRESS_GCP_CREDENTIALS (or GOOGLE_SERVICE_ACCOUNT_JSON)",
      );
    }

    return missing.length
      ? `Recording storage is not configured on the server. Missing: ${missing.join(", ")}.`
      : "";
  }

  private getEgressClient(): EgressClient {
    if (!this.egressClient) {
      this.egressClient = new EgressClient(
        this.livekitHost,
        this.apiKey,
        this.apiSecret,
      );
    }

    return this.egressClient;
  }

  // ==========================================================================
  // START
  // ==========================================================================

  /**
   * Called when the host joins. The LiveKit room only exists once the
   * host's client has connected, so the first attempts may fail with
   * "room does not exist"; we retry for ~2 minutes.
   */
  scheduleStart(streamId: string, delayMs = 3000) {
    if (!this.isEnabled()) {
      return;
    }

    if (this.startTimers.has(streamId)) {
      return;
    }

    const run = async (attempt: number) => {
      this.startTimers.delete(streamId);

      try {
        const result = await this.startForStream(
          streamId,
        );

        if (result === "retry" && attempt < START_MAX_ATTEMPTS) {
          const timer = setTimeout(
            () => void run(attempt + 1),
            START_RETRY_DELAY_MS,
          );

          timer.unref?.();

          this.startTimers.set(streamId, timer);
        }
      } catch (error) {
        this.logger.error(
          `Recording start failed for ${streamId}: ${String(error)}`,
        );
      }
    };

    const timer = setTimeout(
      () => void run(1),
      Math.max(0, delayMs),
    );

    timer.unref?.();

    this.startTimers.set(streamId, timer);
  }

  /**
   * Idempotent. Returns:
   *   "started" | "already" — recording is (now) running
   *   "retry"               — room not ready yet, try again
   *   "skipped"             — stream not live / not configured / disabled
   */
  async startForStream(
    streamId: string,
  ): Promise<"started" | "already" | "retry" | "skipped"> {
    const problem = this.getConfigurationProblem();

    const stream = await this.liveModel.findById(streamId);

    if (!stream || stream.status !== "live") {
      return "skipped";
    }

    if (problem) {
      if (
        !stream.recording?.status ||
        stream.recording.status === "none"
      ) {
        await this.liveModel.updateOne(
          { _id: stream._id },
          {
            $set: {
              "recording.error": problem,
            },
          },
        );
      }

      this.logger.warn(
        `Recording not started for ${streamId}: ${problem}`,
      );

      return "skipped";
    }

    /*
     * Atomically claim the "starting" slot so two API instances /
     * duplicate joins never start two egresses for the same LIVE.
     */
    const claimed = await this.liveModel.findOneAndUpdate(
      {
        _id: stream._id,
        status: "live",
        $or: [
          { recording: { $exists: false } },
          { "recording.status": { $in: ["none", "failed", null] } },
          { "recording.status": { $exists: false } },
        ],
      },
      {
        $set: {
          "recording.status": "starting",
          "recording.provider": "livekit-egress",
          "recording.error": "",
        },
        $inc: {
          "recording.startAttempts": 1,
        },
      },
      { new: true },
    );

    if (!claimed) {
      return "already";
    }

    const objectKey =
      `live-recordings/${streamId}/fockis-live-${streamId}-${Date.now()}.mp4`;

    try {
      const output = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: objectKey,
        output: {
          case: "gcp",
          value: new GCPUpload({
            bucket: this.bucket,
            credentials: this.getEgressGcpCredentials(),
          }),
        },
      });

      const info = await this.getEgressClient().startRoomCompositeEgress(
        stream.roomName,
        { file: output },
        {
          layout:
            process.env.LIVE_RECORDING_LAYOUT?.trim() || "speaker",
        },
      );

      await this.liveModel.updateOne(
        { _id: stream._id },
        {
          $set: {
            "recording.status": "recording",
            "recording.egressId": info.egressId,
            "recording.objectKey": objectKey,
            "recording.contentType": "video/mp4",
            "recording.startedAt": new Date(),
            "recording.error": "",
          },
        },
      );

      this.logger.log(
        `Recording started for ${streamId} (egress ${info.egressId})`,
      );

      return "started";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);

      const roomNotReady =
        /does not exist|not found|no participants|room.*not/i.test(
          message,
        );

      /*
       * Release the claim so a later attempt can retry.
       */
      await this.liveModel.updateOne(
        {
          _id: stream._id,
          "recording.status": "starting",
        },
        {
          $set: {
            "recording.status": roomNotReady ? "none" : "failed",
            "recording.error": roomNotReady
              ? ""
              : `Recording could not be started: ${message}`.slice(0, 1000),
          },
        },
      );

      if (roomNotReady) {
        return "retry";
      }

      this.logger.error(
        `Recording start error for ${streamId}: ${message}`,
      );

      return "skipped";
    }
  }

  // ==========================================================================
  // STOP (LIVE ENDED)
  // ==========================================================================

  async stopForStream(
    streamId: string,
    attempt = 0,
  ): Promise<void> {
    const timer = this.startTimers.get(streamId);

    if (timer) {
      clearTimeout(timer);
      this.startTimers.delete(streamId);
    }

    const stream = await this.liveModel.findById(streamId);

    if (!stream) {
      return;
    }

    const recording = stream.recording;
    const status = recording?.status || "none";

    if (status === "starting" && attempt < 6) {
      /*
       * A start request is in flight right now. Check again shortly,
       * once it has either produced an egress or given up.
       */
      const retry = setTimeout(
        () => void this.stopForStream(streamId, attempt + 1),
        START_RETRY_DELAY_MS,
      );

      retry.unref?.();

      return;
    }

    if (
      !recording?.egressId ||
      status === "none" ||
      status === "starting"
    ) {
      if (
        status === "none" ||
        status === "starting" ||
        !recording
      ) {
        await this.liveModel.updateOne(
          { _id: stream._id },
          {
            $set: {
              "recording.status": "failed",
              "recording.endedAt": new Date(),
              "recording.error":
                recording?.error ||
                this.getConfigurationProblem() ||
                "The recording never started — the broadcast ended before LiveKit could begin recording.",
            },
          },
        );
      }

      return;
    }

    if (status !== "recording") {
      return;
    }

    await this.liveModel.updateOne(
      {
        _id: stream._id,
        "recording.status": "recording",
      },
      {
        $set: {
          "recording.status": "processing",
          "recording.endedAt": new Date(),
          "recording.processingSince": new Date(),
        },
      },
    );

    try {
      const info = await this.getEgressClient().stopEgress(
        recording.egressId,
      );

      await this.applyEgressInfo(info);
    } catch (error) {
      /*
       * The egress may already have stopped on its own (e.g. the room
       * closed first). The status sync / webhook will settle it.
       */
      this.logger.warn(
        `stopEgress for ${streamId} returned: ${String(error)}`,
      );

      await this.syncStream(streamId, true);
    }
  }

  // ==========================================================================
  // EGRESS STATE -> MONGODB
  // ==========================================================================

  async applyEgressInfo(info?: EgressInfo | null): Promise<void> {
    if (!info?.egressId) {
      return;
    }

    const stream = await this.liveModel.findOne({
      "recording.egressId": info.egressId,
    });

    if (!stream?.recording) {
      return;
    }

    const current = stream.recording.status;

    // Terminal states set by the owner/server are never overwritten.
    if (current === "ready" || current === "deleted") {
      return;
    }

    const file = info.fileResults?.[0];

    const sizeBytes = Number(file?.size ?? 0) || 0;

    const durationSeconds =
      Math.round(Number(file?.duration ?? 0) / 1e9) || 0;

    switch (info.status) {
      case EgressStatus.EGRESS_STARTING:
      case EgressStatus.EGRESS_ACTIVE: {
        if (current === "starting") {
          await this.liveModel.updateOne(
            { _id: stream._id },
            { $set: { "recording.status": "recording" } },
          );
        }

        return;
      }

      case EgressStatus.EGRESS_ENDING: {
        await this.liveModel.updateOne(
          { _id: stream._id },
          {
            $set: {
              "recording.status": "processing",
              "recording.processingSince":
                stream.recording.processingSince || new Date(),
            },
          },
        );

        return;
      }

      case EgressStatus.EGRESS_COMPLETE:
      case EgressStatus.EGRESS_LIMIT_REACHED: {
        const objectKey =
          (file?.filename && !/^https?:/i.test(file.filename)
            ? file.filename.replace(/^\/+/, "")
            : "") || stream.recording.objectKey;

        const exists = objectKey
          ? await this.storage.objectExists(objectKey)
          : false;

        if (!exists) {
          await this.markFailed(
            stream._id,
            "LiveKit reported the recording as finished, but the video file was not found in storage. Check the Egress storage credentials and bucket permissions.",
          );

          return;
        }

        let finalSize = sizeBytes;

        if (!finalSize) {
          try {
            finalSize = (await this.storage.getFileMetadata(objectKey)).size;
          } catch {
            finalSize = 0;
          }
        }

        await this.liveModel.updateOne(
          { _id: stream._id },
          {
            $set: {
              "recording.status": "ready",
              "recording.objectKey": objectKey,
              "recording.sizeBytes": finalSize,
              "recording.durationSeconds":
                durationSeconds || this.fallbackDuration(stream),
              "recording.readyAt": new Date(),
              "recording.error":
                info.status === EgressStatus.EGRESS_LIMIT_REACHED
                  ? "The recording reached the provider's time limit; the saved video may be shorter than the broadcast."
                  : "",
            },
          },
        );

        this.logger.log(
          `Recording ready for stream ${String(stream._id)}`,
        );

        return;
      }

      case EgressStatus.EGRESS_FAILED:
      case EgressStatus.EGRESS_ABORTED: {
        await this.markFailed(
          stream._id,
          info.error
            ? `Recording failed: ${info.error}`
            : "The recording was interrupted before it could be saved.",
        );

        return;
      }

      default:
        return;
    }
  }

  private async markFailed(id: any, error: string) {
    await this.liveModel.updateOne(
      {
        _id: id,
        "recording.status": { $nin: ["ready", "deleted"] },
      },
      {
        $set: {
          "recording.status": "failed",
          "recording.error": error.slice(0, 1000),
        },
      },
    );
  }

  private fallbackDuration(stream: LiveStreamDocument): number {
    const start = stream.startedAt
      ? new Date(stream.startedAt).getTime()
      : 0;

    const end = stream.endedAt
      ? new Date(stream.endedAt).getTime()
      : 0;

    return start && end && end > start
      ? Math.round((end - start) / 1000)
      : 0;
  }

  /**
   * Pulls the latest Egress state from LiveKit. Makes the system work
   * even when the webhook is not configured, and recovers from missed
   * webhooks / server restarts.
   */
  async syncStream(streamId: string, force = false): Promise<void> {
    const now = Date.now();

    if (!force) {
      const last = this.lastSync.get(streamId) || 0;

      if (now - last < SYNC_THROTTLE_MS) {
        return;
      }
    }

    this.lastSync.set(streamId, now);

    const stream = await this.liveModel
      .findById(streamId)
      .select("recording status endedAt")
      .lean();

    const recording = stream?.recording;

    if (
      !recording?.egressId ||
      !ACTIVE_STATES.includes(recording.status)
    ) {
      return;
    }

    if (this.getConfigurationProblem()) {
      return;
    }

    try {
      const list = await this.getEgressClient().listEgress({
        egressId: recording.egressId,
      });

      const info = list?.[0];

      if (info) {
        await this.applyEgressInfo(info);
      }
    } catch (error) {
      this.logger.warn(
        `Recording sync failed for ${streamId}: ${String(error)}`,
      );
    }

    // Safety net: never leave a recording "processing" forever.
    const since =
      recording.processingSince ||
      recording.endedAt ||
      stream?.endedAt;

    if (
      recording.status === "processing" &&
      since &&
      now - new Date(since).getTime() > PROCESSING_TIMEOUT_MS
    ) {
      await this.markFailed(
        stream?._id,
        "The recording did not finish processing in time.",
      );
    }
  }

  // ==========================================================================
  // WEBHOOK
  // ==========================================================================

  async handleWebhook(rawBody: string, authHeader?: string) {
    if (!this.apiKey || !this.apiSecret) {
      throw new ServiceUnavailableException(
        "LiveKit is not configured.",
      );
    }

    const receiver = new WebhookReceiver(
      this.apiKey,
      this.apiSecret,
    );

    let event;

    try {
      event = await receiver.receive(rawBody, authHeader);
    } catch {
      throw new ForbiddenException("Invalid LiveKit webhook signature.");
    }

    if (
      event?.egressInfo &&
      (event.event === "egress_started" ||
        event.event === "egress_updated" ||
        event.event === "egress_ended")
    ) {
      await this.applyEgressInfo(event.egressInfo);
    }

    return { received: true };
  }

  // ==========================================================================
  // OWNER HELPERS
  // ==========================================================================

  private assertObjectId(value: string) {
    if (!value || !/^[a-fA-F0-9]{24}$/.test(value)) {
      throw new BadRequestException("Invalid LIVE stream ID.");
    }
  }

  private async getOwnedStream(
    userId: string,
    streamId: string,
  ): Promise<LiveStreamDocument> {
    if (!userId) {
      throw new ForbiddenException("Authentication required.");
    }

    this.assertObjectId(streamId);

    const stream = await this.liveModel.findById(streamId);

    if (!stream) {
      throw new NotFoundException("LIVE stream not found.");
    }

    if (String(stream.hostId) !== String(userId)) {
      // Recordings are private to the host.
      throw new ForbiddenException(
        "You do not have access to this recording.",
      );
    }

    return stream;
  }

  fileNameFor(streamId: string) {
    return `fockis-live-${streamId}.mp4`;
  }

  private statusMessage(
    status: LiveRecordingStatus,
    error: string,
  ): string {
    switch (status) {
      case "ready":
        return "Recording is ready.";
      case "starting":
      case "recording":
        return "This LIVE is still being recorded.";
      case "processing":
        return "Recording is processing. This may take a few minutes.";
      case "failed":
        return error || "The recording could not be saved.";
      case "deleted":
        return "This recording was deleted.";
      default:
        return (
          error ||
          "No recording exists for this LIVE. Recordings are only available for broadcasts started after recording was enabled."
        );
    }
  }

  /**
   * Summary used by the list (/live/mine) and detail endpoints.
   * Includes a short-lived signed playback URL only when ready.
   */
  async summarize(stream: any): Promise<RecordingSummary> {
    const rec = stream?.recording || {};

    const status: LiveRecordingStatus = rec.status || "none";

    let playbackUrl = "";

    if (status === "ready" && rec.objectKey) {
      try {
        playbackUrl = await this.storage.getSignedUrl(rec.objectKey, {
          expiresInSeconds: PLAYBACK_URL_TTL_SECONDS,
          responseType: rec.contentType || "video/mp4",
        });
      } catch {
        playbackUrl = "";
      }
    }

    return {
      status,
      durationSeconds: Number(rec.durationSeconds || 0),
      sizeBytes: Number(rec.sizeBytes || 0),
      contentType: rec.contentType || "video/mp4",
      fileName: this.fileNameFor(String(stream._id)),
      readyAt: rec.readyAt || null,
      error: rec.error || "",
      publishedPostId: rec.publishedPostId || "",
      publishedAt: rec.publishedAt || null,
      playbackUrl,
      message: this.statusMessage(status, rec.error || ""),
    };
  }

  /**
   * Total unique viewers per stream (from live_views).
   */
  async countViews(streamIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    if (!streamIds.length) {
      return map;
    }

    const rows = await this.liveViewModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $match: { streamId: { $in: streamIds } } },
      { $group: { _id: "$streamId", count: { $sum: 1 } } },
    ]);

    for (const row of rows) {
      map.set(String(row._id), Number(row.count || 0));
    }

    return map;
  }

  // ==========================================================================
  // PUBLIC (OWNER) API
  // ==========================================================================

  async getDetails(userId: string, streamId: string) {
    const owned = await this.getOwnedStream(userId, streamId);

    if (ACTIVE_STATES.includes(owned.recording?.status as LiveRecordingStatus)) {
      await this.syncStream(streamId);
    }

    const stream = await this.liveModel.findById(streamId).lean();

    const views = await this.countViews([streamId]);

    return {
      streamId,
      totalViews: views.get(streamId) || 0,
      recording: await this.summarize(stream),
    };
  }

  async ensureStarted(userId: string, streamId: string) {
    const stream = await this.getOwnedStream(userId, streamId);

    if (stream.status !== "live") {
      throw new BadRequestException(
        "Recording can only be started while the LIVE is broadcasting.",
      );
    }

    const result = await this.startForStream(streamId);

    if (result === "retry") {
      this.scheduleStart(streamId, START_RETRY_DELAY_MS);
    }

    const fresh = await this.liveModel.findById(streamId).lean();

    return {
      result,
      recording: await this.summarize(fresh),
    };
  }

  async getDownload(userId: string, streamId: string) {
    const stream = await this.getOwnedStream(userId, streamId);

    const rec = stream.recording;

    if (rec?.status !== "ready" || !rec.objectKey) {
      throw new BadRequestException(
        this.statusMessage(
          (rec?.status || "none") as LiveRecordingStatus,
          rec?.error || "",
        ),
      );
    }

    const fileName = this.fileNameFor(streamId);

    const url = await this.storage.getSignedUrl(rec.objectKey, {
      expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
      responseDisposition: `attachment; filename="${fileName}"`,
      responseType: rec.contentType || "video/mp4",
    });

    return {
      url,
      fileName,
      sizeBytes: Number(rec.sizeBytes || 0),
      expiresInSeconds: DOWNLOAD_URL_TTL_SECONDS,
    };
  }

  async publishToFeed(
    userId: string,
    streamId: string,
    caption?: string,
  ) {
    const stream = await this.getOwnedStream(userId, streamId);

    const rec = stream.recording;

    if (rec?.publishedPostId) {
      return {
        published: true,
        alreadyPublished: true,
        postId: rec.publishedPostId,
      };
    }

    if (rec?.status !== "ready" || !rec.objectKey) {
      throw new BadRequestException(
        "The recording is not ready to publish yet.",
      );
    }

    await this.accountRestrictions.assertCanPost(String(userId));

    const content = String(caption ?? "").trim().slice(0, 5000);

    /*
     * Idempotency lock: only one publish may run at a time per
     * recording, and never once a post id has been stored.
     */
    const lockedAt = new Date();

    const locked = await this.liveModel.findOneAndUpdate(
      {
        _id: stream._id,
        hostId: String(userId),
        "recording.status": "ready",
        $and: [
          {
            $or: [
              { "recording.publishedPostId": { $in: ["", null] } },
              { "recording.publishedPostId": { $exists: false } },
            ],
          },
          {
            $or: [
              { "recording.publishing": { $ne: true } },
              {
                "recording.publishLockAt": {
                  $lt: new Date(Date.now() - PUBLISH_LOCK_TIMEOUT_MS),
                },
              },
            ],
          },
        ],
      },
      {
        $set: {
          "recording.publishing": true,
          "recording.publishLockAt": lockedAt,
        },
      },
      { new: true },
    );

    if (!locked) {
      const latest = await this.liveModel
        .findById(stream._id)
        .select("recording")
        .lean();

      if (latest?.recording?.publishedPostId) {
        return {
          published: true,
          alreadyPublished: true,
          postId: latest.recording.publishedPostId,
        };
      }

      throw new ConflictException(
        "This recording is already being published.",
      );
    }

    try {
      /*
       * Re-use the existing post media convention: posts store
       * "/uploads/<file>" and the file lives at "posts/<file>" in GCS.
       * The copy happens inside GCS — nothing is downloaded or
       * re-uploaded through the browser or this server.
       */
      const postFile = `${Date.now()}-fockis-live-${streamId}.mp4`;

      await this.storage.copyObject(rec.objectKey, `posts/${postFile}`);

      const user = await this.userModel
        .findById(userId)
        .select("username firstName lastName profilePicture")
        .lean<any>();

      const post: any = await this.postsService.create({
        user: String(userId),
        username: user?.username || "",
        userPhoto: user?.profilePicture || "",
        content,
        type: "video",
        audience: "public",
        media: `/uploads/${postFile}`,
      });

      const postId = String(post?._id || post?.id || "");

      await this.liveModel.updateOne(
        { _id: stream._id },
        {
          $set: {
            "recording.publishedPostId": postId,
            "recording.publishedAt": new Date(),
            "recording.publishing": false,
          },
        },
      );

      return {
        published: true,
        alreadyPublished: false,
        postId,
      };
    } catch (error) {
      await this.liveModel.updateOne(
        { _id: stream._id },
        { $set: { "recording.publishing": false } },
      );

      throw error;
    }
  }

  /**
   * Deletes only the recording file. The LIVE (and its statistics)
   * stay, and any feed post keeps working because publishing made an
   * independent copy of the video.
   */
  async deleteRecording(userId: string, streamId: string) {
    const stream = await this.getOwnedStream(userId, streamId);

    const rec = stream.recording;

    if (!rec || rec.status === "none" || rec.status === "deleted") {
      throw new BadRequestException("There is no recording to delete.");
    }

    if (["starting", "recording", "processing"].includes(rec.status)) {
      throw new BadRequestException(
        "The recording is still being saved. Try again once it is ready.",
      );
    }

    if (rec.publishing) {
      throw new ConflictException(
        "The recording is being published. Try again in a moment.",
      );
    }

    if (rec.objectKey) {
      await this.storage.deleteObject(rec.objectKey);
    }

    await this.liveModel.updateOne(
      { _id: stream._id },
      {
        $set: {
          "recording.status": "deleted",
          "recording.objectKey": "",
          "recording.sizeBytes": 0,
          "recording.deletedAt": new Date(),
        },
      },
    );

    return {
      deleted: true,
      id: streamId,
      publishedPostId: rec.publishedPostId || "",
    };
  }

  /**
   * Best-effort cleanup when the whole LIVE is deleted.
   */
  async cleanupForDeletedStream(stream: {
    _id: unknown;
    recording?: { egressId?: string; status?: string; objectKey?: string };
  }) {
    const id = String(stream._id);

    const timer = this.startTimers.get(id);

    if (timer) {
      clearTimeout(timer);
      this.startTimers.delete(id);
    }

    const rec = stream.recording;

    if (!rec) {
      return;
    }

    if (
      rec.egressId &&
      (rec.status === "starting" || rec.status === "recording") &&
      !this.getConfigurationProblem()
    ) {
      try {
        await this.getEgressClient().stopEgress(rec.egressId);
      } catch {
        /* already stopped */
      }
    }

    if (rec.objectKey) {
      try {
        await this.storage.deleteObject(rec.objectKey);
      } catch (error) {
        this.logger.warn(
          `Could not delete recording file for ${id}: ${String(error)}`,
        );
      }
    }
  }
}
