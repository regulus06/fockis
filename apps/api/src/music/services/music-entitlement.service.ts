import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import { InjectModel } from "@nestjs/mongoose";

import {
  Model,
  Types,
} from "mongoose";

import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  existsSync,
  statSync,
} from "fs";

import {
  isAbsolute,
  join,
  relative,
  resolve,
} from "path";

import {
  MusicContent,
  MusicAccessType,
  MediaAsset,
} from "../schemas/music-content.schema";

import {
  MusicEntitlement,
} from "../schemas/music-purchase.schema";

import {
  MusicPlay,
  MusicView,
} from "../schemas/music-analytics.schema";

// ============================================================================
// TYPES
// ============================================================================

export type AccessLevel =
  | "full"
  | "preview"
  | "denied";

export type AccessReason =
  | "free"
  | "owner"
  | "entitled"
  | "preview_available"
  | "no_entitlement";

export interface ResolvedAccess {
  contentId: string;
  accessType: MusicAccessType;
  level: AccessLevel;
  reason: AccessReason;
  previewDurationSeconds: number;
}

export interface PlaybackTokenPayload {
  contentId: string;
  userId: string | null;
  storageKey: string;
  level: "full" | "preview";
  expiresAt: number;
  clipToSeconds?: number;
}

// ============================================================================
// SERVICE
// ============================================================================

@Injectable()
export class MusicEntitlementService {
  private readonly logger =
    new Logger(
      MusicEntitlementService.name,
    );

  /**
   * Production:
   *
   * MUSIC_PLAYBACK_SECRET=<long-random-secret>
   *
   * Development falls back to JWT_SECRET.
   */
  private readonly playbackSecret =
    process.env.MUSIC_PLAYBACK_SECRET ||
    process.env.JWT_SECRET ||
    "fockis-music-development-secret";

  constructor(
    @InjectModel(MusicContent.name)
    private readonly contentModel: Model<MusicContent>,

    @InjectModel(MusicEntitlement.name)
    private readonly entitlementModel: Model<MusicEntitlement>,

    @InjectModel(MusicPlay.name)
    private readonly musicPlayModel: Model<MusicPlay>,

    @InjectModel(MusicView.name)
    private readonly musicViewModel: Model<MusicView>,
  ) {}

  // ==========================================================================
  // ID NORMALIZATION
  // ==========================================================================

  private normalizeId(
    value: unknown,
  ): string | null {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    if (
      value instanceof Types.ObjectId
    ) {
      return value.toString();
    }

    if (
      typeof value === "string"
    ) {
      const normalized =
        value.trim();

      return normalized
        ? normalized
        : null;
    }

    if (
      typeof value === "object" &&
      value !== null &&
      "toString" in value
    ) {
      try {
        const normalized =
          String(value).trim();

        return normalized
          ? normalized
          : null;
      } catch {
        return null;
      }
    }

    return null;
  }

  // ==========================================================================
  // OWNER CHECK
  // ==========================================================================

  private isContentOwner(
    producerId: unknown,
    userId: string | null,
  ): boolean {
    const normalizedProducerId =
      this.normalizeId(
        producerId,
      );

    const normalizedUserId =
      this.normalizeId(
        userId,
      );

    if (
      !normalizedProducerId ||
      !normalizedUserId
    ) {
      return false;
    }

    return (
      normalizedProducerId ===
      normalizedUserId
    );
  }

  // ==========================================================================
  // ACCESS RESOLUTION
  // ==========================================================================

