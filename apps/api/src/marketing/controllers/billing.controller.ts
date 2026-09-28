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
  BudgetService,
} from "../services/budget.service";

import {
  UpdateBudgetDto,
} from "../dto/budget.dto";

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
   MARKETING BILLING CONTROLLER

   GET /marketing/billing/campaign/:campaignId
   PUT /marketing/billing/campaign/:campaignId

   Manages campaign budget and billing settings.
============================================================ */

@Controller("marketing/billing")
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(
    private readonly budgetService:
      BudgetService,
  ) {}

  /* ==========================================================
     GET CAMPAIGN BUDGET

     GET /marketing/billing/campaign/:campaignId
  ========================================================== */

  @Get("campaign/:campaignId")
  async getBudget(
    @Req() req: MarketingRequest,
    @Param("campaignId")
    campaignId: string,
  ) {
    return this.budgetService.getBudget(
      this.getUserId(req),
      campaignId,
    );
  }

  /* ==========================================================
     UPDATE CAMPAIGN BUDGET

     PUT /marketing/billing/campaign/:campaignId
  ========================================================== */

  @Put("campaign/:campaignId")
  async updateBudget(
    @Req() req: MarketingRequest,
    @Param("campaignId")
    campaignId: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetService.updateBudget(
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