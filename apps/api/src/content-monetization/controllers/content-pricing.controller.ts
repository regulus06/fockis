import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  CreateContentPriceDto,
} from "../dto/create-content-price.dto";

import {
  UpdateContentPriceDto,
} from "../dto/update-content-price.dto";

import {
  ContentPricingService,
} from "../services/content-pricing.service";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

@Controller("content-monetization/pricing")
export class ContentPricingController {
  constructor(
    private readonly pricingService: ContentPricingService,
  ) {}

  // ============================================================
  // CREATE CONTENT PRICE
  //
  // POST /content-monetization/pricing
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Req() req: Request,
    @Body() dto: CreateContentPriceDto,
  ) {
    const userId = String(
      (req as any).user?.userId ??
        (req as any).user?.sub ??
        (req as any).user?.id ??
        (req as any).user?._id ??
        "",
    );

    return this.pricingService.create(
      userId,
      dto,
    );
  }

  // ============================================================
  // UPDATE CONTENT PRICE
  //
  // PATCH /content-monetization/pricing/:id
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Patch(":id")
  async update(
    @Req() req: Request,
    @Param("id") id: string,
    @Body() dto: UpdateContentPriceDto,
  ) {
    const userId = String(
      (req as any).user?.userId ??
        (req as any).user?.sub ??
        (req as any).user?.id ??
        (req as any).user?._id ??
        "",
    );

    return this.pricingService.update(
      userId,
      id,
      dto,
    );
  }

  // ============================================================
  // GET CONTENT PRICE
  //
  // GET /content-monetization/pricing/:contentId
  //
  // Public endpoint so the frontend can display:
  //
  // - Stream price
  // - Download price
  // - Currency
  // - Payment methods
  // - Download availability
  // ============================================================

  @Get(":contentId")
  async get(
    @Param("contentId") contentId: string,
  ) {
    return this.pricingService.getByContentId(
      contentId,
    );
  }
}