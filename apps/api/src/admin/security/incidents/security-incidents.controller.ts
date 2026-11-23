import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { Permissions } from "../../rbac/permissions.decorator";
import { Permission } from "../../rbac/permissions.enum";
import { actorCan } from "../platform-security/platform-security-policy.service";
import { PlatformSecurityPolicyService } from "../platform-security/platform-security-policy.service";
import { actorFromRequest } from "../platform-security/security-admin.controller";
import { AccountSecurityService } from "../platform-security/account-security.service";
import { SecurityEventsService } from "../platform-security/security-events.service";
import { SecurityNotificationsService } from "../platform-security/security-notifications.service";
import { SecurityIncidentsService } from "./security-incidents.service";
import { AuthRestrictionService, serializeRestriction } from "./auth-restriction.service";
import { RecoveryCaseService, serializeRecoveryCase } from "./recovery-case.service";
import {
  IncidentListQueryDto,
  IncidentNoteDto,
  RecoveryListQueryDto,
  ResolveIncidentDto,
  RestrictionListQueryDto,
  ReviewRecoveryDto,
  ReviewRestrictionDto,
} from "./security-incidents.dto";

// ============================================================================
// SECURITY INCIDENTS, RESTRICTIONS AND RECOVERY — ADMIN API
//
// Viewing requires security.view. Acknowledging/resolving incidents requires
// security.manage. Lifting restrictions and deciding recovery cases requires
// security.account_recovery, is refused on the reviewer's own account, and
// asks for reauthentication when the platform policy requires it.
// ============================================================================

