import {
  Controller,
  Get,
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

import {
  CampaignsService,
} from "../services/campaign.service";

import {
  AdvertisementService,
} from "../services/advertisement.service";

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
   MARKETING CONTROLLER

   GET /marketing/dashboard

   Returns the main advertiser dashboard data:

   - Analytics overview
   - Recent campaigns
   - Recent advertisements
============================================================ */

@Controller("marketing")
@UseGuards(JwtAuthGuard)
export class MarketingController {
  constructor(
    private readonly analyticsService:
      AnalyticsService,

    private readonly campaignsService:
      CampaignsService,

    private readonly advertisementService:
      AdvertisementService,
  ) {}

  /* ==========================================================
     GET MARKETING DASHBOARD

     GET /marketing/dashboard
  ========================================================== */

  @Get("dashboard")
  async dashboard(
    @Req() req: MarketingRequest,
  ) {
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

    const advertiserId =
      String(userId);

    const [
      analytics,
      campaigns,
      ads,
    ] = await Promise.all([
      this.analyticsService.getAdvertiserOverview(
        advertiserId,
      ),

      this.campaignsService.findAll(
        advertiserId,
      ),

      this.advertisementService.findMine(
        advertiserId,
      ),
    ]);

    return {
      analytics,

      campaigns:
        campaigns.slice(
          0,
          10,
        ),

      ads:
        ads.slice(
          0,
          10,
        ),
    };
  }
}