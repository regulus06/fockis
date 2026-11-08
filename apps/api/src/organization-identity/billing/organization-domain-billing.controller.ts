import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsBoolean, IsDateString, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { OrganizationIdentityCommonService } from "../services/organization-identity-common.service";
import { DomainPricingService } from "./domain-pricing.service";
import { OrganizationDomainBillingService } from "./organization-domain-billing.service";

type Req = { user?: Record<string, unknown> };

function userIdOf(req: Req) {
  const u = req.user ?? {};
  const id = u.id ?? u._id ?? u.userId ?? u.sub;
  if (!id) throw new ForbiddenException("Authenticated request does not contain a user ID.");
  return String(id);
}

function adminNameOf(req: Req) {
  const u = req.user ?? {};
  return `${String(u.name ?? ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Fockis admin"))} (Fockis admin)`;
}

class DomainCheckoutBody {
  @IsOptional() @IsIn(["renew", "members"]) kind?: "renew" | "members";
  @IsOptional() @IsInt() @Min(0) @Max(10000) memberDomains?: number;
}
class DomainClaimBody {
  @IsString() @MaxLength(200) paymentIntentId!: string;
}
class DomainPricingBody {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsString() @Matches(/^[A-Za-z]{3}$/) currency?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(60) periodMonths?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(180) graceDays?: number;
  @IsOptional() @IsNumber() @Min(0) memberDomainPrice?: number;
  @IsOptional() @IsNumber() @Min(0) personalDomainPrice?: number;
  @IsOptional() @IsString() @MaxLength(600) note?: string;
  /** { church: 60, school: 120, … } — checked per type in the service. */
  @IsOptional() @IsObject() prices?: Record<string, number>;
}
class OrgBillingActionBody {
  @IsIn(["exempt", "unexempt", "set_paid_until", "clear_paid"]) action!: "exempt" | "unexempt" | "set_paid_until" | "clear_paid";
  @IsOptional() @IsDateString() until?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsInt() @Min(0) memberDomains?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/**
 * Organization administrators: the fee of their Fockis domain.
 *
 *   GET  /organizations/:organizationId/identity/domain-billing
 *   POST /organizations/:organizationId/identity/domain-billing/checkout  { kind: renew|members, memberDomains? }
 *   POST /organizations/:organizationId/identity/domain-billing/claim     { paymentIntentId }
 */
@Controller("organizations/:organizationId/identity/domain-billing")
@UseGuards(AuthGuard("jwt"))
export class OrganizationDomainBillingController {
  constructor(
    private readonly billing: OrganizationDomainBillingService,
    private readonly pricing: DomainPricingService,
    private readonly common: OrganizationIdentityCommonService,
  ) {}

  @Get()
  async info(@Param("organizationId") organizationId: string, @Req() req: Req) {
    await this.common.requireAdministrator(organizationId, userIdOf(req));
    const org = await this.common.getOrganization(organizationId);
    await this.billing.claimPending(org._id);
    return { billing: await this.billing.info(org._id), pricing: await this.pricing.publicView() };
  }

  @Post("checkout")
  checkout(@Param("organizationId") organizationId: string, @Req() req: Req, @Body() body: DomainCheckoutBody) {
    return this.billing.checkout(organizationId, userIdOf(req), body);
  }

  @Post("claim")
  claim(@Param("organizationId") organizationId: string, @Req() req: Req, @Body() body: DomainClaimBody) {
    return this.billing.claim(organizationId, userIdOf(req), body.paymentIntentId);
  }
}

/**
 * Fockis admins: one price list for every Fockis domain, and each
 * organization's domain fee. domains.view to look, domains.manage to change.
 *
 *   GET  /admin/domain-billing/pricing
 *   PUT  /admin/domain-billing/pricing
 *   GET  /admin/domain-billing/organizations?search=&state=&page=
 *   GET  /admin/domain-billing/organizations/:organizationId
 *   POST /admin/domain-billing/organizations/:organizationId/action
 */
@Controller("admin/domain-billing")
@UseGuards(RbacGuard)
export class DomainBillingAdminController {
  constructor(
    private readonly billing: OrganizationDomainBillingService,
    private readonly pricing: DomainPricingService,
  ) {}

  @Get("pricing")
  @Permissions(Permission.DOMAINS_VIEW)
  getPricing() {
    return this.pricing.view();
  }

  @Put("pricing")
  @Permissions(Permission.DOMAINS_MANAGE)
  savePricing(@Req() req: Req, @Body() body: DomainPricingBody) {
    return this.pricing.save(body, adminNameOf(req));
  }

  @Get("organizations")
  @Permissions(Permission.DOMAINS_VIEW)
  list(@Query("search") search?: string, @Query("state") state?: string, @Query("page") page?: string) {
    return this.billing.adminList({ search, state, page: Number(page) || 1 });
  }

  @Get("organizations/:organizationId")
  @Permissions(Permission.DOMAINS_VIEW)
  detail(@Param("organizationId") organizationId: string) {
    return this.billing.adminDetail(organizationId);
  }

  @Post("organizations/:organizationId/action")
  @Permissions(Permission.DOMAINS_MANAGE)
  action(@Req() req: Req, @Param("organizationId") organizationId: string, @Body() body: OrgBillingActionBody) {
    return this.billing.adminAction(organizationId, body, adminNameOf(req));
  }
}
