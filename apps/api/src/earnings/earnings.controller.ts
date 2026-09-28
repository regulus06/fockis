import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { Request } from "express";

import { EarningsService } from "./earnings.service";

import { RequestWithdrawalDto } from "./dto/request-withdrawal.dto";

import { ConnectAccountDto } from "./dto/connect-account.dto";

import { UpdatePayoutSettingsDto } from "./dto/update-payout-settings.dto";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// ============================================================================
// AUTHENTICATED REQUEST
// ============================================================================

interface AuthenticatedRequest
  extends Request {
  user: {
    id?: string;
    _id?: string;
    userId?: string;
  };
}

// ============================================================================
// CONTROLLER
// ============================================================================

@Controller("earnings")
@UseGuards(JwtAuthGuard)
export class EarningsController {
  constructor(
    private readonly earningsService: EarningsService,
  ) {}

  // ==========================================================================
  // USER ID
  // ==========================================================================

  private getUserId(
    req: AuthenticatedRequest,
  ): string {
    const userId =
      req.user?.id ??
      req.user?._id ??
      req.user?.userId;

    if (!userId) {
      throw new Error(
        "Authenticated user ID was not found.",
      );
    }

    return String(userId);
  }

  // ==========================================================================
  // DASHBOARD
  // ==========================================================================

  @Get()
  async dashboard(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.earningsService.getDashboard(
      this.getUserId(req),
    );
  }

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================

  @Get("transactions")
  async transactions(
    @Req()
    req: AuthenticatedRequest,

    @Query("page")
    page?: string,

    @Query("limit")
    limit?: string,
  ) {
    const parsedPage =
      Number(page ?? 1);

    const parsedLimit =
      Number(limit ?? 25);

    return this.earningsService.getTransactions(
      this.getUserId(req),

      Number.isFinite(parsedPage) &&
        parsedPage > 0
        ? parsedPage
        : 1,

      Number.isFinite(parsedLimit) &&
        parsedLimit > 0
        ? parsedLimit
        : 25,
    );
  }

  // ==========================================================================
  // WITHDRAWALS
  // ==========================================================================

  @Get("withdrawals")
  async withdrawals(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.earningsService.getWithdrawals(
      this.getUserId(req),
    );
  }

  // ==========================================================================
  // CREATE STRIPE CONNECT ACCOUNT
  // ==========================================================================

  @Post("stripe/connect")
  async createConnect(
    @Req()
    req: AuthenticatedRequest,

    @Body()
    dto: ConnectAccountDto,
  ) {
    return this.earningsService.createConnectAccount(
      this.getUserId(req),
      dto.country ?? "US",
    );
  }

  // ==========================================================================
  // STRIPE ONBOARDING
  // ==========================================================================

  @Post("stripe/onboarding")
  async onboarding(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.earningsService.createConnectOnboardingLink(
      this.getUserId(req),
    );
  }

  // ==========================================================================
  // STRIPE STATUS
  // ==========================================================================

  @Get("stripe/status")
  async stripeStatus(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.earningsService.refreshStripeStatus(
      this.getUserId(req),
    );
  }

  // ==========================================================================
  // REQUEST WITHDRAWAL
  // ==========================================================================

  @Post("withdraw")
  async withdraw(
    @Req()
    req: AuthenticatedRequest,

    @Body()
    dto: RequestWithdrawalDto,
  ) {
    return this.earningsService.requestWithdrawal(
      this.getUserId(req),
      dto,
    );
  }

  // ==========================================================================
  // SETTLE PENDING EARNINGS
  // ==========================================================================

  @Post("settle")
  async settle(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.earningsService.settlePendingEarnings(
      this.getUserId(req),
    );
  }

  // ==========================================================================
  // PAYOUT SETTINGS
  // ==========================================================================

  @Put("payout-settings")
  async payoutSettings(
    @Req()
    req: AuthenticatedRequest,

    @Body()
    dto: UpdatePayoutSettingsDto,
  ) {
    return this.earningsService.updatePayoutSchedule(
      this.getUserId(req),
      dto.payoutSchedule,
    );
  }
}