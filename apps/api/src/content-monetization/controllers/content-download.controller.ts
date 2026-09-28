import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  ContentDownloadService,
} from "../services/content-download.service";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

@Controller("content-monetization/download")
export class ContentDownloadController {
  constructor(
    private readonly downloadService: ContentDownloadService,
  ) {}

  // ============================================================
  // CREATE DOWNLOAD ACCESS
  //
  // GET /content-monetization/download/:contentId
  //
  // The ContentDownloadService is responsible for verifying
  // that the authenticated user has download entitlement.
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get(":contentId")
  async download(
    @Req() req: Request,
    @Param("contentId") contentId: string,
  ) {
    const userId = String(
      (req as any).user?.userId ??
        (req as any).user?.sub ??
        (req as any).user?.id ??
        (req as any).user?._id ??
        "",
    );

    const ip =
      req.ip ??
      req.socket?.remoteAddress ??
      "unknown";

    const userAgent =
      req.headers["user-agent"] ??
      "unknown";

    return this.downloadService.createDownloadAccess(
      userId,
      contentId,
      ip,
      String(userAgent),
    );
  }
}