import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";

import { RbacGuard } from "../rbac/rbac.guard";
import { Roles } from "../rbac/roles.decorator";
import { Role } from "../rbac/roles.enum";
import { SuperAdminGuard } from "../safety/super-admin.guard";

import { FinanceAdminService } from "./finance.service";

@Controller("admin/finance")
@UseGuards(RbacGuard, SuperAdminGuard)
@Roles(Role.SUPER_ADMIN)
export class FinanceAdminController {
  constructor(
    private readonly finance: FinanceAdminService,
  ) {}

  // ============================================================
  // DASHBOARD
  // ============================================================

  @Get("overview")
  overview(
    @Query("period") period = "30d",
  ) {
    return this.finance.overview(period);
  }

  // ============================================================
  // TRANSACTIONS
  // ============================================================

  @Get("transactions")
  transactions(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.transactions(query);
  }

  // ============================================================
  // REVENUE
  // ============================================================

  @Get("revenue")
  revenue(
    @Query("period") period = "30d",
  ) {
    return this.finance.revenue(period);
  }

  // ============================================================
  // FEES
  // ============================================================

  @Get("fees")
  fees(
    @Query("period") period = "30d",
  ) {
    return this.finance.fees(period);
  }

  // ============================================================
  // INVOICES
  // ============================================================

  @Get("invoices")
  invoices(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.invoices(query);
  }

  // ============================================================
  // WALLETS
  // ============================================================

  @Get("wallets")
  wallets(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.wallets(query);
  }

  // ============================================================
  // COINS
  // ============================================================

  @Get("coins")
  coins(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.coins(query);
  }

  // ============================================================
  // REPORTS
  // ============================================================

  @Get("reports")
  reports() {
    return this.finance.reports();
  }

  // ============================================================
  // SHOP ORDER FINANCE
  // ============================================================

  @Get("shop/orders/:orderId/finance")
  shopOrderFinance(
    @Param("orderId") orderId: string,
  ) {
    return this.finance.shopOrderFinance(orderId);
  }

  // ============================================================
  // PAYOUTS
  // ============================================================

  @Get("payouts")
  payouts(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.payouts(query);
  }

  @Get("payouts/:id")
  payout(
    @Param("id") id: string,
  ) {
    return this.finance.payout(id);
  }

  @Post("payouts/:id/approve")
  approvePayout(
    @Param("id") id: string,
  ) {
    return this.finance.approvePayout(id);
  }

  @Post("payouts/:id/cancel")
  cancelPayout(
    @Param("id") id: string,
  ) {
    return this.finance.cancelPayout(id);
  }

  // ============================================================
  // REFUNDS
  // ============================================================

  @Get("refunds")
  refunds(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.refunds(query);
  }

  @Get("refunds/:id")
  refund(
    @Param("id") id: string,
  ) {
    return this.finance.refund(id);
  }

  @Post("refunds/:id/approve")
  approveRefund(
    @Param("id") id: string,
  ) {
    return this.finance.approveRefund(id);
  }

  @Post("refunds/:id/reject")
  rejectRefund(
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.finance.rejectRefund(
      id,
      body?.reason,
    );
  }

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================

  @Get("subscriptions")
  subscriptions(
    @Query() query: Record<string, string>,
  ) {
    return this.finance.subscriptions(query);
  }

  @Get("subscriptions/:id")
  subscription(
    @Param("id") id: string,
  ) {
    return this.finance.subscription(id);
  }

  @Post("subscriptions/:id/cancel")
  cancelSubscription(
    @Param("id") id: string,
  ) {
    return this.finance.cancelSubscription(id);
  }

  @Post("subscriptions/:id/reactivate")
  reactivateSubscription(
    @Param("id") id: string,
  ) {
    return this.finance.reactivateSubscription(id);
  }

  // ============================================================
  // PAYMENT REFUND
  // ============================================================

  @Post("payments/:paymentId/refund")
  refundPayment(
    @Param("paymentId") paymentId: string,
    @Body()
    body: {
      amount?: number;
      reason?: string;
    },
  ) {
    return this.finance.requestPaymentRefund(
      paymentId,
      body?.amount,
      body?.reason,
    );
  }
}