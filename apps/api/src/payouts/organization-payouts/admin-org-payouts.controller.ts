/**
 * Admin Center → Finance → Organization payouts.
 * Super admins only (same guards as Marketplace payouts).
 *
 *   GET   /admin/organization-payouts                         overview + settings
 *   PUT   /admin/organization-payouts/config                  default fee, waiting days, cover-fee option
 *   PATCH /admin/organization-payouts/organizations/:orgId    custom fee / hold
 *   POST  /admin/organization-payouts/organizations/:orgId/run  pay out now
 *   GET   /admin/organization-payouts/audit?organizationId=   audit log
 */

import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import type { Request } from "express";

import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { Roles } from "../../admin/rbac/roles.decorator";
import { Role } from "../../admin/rbac/roles.enum";
import { SuperAdminGuard } from "../../admin/safety/super-admin.guard";
import { FinanceAuditService } from "../marketplace-finance/services/finance-audit.service";
import { OrgPayoutsService } from "./org-payouts.service";

type AuthenticatedRequest = Request & { user?: { _id?: unknown; id?: unknown; userId?: unknown; sub?: unknown } };

function adminId(req: AuthenticatedRequest): string {
  const user = req.user;
  const id = String(user?.id ?? user?.userId ?? user?._id ?? user?.sub ?? "").trim();
  if (!id) throw new UnauthorizedException("Sign in as an administrator.");
  return id;
}

@Controller("admin/organization-payouts")
@UseGuards(RbacGuard, SuperAdminGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminOrgPayoutsController {
  constructor(
    private readonly payouts: OrgPayoutsService,
    private readonly audit: FinanceAuditService,
  ) {}

  @Get()
  overview() {
    return this.payouts.adminList();
  }

  @Put("config")
  saveConfig(@Body() body: Record<string, unknown>, @Req() req: AuthenticatedRequest) {
    return this.payouts.saveConfig(body ?? {}, adminId(req));
  }

  @Patch("organizations/:organizationId")
  updateOrg(@Param("organizationId") organizationId: string, @Body() body: Record<string, unknown>, @Req() req: AuthenticatedRequest) {
    return this.payouts.adminSetOrg(organizationId, adminId(req), body ?? {});
  }

  @Post("organizations/:organizationId/run")
  run(@Param("organizationId") organizationId: string, @Req() req: AuthenticatedRequest) {
    return this.payouts.adminRunNow(organizationId, adminId(req));
  }

  @Get("audit")
  auditLog(@Query("organizationId") organizationId?: string) {
    return this.audit.list({ entity: "organization", entityId: organizationId || undefined, limit: 200 });
  }
}
