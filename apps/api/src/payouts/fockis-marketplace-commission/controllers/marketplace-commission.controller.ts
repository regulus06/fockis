import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { RbacGuard } from "../../../admin/rbac/rbac.guard";
import { Roles } from "../../../admin/rbac/roles.decorator";
import { Role } from "../../../admin/rbac/roles.enum";
import { SuperAdminGuard } from "../../../admin/safety/super-admin.guard";
import { FinanceAuditService } from "../../marketplace-finance/services/finance-audit.service";
import {
  MarketplaceCommissionService,
  UpdateCommissionSettings,
} from "../services/marketplace-commission.service";

type AuthRequest = Request & {
  user?: {
    id?: string;
    _id?: string | { toString(): string };
    userId?: string;
    sub?: string;
    role?: string;
    roles?: string[];
    isAdmin?: boolean;
  };
};

function requireAdmin(req: AuthRequest): string {
  const user = req.user;
  const id = String(user?.id ?? user?._id ?? user?.userId ?? user?.sub ?? "").trim();
  if (!id) throw new UnauthorizedException("Sign in to manage commission settings.");

  const roles = [
    ...(Array.isArray(user?.roles) ? user.roles : []),
    user?.role ?? "",
  ].map((role) => String(role).toLowerCase());

  const allowed =
    user?.isAdmin === true ||
    roles.some((role) =>
      ["admin", "superadmin", "super_admin", "platform_admin"].includes(role),
    );

  if (!allowed) {
    throw new ForbiddenException("Administrator access is required.");
  }
  return id;
}

/**
 * Admin API:
 * GET   /admin/marketplace-commission
 * PATCH /admin/marketplace-commission
 *
 * The application's global JWT guard must populate req.user.
 * This controller also checks the admin role; adapt the accepted role names
 * if your user schema uses a different convention.
 */
@Controller("admin/marketplace-commission")
@UseGuards(RbacGuard, SuperAdminGuard)
@Roles(Role.SUPER_ADMIN)
export class MarketplaceCommissionController {
  constructor(
    private readonly commissionService: MarketplaceCommissionService,
    private readonly audit: FinanceAuditService,
  ) {}

  @Get()
  getSettings(@Req() req: AuthRequest) {
    requireAdmin(req);
    return this.commissionService.getSettings();
  }

  @Patch()
  async updateSettings(
    @Req() req: AuthRequest,
    @Body() body: UpdateCommissionSettings,
  ) {
    const adminId = requireAdmin(req);
    const updated = await this.commissionService.updateSettings(adminId, body);
    await this.audit.record("commission_updated", "commission", "marketplace", adminId, { ...body });
    return updated;
  }
}
