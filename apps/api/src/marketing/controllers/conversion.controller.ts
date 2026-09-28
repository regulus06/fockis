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
  JwtAuthGuard,
} from "../../auth/jwt-auth.guard";

import {
  ConversionService,
} from "../services/conversion.service";

import {
  ConversionType,
} from "../schemas/ad-conversion.schema";

@Controller(
  "marketing/conversions",
)
@UseGuards(
  JwtAuthGuard,
)
export class ConversionController {
  constructor(
    private readonly conversionService:
      ConversionService,
  ) {}

  /* ============================================================
     RECORD CONVERSION

     POST /marketing/conversions

     Records a conversion associated with
     the authenticated advertiser/user.
  ============================================================ */

  @Post()
  async record(
    @Req() req: Request,
    @Body()
    body: {
      adId: string;
      type: ConversionType;
      value?: number;
      currency?: string;
      externalId?: string;
      metadata?: Record<
        string,
        unknown
      >;
    },
  ) {
    const user =
      req.user;

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

    return this.conversionService.record(
      {
        ...body,

        userId:
          String(userId),
      },
    );
  }

  /* ============================================================
     GET CAMPAIGN CONVERSIONS

     GET /marketing/conversions/campaign/:campaignId

     Returns conversions belonging to the
     authenticated advertiser for the campaign.
  ============================================================ */

  @Get(
    "campaign/:campaignId",
  )
  async getCampaignConversions(
    @Req() req: Request,
    @Param("campaignId")
    campaignId: string,
  ) {
    const user =
      req.user;

    const advertiserId =
      user?.id ??
      user?._id ??
      user?.userId ??
      user?.sub;

    if (!advertiserId) {
      throw new Error(
        "Authenticated user ID is missing from the request.",
      );
    }

    return this.conversionService.getCampaignConversions(
      String(advertiserId),
      campaignId,
    );
  }
}