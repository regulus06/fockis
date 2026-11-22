import { Body, Controller, Get, HttpCode, Post, Query, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { SellerFinanceService } from "../services/seller-finance.service";

type AuthenticatedRequest = Request & {
  user?: { _id?: unknown; id?: unknown; userId?: unknown; sub?: unknown };
};

function currentUserId(req: AuthenticatedRequest): string {
  const user = req.user;
  const id = user?.id ?? user?.userId ?? user?._id ?? user?.sub;
  const value = id ? String(id).trim() : "";
  if (!value) throw new UnauthorizedException("Sign in to see your payouts.");
  return value;
}

/**
 * Seller money endpoints. Protected by the global JwtAuthGuard; every call
 * checks that the signed-in user owns the store.
 *
 *   GET  /payouts/summary?storeId=        earnings, balances, plan, holds, Stripe status
 *   GET  /payouts/history?storeId=        every sale with commission, fee and state
 *   GET  /payouts/early/preview?storeId=  what an early payout would be now
 *   POST /payouts/early?storeId=          { quoteHash } pay early after agreeing to the fee
 */
@Controller("payouts")
export class SellerFinanceController {
  constructor(private readonly finance: SellerFinanceService) {}

  @Get("summary")
  summary(@Req() req: AuthenticatedRequest, @Query("storeId") storeId: string) {
    return this.finance.summary(currentUserId(req), storeId);
  }

  @Get("history")
  history(@Req() req: AuthenticatedRequest, @Query("storeId") storeId: string) {
    return this.finance.history(currentUserId(req), storeId);
  }

  @Get("early/preview")
  preview(@Req() req: AuthenticatedRequest, @Query("storeId") storeId: string) {
    return this.finance.earlyPreview(currentUserId(req), storeId);
  }

  @Post("early")
  @HttpCode(200)
  confirm(
    @Req() req: AuthenticatedRequest,
    @Query("storeId") storeId: string,
    @Body() body: { quoteHash?: string },
  ) {
    return this.finance.earlyConfirm(currentUserId(req), storeId, String(body?.quoteHash ?? ""));
  }
}
