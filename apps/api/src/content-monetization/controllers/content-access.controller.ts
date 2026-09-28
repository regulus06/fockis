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
  ContentAccessService,
} from "../services/content-access.service";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

@Controller("content-monetization/access")
export class ContentAccessController {
  constructor(
    private readonly accessService: ContentAccessService,
  ) {}

  // ============================================================
  // GET CONTENT ACCESS
  //
  // GET /content-monetization/access/:contentId
  //
  // Returns whether the authenticated user can:
  // - stream the content
  // - download the content
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get(":contentId")
  async getAccess(
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

    return this.accessService.getAccess(
      userId,
      contentId,
    );
  }
}