function requestContext(req: any) {
  const forwarded = req?.headers?.["x-forwarded-for"];

  return {
    ip: (typeof forwarded === "string" && forwarded.split(",")[0]?.trim()) || req?.ip || null,
    userAgent: typeof req?.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

@Controller("admin/security")
@Permissions(Permission.SECURITY_VIEW)
export class SecurityIncidentsController {
  constructor(
    private readonly incidents: SecurityIncidentsService,
    private readonly restrictions: AuthRestrictionService,
    private readonly recovery: RecoveryCaseService,
    private readonly accounts: AccountSecurityService,
    private readonly policy: PlatformSecurityPolicyService,
    private readonly events: SecurityEventsService,
    private readonly userNotifications: SecurityNotificationsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private actor(req: any, permission: string) {
    const actor = actorFromRequest(req);

    if (!actorCan(actor, permission)) {
      throw new ForbiddenException(`This action requires the ${permission} permission.`);
    }

    return { id: actor.id ?? "", name: actor.name, isSuperAdmin: actor.isSuperAdmin };
  }

  /** Recovery decisions: never on yourself; super admins only by super admins. */
  private async guardTarget(req: any, actor: { id: string; isSuperAdmin: boolean }, userId: string) {
    if (actor.id === userId) {
      throw new ForbiddenException("You cannot review a restriction or recovery case for your own account.");
    }

    const target = await this.connection
      .collection("users")
      .findOne({ _id: new Types.ObjectId(userId) }, { projection: { role: 1, isSuperAdmin: 1, username: 1 } });

    if (!target) throw new NotFoundException("Account not found.");

    if ((target.isSuperAdmin === true || String(target.role ?? "").toLowerCase() === "super_admin") && !actor.isSuperAdmin) {
      throw new ForbiddenException("Only a super administrator can act on this account.");
    }

    const platform = await this.policy.getPlatform();

    this.accounts.assertReauthenticated(req, actor.id, Boolean(platform.accounts.requireAdminReauthentication));

    return target;
  }

  // ==========================================================================
  // INCIDENTS
  // ==========================================================================

  @Get("incidents")
  listIncidents(@Query() query: IncidentListQueryDto) {
    return this.incidents.list(query);
  }

  @Get("incidents/:id")
  getIncident(@Param("id") id: string) {
    return this.incidents.get(id);
  }

  @Patch("incidents/:id/acknowledge")
  @Permissions(Permission.SECURITY_VIEW, Permission.SECURITY_MANAGE)
  async acknowledge(@Param("id") id: string, @Body() body: IncidentNoteDto, @Req() req: any) {
    const actor = this.actor(req, "security.manage");
    const incident = await this.incidents.acknowledge(id, actor, body?.note ?? "");

    await this.events.record({
      action: "security.incident.acknowledged",
      outcome: "success",
      severity: "info",
      actorId: actor.id,
      actorName: actor.name,
      targetId: id,
      targetType: "security_incident",
      ...requestContext(req),
      metadata: { incident: incident.number },
    });

    return incident;
  }

  @Patch("incidents/:id/resolve")
  @Permissions(Permission.SECURITY_VIEW, Permission.SECURITY_MANAGE)
  async resolve(@Param("id") id: string, @Body() body: ResolveIncidentDto, @Req() req: any) {
    const actor = this.actor(req, "security.manage");
    const current = await this.incidents.getDoc(id);

    if (body.liftRestriction && current.subjectUserId) {
      if (!actorCan(actorFromRequest(req), "security.account_recovery")) {
        throw new ForbiddenException("Lifting a verification requirement requires security.account_recovery.");
      }
      await this.guardTarget(req, actor, String(current.subjectUserId));
    }

    const result = await this.incidents.resolve(id, actor, body.note, Boolean(body.liftRestriction));

    await this.events.record({
      action: "security.incident.resolved",
      outcome: "success",
      severity: "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetId: id,
      targetType: "security_incident",
      ...requestContext(req),
      metadata: { incident: result.incident.number, restrictionLifted: result.restrictionLifted },
    });

    return result;
  }

  // ==========================================================================
  // RESTRICTIONS
  // ==========================================================================

  @Get("restrictions")
  async listRestrictions(@Query() query: RestrictionListQueryDto) {
    const result = await this.restrictions.list(query);
    const names = await this.incidents.usernames(result.rows.map((r: any) => String(r.userId)));

    return {
      items: result.rows.map((r: any) => ({ ...serializeRestriction(r), username: names.get(String(r.userId)) ?? null })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pages: result.pages,
    };
  }

  @Get("restrictions/:id")
  async getRestriction(@Param("id") id: string) {
    const doc = await this.restrictions.findById(id);

    if (!doc) throw new NotFoundException("Restriction not found.");

    const names = await this.incidents.usernames([String(doc.userId)]);

    return { ...serializeRestriction(doc.toObject()), username: names.get(String(doc.userId)) ?? null };
  }

  @Post("restrictions/:id/review")
  @Permissions(Permission.SECURITY_VIEW, Permission.SECURITY_ACCOUNT_RECOVERY)
  async reviewRestriction(@Param("id") id: string, @Body() body: ReviewRestrictionDto, @Req() req: any) {
    const actor = this.actor(req, "security.account_recovery");

    if (!body.note?.trim()) throw new BadRequestException("Add a review note.");

    const doc = await this.restrictions.findById(id);

    if (!doc) throw new NotFoundException("Restriction not found.");
    if (!doc.active) throw new ConflictException("This restriction is no longer active.");

    await this.guardTarget(req, actor, String(doc.userId));

    const updated =
      body.action === "lift"
        ? await this.restrictions.lift(id, actor.id, body.note)
        : await this.restrictions.keep(id, body.note, Number(body.extendHours ?? 0));

    if (!updated) throw new ConflictException("The restriction was changed by someone else. Reload and try again.");

    await this.incidents.appendTimeline(doc.incidentId ? String(doc.incidentId) : null, {
      action: body.action === "lift" ? "restriction_lifted" : "restriction_kept",
      actorId: actor.id,
      actorName: actor.name,
      note: body.note,
    });

    await this.events.record({
      action: body.action === "lift" ? "security.restriction.lifted" : "security.restriction.kept",
      outcome: "success",
      severity: "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetId: String(doc.userId),
      targetType: "user",
      ...requestContext(req),
      metadata: { restriction: id, extendHours: Number(body.extendHours ?? 0) },
    });

    return serializeRestriction(updated);
  }

  // ==========================================================================
  // RECOVERY CASES
  // ==========================================================================

  @Get("recovery")
  @Permissions(Permission.SECURITY_VIEW, Permission.SECURITY_ACCOUNT_RECOVERY)
  async listRecovery(@Query() query: RecoveryListQueryDto) {
    const result = await this.recovery.list(query);
    const names = await this.incidents.usernames(result.rows.map((r: any) => String(r.userId)));

    return {
      items: result.rows.map((r: any) => serializeRecoveryCase(r, { username: names.get(String(r.userId)) })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      pages: result.pages,
    };
  }

  @Get("recovery/:id")
  @Permissions(Permission.SECURITY_VIEW, Permission.SECURITY_ACCOUNT_RECOVERY)
  async getRecovery(@Param("id") id: string) {
    const doc = await this.recovery.get(id);
    const user = await this.connection
      .collection("users")
      .findOne(
        { _id: doc.userId },
        { projection: { username: 1, mfaEnabled: 1, lockedUntil: 1, isActive: 1, role: 1 } },
      );
    const restriction = await this.restrictions.activeFor(String(doc.userId));

    return {
      ...serializeRecoveryCase(doc, user),
      account: user
        ? {
            id: String(user._id),
            username: user.username ?? "",
            role: user.role ?? "user",
            mfaEnabled: Boolean(user.mfaEnabled),
            isActive: user.isActive !== false,
            lockedUntil:
              user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now() ? user.lockedUntil : null,
          }
        : null,
      activeRestriction: restriction ? serializeRestriction(restriction.toObject()) : null,
    };
  }

  @Post("recovery/:id/review")
  @Permissions(Permission.SECURITY_VIEW, Permission.SECURITY_ACCOUNT_RECOVERY)
  async reviewRecovery(@Param("id") id: string, @Body() body: ReviewRecoveryDto, @Req() req: any) {
    const actor = this.actor(req, "security.account_recovery");
    const doc = await this.recovery.get(id);
    const userId = String(doc.userId);

    if (body.action !== "start_review") await this.guardTarget(req, actor, userId);

    const updated = await this.recovery.transition(id, body.action, actor, body.note ?? "");
    const effects: string[] = [];

    if (body.action === "approve") {
      const restriction = await this.restrictions.activeFor(userId);

      if (restriction && (await this.restrictions.lift(String(restriction._id), actor.id, body.note ?? ""))) {
        effects.push("restriction_lifted");
        await this.incidents.appendTimeline(restriction.incidentId ? String(restriction.incidentId) : null, {
          action: "restriction_lifted",
          actorId: actor.id,
          actorName: actor.name,
          note: `Recovery case ${doc.number} approved.`,
        });
      }

      await this.connection.collection("users").updateOne(
        { _id: new Types.ObjectId(userId) },
        { $set: { lockedUntil: null, failedLoginAttempts: 0, lastFailedLoginAt: null, lockoutCount: 0 } },
      );
      effects.push("unlocked");

      if (body.revokeSessions) {
        await this.accounts.revokeSessions(userId, {
          reason: "recovery_case_approved",
          actorId: actor.id,
          actorName: actor.name,
          context: requestContext(req),
        });
        effects.push("sessions_revoked");
      }

      if (body.requirePasswordChange) {
        await this.connection
          .collection("users")
          .updateOne({ _id: new Types.ObjectId(userId) }, { $set: { mustChangePassword: true } });
        effects.push("password_change_required");
      }

      await this.userNotifications.notifyUser(
        userId,
        "Your recovery request was approved",
        `Recovery case ${doc.number} was approved. You can sign in again.${body.requirePasswordChange ? " You'll be asked to choose a new password." : ""}`,
      );
    } else if (body.action === "reject") {
      await this.userNotifications.notifyUser(
        userId,
        "Your recovery request was reviewed",
        `Recovery case ${doc.number} could not be approved. You can still sign in with your password and an available verification method, or contact Fockis support.`,
      );
    }

    await this.events.record({
      action: `security.recovery.${body.action}`,
      outcome: "success",
      severity: body.action === "approve" ? "high" : "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetId: userId,
      targetType: "user",
      ...requestContext(req),
      metadata: { case: doc.number, effects: effects.join(",") },
    });

    return { case: serializeRecoveryCase(updated), effects };
  }
}
