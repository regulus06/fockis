// ============================================================================
// FOCKIS DESIGN STUDIO - MY DESIGNS CONTROLLER
// ============================================================================

import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";

import type { Request } from "express";

import { DesignService } from "../services/design.service";

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller("document-scanner/my-designs")
export class MyDesignsController {
  constructor(
    private readonly service: DesignService,
  ) {}

  // ==========================================================================
  // GET MY DESIGNS
  // GET /document-scanner/my-designs
  // ==========================================================================

  @Get()
  async list(
    @Req() req: Request,

    @Query("search")
    search?: string,

    @Query("category")
    category?: string,

    @Query("favorite")
    favorite?: string,

    @Query("archived")
    archived?: string,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    // ========================================================================
    // AUTHENTICATED USER
    // ========================================================================

    const userId =
      (req as any).user?.sub ??
      (req as any).user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        "Authenticated user required",
      );
    }

    // ========================================================================
    // PAGINATION
    // ========================================================================

    const parsedPage =
      page !== undefined
        ? Number(page)
        : undefined;

    const parsedLimit =
      limit !== undefined
        ? Number(limit)
        : undefined;

    // ========================================================================
    // VALIDATE PAGINATION
    // ========================================================================

    if (
      parsedPage !== undefined &&
      (!Number.isFinite(parsedPage) ||
        parsedPage < 1)
    ) {
      throw new Error(
        "Page must be a positive number",
      );
    }

    if (
      parsedLimit !== undefined &&
      (!Number.isFinite(parsedLimit) ||
        parsedLimit < 1)
    ) {
      throw new Error(
        "Limit must be a positive number",
      );
    }

    // ========================================================================
    // LIST DESIGNS
    // ========================================================================

    return this.service.listMine(
      String(userId),
      {
        search,
        category,

        favorite:
          favorite === undefined
            ? undefined
            : favorite === "true",

        archived:
          archived === undefined
            ? undefined
            : archived === "true",

        page: parsedPage,
        limit: parsedLimit,
      },
    );
  }
}