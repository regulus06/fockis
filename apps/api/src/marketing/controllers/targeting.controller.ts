import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";

import type {
  Request,
} from "express";

import {
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  TargetingService,
} from "../services/targeting.service";

import {
  TargetingDto,
} from "../dto/targeting.dto";

/* ============================================================
   AUTHENTICATED USER TYPE
============================================================ */

interface MarketingRequestUser {
  id?: string;
  _id?: string;
  userId?: string;
  sub?: string;
}

type MarketingRequest = Request & {
  user?: MarketingRequestUser;
};

/* ============================================================
   MARKETING TARGETING CONTROLLER

   GET /marketing/targeting/:campaignId
   PUT /marketing/targeting/:campaignId

   Manages campaign audience targeting.
============================================================ */

@Controller("marketing/targeting")
@UseGuards(JwtAuthGuard)
export class TargetingController {
  constructor(
    private readonly targetingService:
      TargetingService,
  ) {}

  /* ==========================================================
     GET TARGETING

     GET /marketing/targeting/:campaignId
  ========================================================== */

  @Get(":campaignId")
  async get(
    @Req() req: MarketingRequest,
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.targetingService.get(
      this.getUserId(req),
      campaignId,
    );
  }

  /* ==========================================================
     SAVE TARGETING

     PUT /marketing/targeting/:campaignId
  ========================================================== */

  @Put(":campaignId")
  async save(
    @Req() req: MarketingRequest,
    @Param("campaignId")
    campaignId: string,
    @Body() dto: TargetingDto,
  ) {
    return this.targetingService.save(
      this.getUserId(req),
      campaignId,
      dto,
    );
  }

  /* ==========================================================
     GET AUTHENTICATED USER ID
  ========================================================== */

  private getUserId(
    req: MarketingRequest,
  ): string {
    const user = req.user;

    const userId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!userId) {
      throw new Error(
        "Authenticated user ID is missing from the request.",
      );
    }

    return String(userId);
  }
}