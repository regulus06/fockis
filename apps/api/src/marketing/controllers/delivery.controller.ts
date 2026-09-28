import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import type { Request } from "express";

import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

import { AdDeliveryService } from "../services/ad-delivery.service";

import { AdvertisementPlacement } from "../schemas/advertisement.schema";

import { AdEventType } from "../schemas/ad-event.schema";

/* ============================================================
   AUTHENTICATED USER TYPE
============================================================ */

interface MarketingRequestUser {
  id?: string;
  _id?: string;
  userId?: string;
  sub?: string;

  age?: number;
  gender?: string;

  country?: string;
  state?: string;
  city?: string;

  interests?: string[];
  categories?: string[];
  behaviors?: string[];

  device?: string;
  operatingSystem?: string;
}

type MarketingRequest = Request & {
  user?: MarketingRequestUser;
};

/* ============================================================
   RESOLVE AUTHENTICATED USER ID
============================================================ */

function resolveUserId(
  user?: MarketingRequestUser,
): string {
  const userId =
    user?.id ??
    user?._id ??
    user?.userId ??
    user?.sub;

  if (!userId) {
    throw new UnauthorizedException(
      "Authenticated user ID is missing.",
    );
  }

  return String(userId);
}

/* ============================================================
   MARKETING DELIVERY CONTROLLER
============================================================ */

@Controller("marketing/delivery")
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(
    private readonly deliveryService: AdDeliveryService,
  ) {}

  /* ==========================================================
     GET ADS

     GET /marketing/delivery/ads

     Personalized advertisement delivery must not be cached.
  ========================================================== */

  @Get("ads")
  @Header(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, proxy-revalidate",
  )
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  async getAds(
    @Req() req: MarketingRequest,
    @Query("limit") limit?: string,
  ) {
    const user = req.user;

    const userId = resolveUserId(user);

    const parsedLimit = Number(limit ?? 5);

    const safeLimit = Math.min(
      Math.max(
        Number.isFinite(parsedLimit)
          ? Math.floor(parsedLimit)
          : 5,
        1,
      ),
      20,
    );

    const deliveryUser = {
      id: userId,

      age: user?.age,
      gender: user?.gender,

      country: user?.country,
      state: user?.state,
      city: user?.city,

      interests: user?.interests,
      categories: user?.categories,
      behaviors: user?.behaviors,

      device: user?.device,
      operatingSystem: user?.operatingSystem,
    };

    const ads =
      await this.deliveryService.getAdsForUser(
        deliveryUser,
        safeLimit,
      );

    return {
      ads,
      count: ads.length,
    };
  }

  /* ==========================================================
     GET FEED ADS

     GET /marketing/delivery/feed-ads

     Examples:

       /marketing/delivery/feed-ads

       /marketing/delivery/feed-ads?placement=FEED

       /marketing/delivery/feed-ads?placement=FEED&limit=8
  ========================================================== */

  @Get("feed-ads")
  @Header(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, proxy-revalidate",
  )
  @Header("Pragma", "no-cache")
  @Header("Expires", "0")
  async getFeedAds(
    @Req() req: MarketingRequest,
    @Query("placement") placement?: string,
    @Query("limit") limit?: string,
  ) {
    const user = req.user;

    const userId = resolveUserId(user);

    /* ----------------------------------------------------------
       SAFE LIMIT
    ---------------------------------------------------------- */

    const parsedLimit = Number(limit ?? 5);

    const safeLimit = Math.min(
      Math.max(
        Number.isFinite(parsedLimit)
          ? Math.floor(parsedLimit)
          : 5,
        1,
      ),
      20,
    );

    /* ----------------------------------------------------------
       RESOLVE PLACEMENT
    ---------------------------------------------------------- */

    const requestedPlacement =
      placement?.trim().toUpperCase();

    let resolvedPlacement: AdvertisementPlacement =
      AdvertisementPlacement.FEED;

    if (requestedPlacement) {
      const isValidPlacement =
        Object.values(
          AdvertisementPlacement,
        ).includes(
          requestedPlacement as AdvertisementPlacement,
        );

      if (isValidPlacement) {
        resolvedPlacement =
          requestedPlacement as AdvertisementPlacement;
      }
    }

    /* ----------------------------------------------------------
       DELIVERY USER
    ---------------------------------------------------------- */

    const deliveryUser = {
      id: userId,

      age: user?.age,
      gender: user?.gender,

      country: user?.country,
      state: user?.state,
      city: user?.city,

      interests: user?.interests,
      categories: user?.categories,
      behaviors: user?.behaviors,

      device: user?.device,
      operatingSystem: user?.operatingSystem,
    };

    /* ----------------------------------------------------------
       GET DELIVERED ADS
    ---------------------------------------------------------- */

    const ads =
      await this.deliveryService.getDeliveredAdsForUser(
        deliveryUser,
        resolvedPlacement,
        safeLimit,
      );

    return {
      ads,
      count: ads.length,
      placement: resolvedPlacement,
    };
  }

  /* ==========================================================
     TRACK AD EVENT

     POST /marketing/delivery/event
  ========================================================== */

  @Post("event")
  async trackEvent(
    @Req() req: MarketingRequest,
    @Body()
    body: {
      adId: string;
      campaignId: string;
      type: string;
      placement?: string;
      sessionId?: string;
      deviceType?: string;
    },
  ): Promise<{ recorded: boolean }> {
    const userId = resolveUserId(req.user);

    /* ----------------------------------------------------------
       VALIDATE EVENT TYPE
    ---------------------------------------------------------- */

    const isValidEventType =
      Object.values(AdEventType).includes(
        body.type as AdEventType,
      );

    if (!isValidEventType) {
      return {
        recorded: false,
      };
    }

    const validType =
      body.type as AdEventType;

    /* ----------------------------------------------------------
       VALIDATE REQUIRED FIELDS
    ---------------------------------------------------------- */

    if (
      !body.adId ||
      !body.campaignId
    ) {
      return {
        recorded: false,
      };
    }

    /* ----------------------------------------------------------
       RECORD EVENT
    ---------------------------------------------------------- */

    await this.deliveryService.recordEvent({
      adId: body.adId,
      campaignId: body.campaignId,
      userId,
      type: validType,
      placement: body.placement,
      sessionId: body.sessionId,
      deviceType: body.deviceType,
    });

    return {
      recorded: true,
    };
  }
}