  async resolveAccess(
    contentId: string,
    userId: string | null,
  ): Promise<ResolvedAccess | null> {
    const content =
      await this.contentModel
        .findById(contentId)
        .select(
          "accessType previewDurationSeconds producerId status previewMedia media",
        )
        .lean();

    if (!content) {
      return null;
    }

    const base = {
      contentId,
      accessType:
        content.accessType,
      previewDurationSeconds:
        content.previewDurationSeconds ??
        0,
    };

    // ------------------------------------------------------------------------
    // FREE
    // ------------------------------------------------------------------------

    if (
      content.accessType ===
      MusicAccessType.FREE
    ) {
      return {
        ...base,
        level: "full",
        reason: "free",
      };
    }

    // ------------------------------------------------------------------------
    // OWNER / CREATOR
    // ------------------------------------------------------------------------

    if (
      this.isContentOwner(
        content.producerId,
        userId,
      )
    ) {
      this.logger.debug(
        `[MusicAccess] Owner access granted ` +
          `content=${contentId} ` +
          `user=${userId}`,
      );

      return {
        ...base,
        level: "full",
        reason: "owner",
      };
    }

    // ------------------------------------------------------------------------
    // PURCHASED / ENTITLED
    // ------------------------------------------------------------------------

    if (userId) {
      const entitlement =
        await this.entitlementModel
          .findOne({
            userId,
            contentId,
            status: "active",
          })
          .lean();

      if (entitlement) {
        const expiresAt =
          entitlement.expiresAt;

        const isExpired =
          expiresAt instanceof Date &&
          expiresAt.getTime() <=
            Date.now();

        if (!isExpired) {
          return {
            ...base,
            level: "full",
            reason: "entitled",
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // PREVIEW
    // ------------------------------------------------------------------------

    const previewDuration =
      content.previewDurationSeconds ??
      0;

    const previewStorageKey =
      content.previewMedia?.storageKey?.trim();

    if (
      previewDuration > 0 &&
      previewStorageKey
    ) {
      return {
        ...base,
        level: "preview",
        reason: "preview_available",
      };
    }

    // ------------------------------------------------------------------------
    // DENIED
    // ------------------------------------------------------------------------

    return {
      ...base,
      level: "denied",
      reason: "no_entitlement",
    };
  }

  // ==========================================================================
  // PLAYBACK URL
  // ==========================================================================

  async getPlaybackUrl(
    contentId: string,
    userId: string | null,
  ): Promise<{
    url: string;
    level: AccessLevel;
    expiresInSeconds: number;
  } | null> {
    const access =
      await this.resolveAccess(
        contentId,
        userId,
      );

    if (
      !access ||
      access.level === "denied"
    ) {
      this.logger.warn(
        `[MusicPlayback] Playback denied ` +
          `content=${contentId} ` +
          `user=${userId ?? "anonymous"}`,
      );

      return null;
    }

    const content =
      await this.contentModel
        .findById(contentId)
        .select(
          "media previewMedia mediaKind title producerId accessType previewDurationSeconds",
        )
        .lean();

    if (!content) {
      return null;
    }

    // ------------------------------------------------------------------------
    // SELECT ONLY AUTHORIZED MEDIA
    // ------------------------------------------------------------------------

    let asset:
      | MediaAsset
      | undefined;

    if (
      access.level === "full"
    ) {
      asset = content.media;
    }

    if (
      access.level === "preview"
    ) {
      asset =
        content.previewMedia;

      if (
        !asset?.storageKey
      ) {
        this.logger.warn(
          `[MusicPlayback] Preview denied because no preview asset exists. ` +
            `content=${contentId}`,
        );

        return null;
      }
    }

    if (
      !asset?.storageKey
    ) {
      throw new NotFoundException(
        `Music content ${contentId} has no playable media storage key.`,
      );
    }

    const storageKey =
      asset.storageKey.trim();

    // ------------------------------------------------------------------------
    // VERIFY FILE EXISTS
    // ------------------------------------------------------------------------

    let mediaFile: {
      filePath: string;
      size: number;
    };

    try {
      mediaFile =
        this.verifyMediaFile(
          storageKey,
        );
    } catch (error) {
      this.logger.error(
        `[MusicPlayback] Media unavailable ` +
          `content=${contentId} ` +
          `storageKey=${storageKey} ` +
          `error=${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
      );

      throw new NotFoundException(
        "The processed music media file could not be found.",
      );
    }

    this.logger.log(
      `[MusicPlayback] Preparing playback ` +
        `content=${contentId} ` +
        `user=${userId ?? "anonymous"} ` +
        `level=${access.level} ` +
        `reason=${access.reason} ` +
        `storageKey=${storageKey} ` +
        `filePath=${mediaFile.filePath} ` +
        `size=${mediaFile.size}`,
    );

    // ------------------------------------------------------------------------
    // TOKEN
    // ------------------------------------------------------------------------

    const expiresInSeconds =
      10 * 60;

    const clipToSeconds =
      access.level === "preview" &&
      access.previewDurationSeconds > 0
        ? access.previewDurationSeconds
        : undefined;

    // ------------------------------------------------------------------------
    // SIGNED PLAYBACK PATH
    // ------------------------------------------------------------------------

    const relativeUrl =
      this.signMediaUrl(
        storageKey,
        {
          expiresInSeconds,
          clipToSeconds,
          contentId,
          userId,
          level:
            access.level,
        },
      );

    // ------------------------------------------------------------------------
    // IMPORTANT
    //
    // Return an absolute backend URL.
    //
    // This prevents frontend storage/media URL helpers from converting:
    //
    //   /music/entitlements/playback/...
    //
    // into:
    //
    //   /uploads/music/entitlements/playback/...
    //
    // ------------------------------------------------------------------------

    const apiBaseUrl = (
      process.env.PUBLIC_API_URL ||
      process.env.API_PUBLIC_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:3000"
    ).replace(
      /\/+$/,
      "",
    );

    const url =
      `${apiBaseUrl}${relativeUrl}`;

    this.logger.log(
      `[MusicPlayback] Signed playback URL created ` +
        `content=${contentId} ` +
        `level=${access.level} ` +
        `url=${url}`,
    );

    return {
      url,
      level:
        access.level,
      expiresInSeconds,
    };
  }

  // ==========================================================================
  // CREATE ENTITLEMENT
  // ==========================================================================

  async grantFreeOrOwnerAccessIfNeeded(): Promise<void> {
    /**
     * FREE and owner access are calculated dynamically.
     *
     * No entitlement document is necessary.
     */
  }

  async createFromPurchase(
    params: {
      userId: Types.ObjectId;
      contentId: Types.ObjectId;
      producerId: Types.ObjectId;
      purchaseId: Types.ObjectId;
      accessType: string;
      amountPaidCents: number;
      currency: string;
    },
  ): Promise<MusicEntitlement> {
    const entitlement =
      await this.entitlementModel
        .findOneAndUpdate(
          {
            userId:
              params.userId,
            contentId:
              params.contentId,
          },
          {
            $set: {
              producerId:
                params.producerId,

              purchaseId:
                params.purchaseId,

              accessType:
                params.accessType,

              amountPaidCents:
                params.amountPaidCents,

              currency:
                params.currency,

              status:
                "active",

              purchasedAt:
                new Date(),

              expiresAt:
                null,
            },

            $setOnInsert: {
              userId:
                params.userId,

              contentId:
                params.contentId,
            },
          },
          {
            upsert: true,
            new: true,
          },
        );

    this.logger.log(
      `Entitlement ensured for ` +
        `user=${params.userId} ` +
        `content=${params.contentId}`,
    );

    return entitlement;
  }

  // ==========================================================================
  // ENTITLEMENT CHECK
  // ==========================================================================

  async hasActiveEntitlement(
    userId: string,
    contentId: string,
  ): Promise<boolean> {
    const access =
      await this.resolveAccess(
        contentId,
        userId,
      );

    return (
      access?.level ===
      "full"
    );
  }

  // ==========================================================================
  // VERIFY PLAYBACK ACCESS
  // ==========================================================================

  async verifyPlaybackAccess(
    contentId: string,
    userId: string | null,
    level:
      | "full"
      | "preview",
  ): Promise<boolean> {
    const access =
      await this.resolveAccess(
        contentId,
        userId,
      );

    if (!access) {
      return false;
    }

    // ------------------------------------------------------------------------
    // FULL TOKEN
    // ------------------------------------------------------------------------

    if (
      level === "full"
    ) {
      return (
        access.level ===
        "full"
      );
    }

    // ------------------------------------------------------------------------
    // PREVIEW TOKEN
    // ------------------------------------------------------------------------

    if (
      level === "preview"
    ) {
      return (
        access.level ===
          "preview" ||
        access.level ===
          "full"
      );
    }

    return false;
  }

  // ==========================================================================
  // SIGN MEDIA URL
  // ==========================================================================

  private signMediaUrl(
    storageKey: string,
    opts: {
      expiresInSeconds: number;
      clipToSeconds?: number;
      contentId: string;
      userId: string | null;
      level:
        | "full"
        | "preview";
    },
  ): string {
    const expiresAt =
      Math.floor(
        Date.now() / 1000,
      ) +
      opts.expiresInSeconds;

    const payload:
      PlaybackTokenPayload = {
      contentId:
        opts.contentId,

      userId:
        opts.userId,

      storageKey:
        storageKey,

      level:
        opts.level,

      expiresAt,

      ...(opts.clipToSeconds &&
      opts.clipToSeconds > 0
        ? {
            clipToSeconds:
              opts.clipToSeconds,
          }
        : {}),
    };

    const encodedPayload =
      Buffer.from(
        JSON.stringify(
          payload,
        ),
      ).toString(
        "base64url",
      );

    const signature =
      this.createSignature(
        encodedPayload,
      );

    return (
      `/music/entitlements/playback/` +
      `${encodedPayload}.${signature}`
    );
  }

  // ==========================================================================
  // VERIFY PLAYBACK TOKEN
  // ==========================================================================

  verifyPlaybackToken(
    token: string,
  ): PlaybackTokenPayload {
    if (!token?.trim()) {
      throw new Error(
        "Playback token is required.",
      );
    }

    const separator =
      token.lastIndexOf(".");

    if (separator <= 0) {
      throw new Error(
        "Invalid playback token.",
      );
    }

    const encodedPayload =
      token.slice(
        0,
        separator,
      );

    const suppliedSignature =
      token.slice(
        separator + 1,
      );

    const expectedSignature =
      this.createSignature(
        encodedPayload,
      );

    const suppliedBuffer =
      Buffer.from(
        suppliedSignature,
        "utf8",
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8",
      );

    if (
      suppliedBuffer.length !==
      expectedBuffer.length
    ) {
      throw new Error(
        "Invalid playback signature.",
      );
    }

    if (
      !timingSafeEqual(
        suppliedBuffer,
        expectedBuffer,
      )
    ) {
      throw new Error(
        "Invalid playback signature.",
      );
    }

    let payload:
      PlaybackTokenPayload;

    try {
      payload =
        JSON.parse(
          Buffer.from(
            encodedPayload,
            "base64url",
          ).toString(
            "utf8",
          ),
        );
    } catch {
      throw new Error(
        "Invalid playback payload.",
      );
    }

    if (
      !payload.contentId ||
      !payload.storageKey ||
      !payload.expiresAt
    ) {
      throw new Error(
        "Incomplete playback token.",
      );
    }

    if (
      payload.level !== "full" &&
      payload.level !== "preview"
    ) {
      throw new Error(
        "Invalid playback access level.",
      );
    }

    if (
      payload.userId !== null &&
      typeof payload.userId !==
        "string"
    ) {
      throw new Error(
        "Invalid playback user.",
      );
    }

    if (
      payload.expiresAt <=
      Math.floor(
        Date.now() / 1000,
      )
    ) {
      throw new Error(
        "Playback token has expired.",
      );
    }

    return payload;
  }

  // ==========================================================================
  // SIGNATURE
  // ==========================================================================

  private createSignature(
    encodedPayload: string,
  ): string {
    return createHmac(
      "sha256",
      this.playbackSecret,
    )
      .update(
        encodedPayload,
      )
      .digest(
        "base64url",
      );
  }

  // ==========================================================================
  // RESOLVE STORAGE PATH
  // ==========================================================================

  resolveStoragePath(
    storageKey: string,
  ): string {
    let normalized =
      String(
        storageKey ?? "",
      ).trim();

    if (!normalized) {
      throw new Error(
        "Media storage key is empty.",
      );
    }

    // ------------------------------------------------------------------------
    // Windows -> URL separators
    // ------------------------------------------------------------------------

    normalized =
      normalized.replace(
        /\\/g,
        "/",
      );

    // ------------------------------------------------------------------------
    // Remove accidental origin
    // ------------------------------------------------------------------------

    normalized =
      normalized.replace(
        /^https?:\/\/[^/]+/i,
        "",
      );

    // ------------------------------------------------------------------------
    // Remove query/hash
    // ------------------------------------------------------------------------

    normalized =
      normalized.split("?")[0];

    normalized =
      normalized.split("#")[0];

    // ------------------------------------------------------------------------
    // Remove leading slash
    // ------------------------------------------------------------------------

    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    // ------------------------------------------------------------------------
    // Remove uploads/ prefix
    // ------------------------------------------------------------------------

    normalized =
      normalized.replace(
        /^uploads\/?/i,
        "",
      );

    // ------------------------------------------------------------------------
    // Remove leading slash again
    // ------------------------------------------------------------------------

    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    if (!normalized) {
      throw new Error(
        `Invalid media storage key: ${storageKey}`,
      );
    }

    // ------------------------------------------------------------------------
    // Secure uploads root
    // ------------------------------------------------------------------------

    const uploadsRoot =
      resolve(
        process.cwd(),
        "uploads",
      );

    const finalPath =
      resolve(
        join(
          uploadsRoot,
          normalized,
        ),
      );

    const relativePath =
      relative(
        uploadsRoot,
        finalPath,
      );

    // ------------------------------------------------------------------------
    // Prevent directory traversal
    // ------------------------------------------------------------------------

    if (
      relativePath.startsWith("..") ||
      isAbsolute(relativePath)
    ) {
      throw new Error(
        `Invalid media storage path outside uploads directory: ${storageKey}`,
      );
    }

    return finalPath;
  }

  // ==========================================================================
  // VERIFY MEDIA FILE
  // ==========================================================================

  verifyMediaFile(
    storageKey: string,
  ): {
    filePath: string;
    size: number;
  } {
    const filePath =
      this.resolveStoragePath(
        storageKey,
      );

    if (!existsSync(filePath)) {
      throw new Error(
        `Media file does not exist: ${storageKey}`,
      );
    }

    const stats =
      statSync(filePath);

    if (!stats.isFile()) {
      throw new Error(
        `Media path is not a file: ${storageKey}`,
      );
    }

    if (stats.size <= 0) {
      throw new Error(
        `Media file is empty: ${storageKey}`,
      );
    }

    return {
      filePath,
      size: stats.size,
    };
  }
}