import { Body, Controller, Delete, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { PersonalDomainService } from "./personal-domain.service";

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

class ReserveBody {
  @IsString() @MaxLength(60) name!: string;
}
class ClaimBody {
  @IsString() @MaxLength(200) paymentIntentId!: string;
}
class PersonalActionBody {
  @IsIn(["exempt", "unexempt", "set_paid_until", "clear_paid", "release"]) action!: "exempt" | "unexempt" | "set_paid_until" | "clear_paid" | "release";
  @IsOptional() @IsDateString() until?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

/**
 * A person's own Fockis domain (john.fockis.com).
 *
 *   GET    /me/fockis-domain
 *   GET    /me/fockis-domain/check?name=john
 *   POST   /me/fockis-domain                { name }    reserve (7 days to pay)
 *   DELETE /me/fockis-domain                            give the name back
 *   POST   /me/fockis-domain/checkout                   price + reference for the existing checkout
 *   POST   /me/fockis-domain/claim          { paymentIntentId }
 */
@Controller("me/fockis-domain")
@UseGuards(AuthGuard("jwt"))
export class PersonalDomainController {
  constructor(private readonly service: PersonalDomainService) {}

  @Get()
  mine(@Req() req: Req) {
    return this.service.mine(userIdOf(req));
  }

  @Get("check")
  check(@Req() req: Req, @Query("name") name: string) {
    return this.service.availability(name, userIdOf(req));
  }

  @Post()
  reserve(@Req() req: Req, @Body() body: ReserveBody) {
    return this.service.reserve(userIdOf(req), body.name);
  }

  @Delete()
  release(@Req() req: Req) {
    return this.service.release(userIdOf(req));
  }

  @Post("checkout")
  checkout(@Req() req: Req) {
    return this.service.checkout(userIdOf(req));
  }

  @Post("claim")
  claim(@Req() req: Req, @Body() body: ClaimBody) {
    return this.service.claim(userIdOf(req), body.paymentIntentId);
  }
}

/** Public: the domain shown on a profile (only while it is active). GET /fockis-domains/user/:userId */
@Controller("fockis-domains")
export class PersonalDomainPublicController {
  constructor(private readonly service: PersonalDomainService) {}

  @Get("user/:userId")
  forProfile(@Param("userId") userId: string) {
    return this.service.forProfile(userId);
  }
}

/**
 * Fockis admins: personal domains. domains.view to look, domains.manage to change.
 *
 *   GET  /admin/domain-billing/personal?search=&state=&page=
 *   GET  /admin/domain-billing/personal/:id
 *   POST /admin/domain-billing/personal/:id/action
 */
@Controller("admin/domain-billing/personal")
@UseGuards(RbacGuard)
export class PersonalDomainAdminController {
  constructor(private readonly service: PersonalDomainService) {}

  @Get()
  @Permissions(Permission.DOMAINS_VIEW)
  list(@Query("search") search?: string, @Query("state") state?: string, @Query("page") page?: string) {
    return this.service.adminList({ search, state, page: Number(page) || 1 });
  }

  @Get(":id")
  @Permissions(Permission.DOMAINS_VIEW)
  detail(@Param("id") id: string) {
    return this.service.adminDetail(id);
  }

  @Post(":id/action")
  @Permissions(Permission.DOMAINS_MANAGE)
  action(@Req() req: Req, @Param("id") id: string, @Body() body: PersonalActionBody) {
    return this.service.adminAction(id, body, adminNameOf(req));
  }
}
