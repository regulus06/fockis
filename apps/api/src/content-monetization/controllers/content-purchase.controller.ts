import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  PurchaseContentDto,
} from "../dto/purchase-content.dto";

import {
  ContentPurchaseService,
} from "../services/content-purchase.service";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

@Controller("content-monetization/purchases")
export class ContentPurchaseController {
  constructor(
    private readonly purchaseService: ContentPurchaseService,
  ) {}

  // ============================================================
  // CREATE CONTENT PURCHASE
  //
  // POST /content-monetization/purchases
  //
  // Supports:
  // - Coins
  // - Stripe
  //
  // Purchase types:
  // - STREAM
  // - DOWNLOAD
  // - STREAM_AND_DOWNLOAD
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post()
  async purchase(
    @Req() req: Request,
    @Body() dto: PurchaseContentDto,
  ) {
    const userId = String(
      (req as any).user?.userId ??
        (req as any).user?.sub ??
        (req as any).user?.id ??
        (req as any).user?._id ??
        "",
    );

    return this.purchaseService.createPurchase(
      userId,
      dto.contentId,
      dto.purchaseType,
      dto.paymentMethod,
    );
  }

  // ============================================================
  // GET USER PURCHASES
  //
  // GET /content-monetization/purchases
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Get()
  async purchases(
    @Req() req: Request,
  ) {
    const userId = String(
      (req as any).user?.userId ??
        (req as any).user?.sub ??
        (req as any).user?.id ??
        (req as any).user?._id ??
        "",
    );

    return this.purchaseService.getUserPurchases(
      userId,
    );
  }

  // ============================================================
  // COMPLETE PURCHASE
  //
  // POST /content-monetization/purchases/:purchaseId/complete
  //
  // paymentReference can be:
  //
  // Stripe:
  // pi_xxxxxxxxx
  //
  // Wallet:
  // wallet transaction/reference ID
  // ============================================================

  @UseGuards(JwtAuthGuard)
  @Post(":purchaseId/complete")
  async complete(
    @Param("purchaseId") purchaseId: string,
    @Body()
    body: {
      paymentReference?: string;
    },
  ) {
    return this.purchaseService.completePurchase(
      purchaseId,
      body.paymentReference,
    );
  }
}