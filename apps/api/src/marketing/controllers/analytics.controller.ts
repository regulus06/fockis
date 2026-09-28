import {
  Controller,
  Get,
  Param,
  Query,
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
  AnalyticsService,
} from "../services/analytics.service";

@Controller(
  "marketing/analytics",
)
@UseGuards(
  JwtAuthGuard,
)
export class AnalyticsController {
  constructor(
    private readonly analyticsService:
      AnalyticsService,
  ) {}

  @Get("overview")
  async overview(
    @Req() req: Request,
  ) {
    return this.analyticsService.getAdvertiserOverview(
      this.getUserId(req),
    );
  }

  @Get(
    "campaign/:campaignId",
  )
  async campaign(
    @Req() req: Request,
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.analyticsService.getCampaignAnalytics(
      this.getUserId(req),
      campaignId,
    );
  }

  @Get(
    "campaign/:campaignId/summary",
  )
  async campaignSummary(
    @Req() req: Request,
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.analyticsService.getCampaignSummary(
      this.getUserId(req),
      campaignId,
    );
  }

  @Get(
    "campaign/:campaignId/events",
  )
  async campaignEvents(
    @Req() req: Request,
    @Param("campaignId")
    campaignId: string,
    @Query("startDate")
    startDate?: string,
    @Query("endDate")
    endDate?: string,
  ) {
    return this.analyticsService.getCampaignEvents(
      this.getUserId(req),
      campaignId,
      {
        startDate,
        endDate,
      },
    );
  }

  @Get("ad/:adId")
  async ad(
    @Req() req: Request,
    @Param("adId")
    adId: string,
  ) {
    return this.analyticsService.getAdAnalytics(
      this.getUserId(req),
      adId,
    );
  }

  private getUserId(
    req: Request,
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