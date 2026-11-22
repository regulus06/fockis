import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

import { RbacGuard } from "../../../admin/rbac/rbac.guard";
import { Roles } from "../../../admin/rbac/roles.decorator";
import { Role } from "../../../admin/rbac/roles.enum";
import { SuperAdminGuard } from "../../../admin/safety/super-admin.guard";
import { HOLD_REASONS, HOLD_REASON_LABELS } from "../schemas/payout-hold.schema";
import { FinanceAuditService } from "../services/finance-audit.service";
import { CreateHoldInput, PayoutHoldsService } from "../services/payout-holds.service";
import { PayoutPlanInput, PayoutPlansService } from "../services/payout-plans.service";
import { SellerFinanceService } from "../services/seller-finance.service";

type AuthenticatedRequest = Request & {
  user?: { _id?: unknown; id?: unknown; userId?: unknown; sub?: unknown };
};

function adminId(req: AuthenticatedRequest): string {
  const user = req.user;
  const id = String(user?.id ?? user?.userId ?? user?._id ?? user?.sub ?? "").trim();
  if (!id) throw new UnauthorizedException("Sign in as an administrator.");
  return id;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Stop spreadsheet formulas and quote everything.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Admin Center → Finance → Marketplace payouts.
 * Super admins only (same guards as the rest of /admin/finance).
 */
@Controller("admin/marketplace-finance")
@UseGuards(RbacGuard, SuperAdminGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminMarketplaceFinanceController {
  constructor(
    private readonly plans: PayoutPlansService,
    private readonly holds: PayoutHoldsService,
    private readonly finance: SellerFinanceService,
    private readonly audit: FinanceAuditService,
  ) {}

  /* ---------------- Overview ---------------- */

  @Get("overview")
  overview() {
    return this.finance.adminOverview();
  }

  /* ---------------- Payout plans and early payout fees ---------------- */

  @Get("plans")
  listPlans(@Query("archived") archived?: string) {
    return this.plans.list(archived === "1" || archived === "true");
  }

  @Post("plans")
  createPlan(@Req() req: AuthenticatedRequest, @Body() body: PayoutPlanInput) {
    return this.plans.create(adminId(req), body ?? {});
  }

  @Patch("plans/:planId")
  updatePlan(@Req() req: AuthenticatedRequest, @Param("planId") planId: string, @Body() body: PayoutPlanInput) {
    return this.plans.update(adminId(req), planId, body ?? {});
  }

  @Post("plans/:planId/status")
  setPlanStatus(
    @Req() req: AuthenticatedRequest,
    @Param("planId") planId: string,
    @Body() body: { status: "active" | "inactive" | "archived" },
  ) {
    return this.plans.setStatus(adminId(req), planId, body?.status);
  }

  @Post("plans/:planId/default")
  makeDefault(@Req() req: AuthenticatedRequest, @Param("planId") planId: string) {
    return this.plans.makeDefault(adminId(req), planId);
  }

  /* ---------------- Sellers ---------------- */

  @Get("stores")
  searchStores(@Query("q") q = "") {
    return this.finance.searchStores(q);
  }

  @Get("stores/:storeId")
  storeRecord(@Param("storeId") storeId: string) {
    return this.finance.adminStoreRecord(storeId);
  }

  @Put("stores/:storeId/plan")
  assignPlan(
    @Req() req: AuthenticatedRequest,
    @Param("storeId") storeId: string,
    @Body() body: { planId?: string | null },
  ) {
    return this.plans.assign(adminId(req), storeId, body?.planId || null);
  }

  /* ---------------- Holds ---------------- */

  @Get("holds/reasons")
  holdReasons() {
    return HOLD_REASONS.map((value) => ({ value, label: HOLD_REASON_LABELS[value] }));
  }

  @Get("holds")
  listHolds(@Query() query: Record<string, string>) {
    return this.holds.list(query);
  }

  @Post("holds")
  createHold(@Req() req: AuthenticatedRequest, @Body() body: CreateHoldInput & { note?: string }) {
    return this.holds.create(adminId(req), body);
  }

  @Post("holds/:holdId/release")
  async releaseHold(
    @Req() req: AuthenticatedRequest,
    @Param("holdId") holdId: string,
    @Body() body: { note?: string },
  ) {
    const hold = await this.holds.release(adminId(req), holdId, body?.note ?? "");
    // Pay sales that were stopped by this hold, if nothing else still holds them.
    const released = await this.finance.releaseAfterHold(
      String(hold.storeId),
      hold.scope === "order" && hold.orderId ? String(hold.orderId) : undefined,
    );
    return { hold, released };
  }

  @Post("holds/:holdId/extend")
  extendHold(
    @Req() req: AuthenticatedRequest,
    @Param("holdId") holdId: string,
    @Body() body: { reviewBy: string; note?: string },
  ) {
    return this.holds.extend(adminId(req), holdId, body?.reviewBy, body?.note ?? "");
  }

  @Post("holds/:holdId/notes")
  noteHold(@Req() req: AuthenticatedRequest, @Param("holdId") holdId: string, @Body() body: { note: string }) {
    return this.holds.addNote(adminId(req), holdId, body?.note);
  }

  /* ---------------- Early payouts, audit, export ---------------- */

  @Get("early-payouts")
  earlyPayouts(@Query() query: Record<string, string>) {
    return this.finance.listEarlyRequests(query);
  }

  @Get("audit")
  auditLog(@Query() query: Record<string, string>) {
    return this.audit.list({ ...query, limit: Number(query.limit) || 100 });
  }

  @Get("export/early-payouts.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="fockis-early-payouts.csv"')
  async exportEarly(@Query() query: Record<string, string>) {
    const rows = await this.finance.listEarlyRequests({ ...query, limit: 1000 });
    const header = ["Request ID", "Store ID", "Date", "Status", "Currency", "Gross", "Fee", "Net", "Transferred", "Fee collected", "Plan"];
    const lines = rows.map((r) =>
      [
        String(r._id),
        String(r.storeId),
        ((r as typeof r & { createdAt?: Date }).createdAt ?? "").toString(),
        r.status,
        r.currency.toUpperCase(),
        (r.grossCents / 100).toFixed(2),
        (r.feeCents / 100).toFixed(2),
        (r.netCents / 100).toFixed(2),
        (r.transferredNetCents / 100).toFixed(2),
        (r.collectedFeeCents / 100).toFixed(2),
        String((r.pricingSnapshot as { plan?: { name?: string } })?.plan?.name ?? ""),
      ]
        .map(csvCell)
        .join(","),
    );
    return [header.map(csvCell).join(","), ...lines].join("\r\n");
  }
}
