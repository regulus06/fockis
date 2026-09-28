import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
  Response,
} from "express";

import {
  createHmac,
  timingSafeEqual,
} from "crypto";

import {
  createReadStream,
  existsSync,
  statSync,
} from "fs";

import {
  basename,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "path";

import { MusicEntitlementService } from "../services/music-entitlement.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { Public } from "../../auth/public.decorator";

// ============================================================================
// TYPES
// ============================================================================

type PlaybackLevel =
  | "full"
  | "preview";

interface PlaybackTokenPayload {
  contentId: string;
  userId: string | null;
  storageKey: string;
  level: PlaybackLevel;
  expiresAt: number;
  clipToSeconds?: number;
}

interface ParsedRange {
  start: number;
  end: number;
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller("music/entitlements")
export class MusicEntitlementsController {
  private readonly playbackSecret =
    process.env.MUSIC_PLAYBACK_SECRET ||
    process.env.JWT_SECRET ||
    "fockis-music-development-secret";

  constructor(
    private readonly entitlementService: MusicEntitlementService,
  ) {}

  // ==========================================================================
  // GET PLAYBACK URL
  // ==========================================================================

  @Get(":contentId/playback-url")
  @UseGuards(JwtAuthGuard)
  async playbackUrl(
    @Param("contentId") contentId: string,
    @Req() req: any,
  ) {
    const userId =
      req.user?.id ??
      req.user?._id ??
      null;

    const result =
      await this.entitlementService.getPlaybackUrl(
        contentId,
        userId,
      );

    if (!result) {
      throw new ForbiddenException(
        "This content requires purchase to access.",
      );
    }

    return result;
  }

  // ==========================================================================
  // SIGNED MEDIA STREAM
  // ==========================================================================

  @Public()
  @Get("playback/:token")
  async playback(
    @Param("token") token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    console.log(
      "[MusicPlayback] STREAM request received:",
      {
        method: req.method,
        url: req.originalUrl,
        tokenLength:
          token?.length ?? 0,
        range:
          req.headers.range ?? null,
        userAgent:
          req.headers["user-agent"] ?? null,
      },
    );

    // ------------------------------------------------------------------------
    // VERIFY TOKEN
    // ------------------------------------------------------------------------

    const payload =
      this.verifyPlaybackToken(
        token,
      );

    if (!payload) {
      throw new UnauthorizedException(
        "The playback URL is invalid or has expired.",
      );
    }

    console.log(
      "[MusicPlayback] STREAM token verified:",
      {
        contentId:
          payload.contentId,

        userId:
          payload.userId,

        level:
          payload.level,

        expiresAt:
          payload.expiresAt,
      },
    );

    // ------------------------------------------------------------------------
    // RE-CHECK ACCESS
    // ------------------------------------------------------------------------
    //
    // This is important.
    //
    // The signed URL alone is not treated as permanent authorization.
    //
    // If an entitlement is revoked after the URL was issued, playback is
    // denied.
    //
    // ------------------------------------------------------------------------

    const stillAuthorized =
      await this.entitlementService.verifyPlaybackAccess(
        payload.contentId,
        payload.userId,
        payload.level,
      );

    if (!stillAuthorized) {
      console.warn(
        "[MusicPlayback] Playback authorization denied:",
        {
          contentId:
            payload.contentId,
          userId:
            payload.userId,
          level:
            payload.level,
        },
      );

      throw new ForbiddenException(
        "You are not authorized to play this content.",
      );
    }

    // ------------------------------------------------------------------------
    // RESOLVE MEDIA FILE
    // ------------------------------------------------------------------------

    let filePath: string;

    try {
      filePath =
        this.resolveStoragePath(
          payload.storageKey,
        );
    } catch (error) {
      console.error(
        "[MusicPlayback] STORAGE PATH RESOLUTION FAILED:",
        {
          storageKey:
            payload.storageKey,
          error,
        },
      );

      throw error;
    }

    // ------------------------------------------------------------------------
    // VERIFY FILE
    // ------------------------------------------------------------------------

    if (!existsSync(filePath)) {
      throw new NotFoundException(
        "The requested music media file could not be found.",
      );
    }

    const fileStat =
      statSync(filePath);

    if (!fileStat.isFile()) {
      throw new NotFoundException(
        "The requested music media is not a file.",
      );
    }

    const totalSize =
      fileStat.size;

    if (totalSize <= 0) {
      throw new NotFoundException(
        "The requested music media file is empty.",
      );
    }

    const mimeType =
      this.getMimeType(filePath);

    const filename =
      this.safeFilename(filePath);

    // =========================================================================
    // HEAD
    // =========================================================================

    if (req.method === "HEAD") {
      res.status(200);

      res.setHeader(
        "Content-Type",
        mimeType,
      );

      res.setHeader(
        "Content-Length",
        String(totalSize),
      );

      res.setHeader(
        "Accept-Ranges",
        "bytes",
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${filename}"`,
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0",
      );

      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition",
      );

      res.end();
      return;
    }

    // =========================================================================
    // RANGE
    // =========================================================================

    const rangeHeader =
      req.headers.range;

    if (
      typeof rangeHeader === "string" &&
      rangeHeader.trim().length > 0
    ) {
      const range =
        this.parseRange(
          rangeHeader,
          totalSize,
        );

      if (!range) {
        res.status(416);

        res.setHeader(
          "Content-Range",
          `bytes */${totalSize}`,
        );

        res.setHeader(
          "Accept-Ranges",
          "bytes",
        );

        res.end();
        return;
      }

      const start =
        range.start;

      const end =
        range.end;

      const chunkSize =
        end - start + 1;

      res.status(206);

      res.setHeader(
        "Content-Type",
        mimeType,
      );

      res.setHeader(
        "Content-Length",
        String(chunkSize),
      );

      res.setHeader(
        "Content-Range",
        `bytes ${start}-${end}/${totalSize}`,
      );

      res.setHeader(
        "Accept-Ranges",
        "bytes",
      );

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${filename}"`,
      );

      res.setHeader(
        "Cache-Control",
        "private, no-store, max-age=0",
      );

      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition",
      );

      const stream =
        createReadStream(
          filePath,
          {
            start,
            end,
          },
        );

      stream.on(
        "error",
        (error) => {
          console.error(
            "[MusicPlayback] RANGE stream error:",
            error,
          );

          if (!res.headersSent) {
            res.status(500).end();
          } else {
            res.destroy(error);
          }
        },
      );

      stream.pipe(res);
      return;
    }

    // =========================================================================
    // FULL FILE
    // =========================================================================

    res.status(200);

    res.setHeader(
      "Content-Type",
      mimeType,
    );

    res.setHeader(
      "Content-Length",
      String(totalSize),
    );

    res.setHeader(
      "Accept-Ranges",
      "bytes",
    );

    res.setHeader(
      "Content-Disposition",
      `inline; filename="${filename}"`,
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store, max-age=0",
    );

    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range, Accept-Ranges, Content-Type, Content-Disposition",
    );

    const stream =
      createReadStream(
        filePath,
      );

    stream.on(
      "error",
      (error) => {
        console.error(
          "[MusicPlayback] FULL stream error:",
          error,
        );

        if (!res.headersSent) {
          res.status(500).end();
        } else {
          res.destroy(error);
        }
      },
    );

    stream.pipe(res);
  }

  // ==========================================================================
  // MY ENTITLEMENTS
  // ==========================================================================

  @Get("mine")
  @UseGuards(JwtAuthGuard)
  async mine(
    @Req() req: any,
  ) {
    return this.entitlementService[
      "entitlementModel"
    ]
      .find({
        userId:
          req.user.id,
        status:
          "active",
      })
      .sort({
        purchasedAt:
          -1,
      })
      .lean();
  }

  // ==========================================================================
  // VERIFY TOKEN
  // ==========================================================================

  private verifyPlaybackToken(
    token: string,
  ): PlaybackTokenPayload | null {
    try {
      if (!token) {
        return null;
      }

      const separatorIndex =
        token.lastIndexOf(".");

      if (separatorIndex <= 0) {
        return null;
      }

      const encodedPayload =
        token.slice(
          0,
          separatorIndex,
        );

      const suppliedSignature =
        token.slice(
          separatorIndex + 1,
        );

      if (
        !encodedPayload ||
        !suppliedSignature
      ) {
        return null;
      }

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
        return null;
      }

      if (
        !timingSafeEqual(
          suppliedBuffer,
          expectedBuffer,
        )
      ) {
        return null;
      }

      const decoded =
        Buffer.from(
          encodedPayload,
          "base64url",
        ).toString(
          "utf8",
        );

      const parsed =
        JSON.parse(
          decoded,
        ) as Partial<PlaybackTokenPayload>;

      if (
        typeof parsed.contentId !==
        "string"
      ) {
        return null;
      }

      if (
        typeof parsed.storageKey !==
        "string"
      ) {
        return null;
      }

      if (
        parsed.level !== "full" &&
        parsed.level !== "preview"
      ) {
        return null;
      }

      if (
        typeof parsed.expiresAt !==
        "number"
      ) {
        return null;
      }

      if (
        parsed.userId !== null &&
        typeof parsed.userId !==
          "string"
      ) {
        return null;
      }

      const now =
        Math.floor(
          Date.now() / 1000,
        );

      if (
        parsed.expiresAt <=
        now
      ) {
        return null;
      }

      return {
        contentId:
          parsed.contentId,

        userId:
          parsed.userId ?? null,

        storageKey:
          parsed.storageKey,

        level:
          parsed.level,

        expiresAt:
          parsed.expiresAt,

        ...(typeof parsed.clipToSeconds ===
        "number"
          ? {
              clipToSeconds:
                parsed.clipToSeconds,
            }
          : {}),
      };
    } catch (error) {
      console.error(
        "[MusicPlayback] Token verification exception:",
        error,
      );

      return null;
    }
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
  // STORAGE PATH
  // ==========================================================================

  private resolveStoragePath(
    storageKey: string,
  ): string {
    let normalized =
      String(
        storageKey ?? "",
      ).trim();

    if (!normalized) {
      throw new NotFoundException(
        "The media storage key is empty.",
      );
    }

    normalized =
      normalized.replace(
        /\\/g,
        "/",
      );

    normalized =
      normalized.replace(
        /^https?:\/\/[^/]+/i,
        "",
      );

    normalized =
      normalized.split("?")[0];

    normalized =
      normalized.split("#")[0];

    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    normalized =
      normalized.replace(
        /^uploads\/?/i,
        "",
      );

    normalized =
      normalized.replace(
        /^\/+/,
        "",
      );

    if (!normalized) {
      throw new NotFoundException(
        "The media storage key is invalid.",
      );
    }

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

    if (
      relativePath.startsWith("..") ||
      isAbsolute(relativePath)
    ) {
      throw new ForbiddenException(
        "Invalid media storage path.",
      );
    }

    return finalPath;
  }

  // ==========================================================================
  // MIME
  // ==========================================================================

  private getMimeType(
    filePath: string,
  ): string {
    switch (
      extname(filePath).toLowerCase()
    ) {
      case ".mp3":
        return "audio/mpeg";

      case ".wav":
        return "audio/wav";

      case ".ogg":
        return "audio/ogg";

      case ".oga":
        return "audio/ogg";

      case ".m4a":
        return "audio/mp4";

      case ".aac":
        return "audio/aac";

      case ".flac":
        return "audio/flac";

      case ".mp4":
        return "video/mp4";

      case ".webm":
        return "video/webm";

      case ".mov":
        return "video/quicktime";

      default:
        return "application/octet-stream";
    }
  }

  // ==========================================================================
  // RANGE PARSER
  // ==========================================================================

  private parseRange(
    rangeHeader: string,
    totalSize: number,
  ): ParsedRange | null {
    const match =
      /^bytes=(\d*)-(\d*)$/i.exec(
        rangeHeader.trim(),
      );

    if (!match) {
      return null;
    }

    const startText =
      match[1];

    const endText =
      match[2];

    // ------------------------------------------------------------------------
    // bytes=-500
    // ------------------------------------------------------------------------

    if (
      !startText &&
      endText
    ) {
      const suffixLength =
        Number(endText);

      if (
        !Number.isFinite(
          suffixLength,
        ) ||
        suffixLength <= 0
      ) {
        return null;
      }

      return {
        start: Math.max(
          totalSize -
            suffixLength,
          0,
        ),

        end:
          totalSize - 1,
      };
    }

    if (!startText) {
      return null;
    }

    const start =
      Number(startText);

    if (
      !Number.isFinite(start) ||
      start < 0 ||
      start >= totalSize
    ) {
      return null;
    }

    let end =
      endText
        ? Number(endText)
        : totalSize - 1;

    if (
      !Number.isFinite(end)
    ) {
      return null;
    }

    end =
      Math.min(
        end,
        totalSize - 1,
      );

    if (end < start) {
      return null;
    }

    return {
      start,
      end,
    };
  }

  // ==========================================================================
  // SAFE FILENAME
  // ==========================================================================

  private safeFilename(
    filePath: string,
  ): string {
    const name =
      basename(filePath)
        .replace(
          /["\r\n]/g,
          "",
        );

    return name || "media";
  }
}