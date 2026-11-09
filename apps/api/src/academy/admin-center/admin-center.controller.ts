import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IsBoolean, IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from "class-validator";

import { Permissions } from "../../admin/rbac/permissions.decorator";
import { Permission } from "../../admin/rbac/permissions.enum";
import { RbacGuard } from "../../admin/rbac/rbac.guard";
import { AcademyAdminCenterService, type AdminActor } from "./admin-center.service";

class ReasonBody {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}
class SchoolActionBody extends ReasonBody {
  @IsIn(["approve", "reject", "block", "unblock"]) action!: "approve" | "reject" | "block" | "unblock";
}
class CreatorActionBody extends ReasonBody {
  @IsIn(["approve", "reject", "suspend", "unsuspend"]) action!: "approve" | "reject" | "suspend" | "unsuspend";
}
class SchoolBillingBody {
  @IsIn(["exempt", "unexempt", "set_paid_until", "clear_paid"]) action!: "exempt" | "unexempt" | "set_paid_until" | "clear_paid";
  @IsOptional() @IsDateString() until?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}
class EnrollmentBody {
  @IsBoolean() open!: boolean;
}

/** The signed-in Fockis administrator (main Fockis account, not an Academy login). */
function actorOf(req: { user?: Record<string, unknown> }): AdminActor {
  const u = req.user ?? {};
  const id = String(u.id ?? u.userId ?? u._id ?? u.sub ?? "");
  const name = String(u.name ?? ([u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email || "Fockis admin"));
  return { id, name };
}

/**
 * Academy, managed from the Fockis admin center.
 * The path is /admin/academy (not /academy) so the main Fockis login and the
 * admin permissions apply: academy.view to look, academy.manage to act.
 *
 *   GET  /admin/academy/overview
 *   GET  /admin/academy/classes?q=&kind=&status=&price=&school=&page=
 *   GET  /admin/academy/classes/:code
 *   POST /admin/academy/classes/:code/take-down   { reason }
 *   POST /admin/academy/classes/:code/restore
 *   POST /admin/academy/classes/:code/enrollment  { open }
 *   GET  /admin/academy/schools?status=
 *   GET  /admin/academy/schools/:id
 *   POST /admin/academy/schools/:id/status        { action, reason }
 *   POST /admin/academy/schools/:id/billing       { action: exempt|unexempt|set_paid_until|clear_paid, until?, amount?, note? }
 *   (domain prices: /admin/domain-billing/pricing — one list for every Fockis domain)
 *   GET  /admin/academy/certificates?q=&status=&page=
 *   POST /admin/academy/certificates/:id/revoke   { reason }
 *   POST /admin/academy/certificates/:id/restore
 *   GET  /admin/academy/creators?status=pending|approved|rejected|suspended&q=&page=
 *   GET  /admin/academy/creators/:id
 *   POST /admin/academy/creators/:id/status       { action: approve|reject|suspend|unsuspend, reason }
 *   GET  /admin/academy/accounts?q=&role=&status=&page=
 *   POST /admin/academy/accounts/:id/suspend      { reason }
 *   POST /admin/academy/accounts/:id/reactivate
 */
@Controller("admin/academy")
@UseGuards(RbacGuard)
export class AcademyAdminCenterController {
  constructor(private readonly service: AcademyAdminCenterService) {}

  @Get("overview")
  @Permissions(Permission.ACADEMY_VIEW)
  overview() {
    return this.service.overview();
  }

  /* classes */

  @Get("classes")
  @Permissions(Permission.ACADEMY_VIEW)
  classes(@Query() query: { q?: string; kind?: string; status?: string; school?: string; price?: string; page?: string }) {
    return this.service.listClasses(query);
  }

  @Get("classes/:code")
  @Permissions(Permission.ACADEMY_VIEW)
  classDetail(@Param("code") code: string) {
    return this.service.classDetail(code);
  }

  @Post("classes/:code/take-down")
  @Permissions(Permission.ACADEMY_MANAGE)
  takeDown(@Req() req: { user?: Record<string, unknown> }, @Param("code") code: string, @Body() body: ReasonBody) {
    return this.service.takeDown(code, body.reason, actorOf(req));
  }

  @Post("classes/:code/restore")
  @Permissions(Permission.ACADEMY_MANAGE)
  restore(@Req() req: { user?: Record<string, unknown> }, @Param("code") code: string) {
    return this.service.restore(code, actorOf(req));
  }

  @Post("classes/:code/enrollment")
  @Permissions(Permission.ACADEMY_MANAGE)
  enrollment(@Req() req: { user?: Record<string, unknown> }, @Param("code") code: string, @Body() body: EnrollmentBody) {
    return this.service.setEnrollment(code, body.open, actorOf(req));
  }

  /* creators (people and businesses who teach) */

  @Get("creators")
  @Permissions(Permission.ACADEMY_VIEW)
  creators(@Query() query: { q?: string; status?: string; page?: string }) {
    return this.service.listCreators(query);
  }

  @Get("creators/:id")
  @Permissions(Permission.ACADEMY_VIEW)
  creator(@Param("id") id: string) {
    return this.service.creatorDetail(id);
  }

  @Post("creators/:id/status")
  @Permissions(Permission.ACADEMY_MANAGE)
  creatorStatus(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string, @Body() body: CreatorActionBody) {
    return this.service.setCreatorStatus(id, body.action, body.reason, actorOf(req));
  }

  /* schools */

  @Get("schools")
  @Permissions(Permission.ACADEMY_VIEW)
  schools(@Query("status") status?: string) {
    return this.service.listSchools(status);
  }

  @Get("schools/:id")
  @Permissions(Permission.ACADEMY_VIEW)
  school(@Param("id") id: string) {
    return this.service.getSchool(id);
  }

  @Post("schools/:id/status")
  @Permissions(Permission.ACADEMY_MANAGE)
  schoolStatus(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string, @Body() body: SchoolActionBody) {
    return this.service.setSchoolStatus(id, body.action, body.reason, actorOf(req));
  }

  @Post("schools/:id/billing")
  @Permissions(Permission.ACADEMY_MANAGE)
  schoolBilling(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string, @Body() body: SchoolBillingBody) {
    return this.service.schoolBilling(id, body, actorOf(req));
  }

  /* certificates */

  @Get("certificates")
  @Permissions(Permission.ACADEMY_VIEW)
  certificates(@Query() query: { q?: string; status?: string; page?: string }) {
    return this.service.listCertificates(query);
  }

  @Post("certificates/:id/revoke")
  @Permissions(Permission.ACADEMY_MANAGE)
  revoke(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string, @Body() body: ReasonBody) {
    return this.service.setCertificateStatus(id, true, body.reason, actorOf(req));
  }

  @Post("certificates/:id/restore")
  @Permissions(Permission.ACADEMY_MANAGE)
  restoreCertificate(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string) {
    return this.service.setCertificateStatus(id, false, undefined, actorOf(req));
  }

  /* accounts */

  @Get("accounts")
  @Permissions(Permission.ACADEMY_VIEW)
  accounts(@Query() query: { q?: string; role?: string; status?: string; page?: string }) {
    return this.service.listAccounts(query);
  }

  @Post("accounts/:id/suspend")
  @Permissions(Permission.ACADEMY_MANAGE)
  suspend(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string, @Body() body: ReasonBody) {
    return this.service.setAccountActive(id, false, body.reason, actorOf(req));
  }

  @Post("accounts/:id/reactivate")
  @Permissions(Permission.ACADEMY_MANAGE)
  reactivate(@Req() req: { user?: Record<string, unknown> }, @Param("id") id: string) {
    return this.service.setAccountActive(id, true, undefined, actorOf(req));
  }
}
