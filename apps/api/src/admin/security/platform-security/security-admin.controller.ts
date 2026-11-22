import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
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

import {
  PlatformSecurityPolicyService,
  PolicyActor,
  actorCan,
} from "./platform-security-policy.service";
import { SecurityEventsService } from "./security-events.service";
import { SecurityOverviewService } from "./security-overview.service";
import { AccountSecurityService } from "./account-security.service";
import { SecurityNotificationsService } from "./security-notifications.service";
import {
  SecurityAdminActionDto,
  UpdatePlatformSecurityPolicyDto,
} from "./security-admin.dto";

// ============================================================================
// PLATFORM SECURITY ADMINISTRATION
//
// Every route requires security.view (checked by the global RbacGuard);
// editing and account recovery additionally check the specific permission
// below. Organization administrators have no platform permissions, so they
// cannot reach these routes.
// ============================================================================

export function actorFromRequest(req: any): PolicyActor {
  const user = req?.user ?? {};
  const role = String(user.role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return {
    id: user.id ? String(user.id) : user.userId ? String(user.userId) : null,
    name: String(user.username || user.email || "Administrator"),
    isSuperAdmin: user.isSuperAdmin === true || role === "super_admin",
    permissions: Array.isArray(user.permissions)
      ? user.permissions.map((p: unknown) => String(p).toLowerCase())
      : [],
  };
}

function requestContext(req: any) {
  const forwarded = req?.headers?.["x-forwarded-for"];
  const ip =
    (typeof forwarded === "string" && forwarded.split(",")[0]?.trim()) ||
    req?.ip ||
    null;

  return {
    ip,
    userAgent:
      typeof req?.headers?.["user-agent"] === "string" ? req.headers["user-agent"] : null,
  };
}

const SECURITY_AUDIT_PERMISSIONS = [
  "security.audit.view",
  "audit.view",
  "audit:view",
];

function canViewAudit(actor: PolicyActor): boolean {
  return (
    actor.isSuperAdmin ||
    SECURITY_AUDIT_PERMISSIONS.some((permission) => actor.permissions.includes(permission))
  );
}

@Controller("admin/security")
@Permissions(Permission.SECURITY_VIEW)
export class SecurityAdminController {
  constructor(
    private readonly policy: PlatformSecurityPolicyService,
    private readonly events: SecurityEventsService,
    private readonly overviewService: SecurityOverviewService,
    private readonly accounts: AccountSecurityService,
    private readonly notifications: SecurityNotificationsService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // ==========================================================================
  // OVERVIEW
  // ==========================================================================

  @Get("overview")
  overview() {
    return this.overviewService.overview();
  }

  // ==========================================================================
  // POLICY
  // ==========================================================================

  @Get("policy")
  async getPolicy(@Req() req: any) {
    const view = await this.policy.getAdminView();
    const actor = actorFromRequest(req);

    return {
      ...view,
      permissions: {
        password: actorCan(actor, "security.policies.manage"),
        login: actorCan(actor, "security.policies.manage"),
        alerts: actorCan(actor, "security.policies.manage"),
        protection: actorCan(actor, "security.policies.manage"),
        auditing: actorCan(actor, "security.policies.manage"),
        sessions: actorCan(actor, "security.sessions.manage"),
        twoFactor: actorCan(actor, "security.mfa.manage"),
        organizationDefaults: actorCan(actor, "security.org_defaults.manage"),
        accountRecovery: actorCan(actor, "security.account_recovery"),
        auditView: canViewAudit(actor),
      },
      reauthRequired: Boolean(view.policy.accounts.requireAdminReauthentication),
    };
  }

  @Get("policy/history")
  history(
    @Query("scope") scope?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.policy.getHistory(
      scope === "platform" || scope === "organization" ? scope : undefined,
      Number(page) || 1,
      Number(pageSize) || 20,
    );
  }

  /** Validate a change and estimate its impact without saving it. */
  @Post("policy/preview")
  async preview(@Body() body: UpdatePlatformSecurityPolicyDto, @Req() req: any) {
    const plan = await this.policy.planUpdate(body, actorFromRequest(req));
    const impact = plan.risks.length
      ? await this.policy.estimateImpact(plan.risks, plan.next)
      : [];

    return {
      currentVersion: plan.current.version,
      changes: plan.changes,
      risks: plan.risks,
      impact,
      errors: plan.errors,
      forbidden: plan.forbidden,
    };
  }

  @Patch("policy")
  async update(@Body() body: UpdatePlatformSecurityPolicyDto, @Req() req: any) {
    const actor = actorFromRequest(req);
    const platform = await this.policy.getPlatform();
    const reauthenticated = this.accounts.isReauthenticated(req, actor.id ?? "");

    if (platform.accounts.requireAdminReauthentication && !reauthenticated) {
      throw new ForbiddenException({
        statusCode: 403,
        code: "REAUTH_REQUIRED",
        message: "Confirm your password to change security policies.",
      });
    }

    return this.policy.applyUpdate(body, actor, {
      reauthenticated,
      ...requestContext(req),
    });
  }

  // ==========================================================================
  // SECURITY EVENTS
  // ==========================================================================

  @Get("events")
  listEvents(@Query() query: Record<string, string>, @Req() req: any) {
    if (!canViewAudit(actorFromRequest(req))) {
      throw new ForbiddenException("You do not have permission to view security events.");
    }

    return this.events.query(query, query.module === "all" ? undefined : "security");
  }

  @Get("events/export")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="fockis-security-events.csv"')
  async exportEvents(@Query() query: Record<string, string>, @Req() req: any) {
    const actor = actorFromRequest(req);

    if (!canViewAudit(actor)) {
      throw new ForbiddenException("You do not have permission to export security events.");
    }

    await this.events.record({
      action: "security.audit.exported",
      outcome: "success",
      severity: "low",
      actorId: actor.id,
      actorName: actor.name,
      targetType: "audit",
      metadata: { filters: query },
      ...requestContext(req),
    });

    return this.events.exportCsv(query, query.module === "all" ? undefined : "security");
  }

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  @Get("organizations")
  organizations(
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    return this.overviewService.organizations(
      search ?? "",
      Number(page) || 1,
      Number(pageSize) || 25,
    );
  }

  @Get("organizations/:organizationId")
  async organization(@Param("organizationId") organizationId: string) {
    if (!Types.ObjectId.isValid(organizationId)) {
      throw new BadRequestException("Invalid organization ID.");
    }

    const [resolved, platform] = await Promise.all([
      this.policy.getOrganizationPolicy(organizationId),
      this.policy.getPlatform(),
    ]);

    return { organization: resolved, platformBaseline: platform.managed };
  }

  // ==========================================================================
  // ACCOUNT RECOVERY
  // ==========================================================================

  @Get("accounts/locked")
  locked(@Query("page") page?: string, @Query("pageSize") pageSize?: string) {
    return this.overviewService.lockedAccounts(Number(page) || 1, Number(pageSize) || 25);
  }

  /**
   * Find an account for a recovery action by exact email, username or ID.
   * Exact matching only, so this cannot be used to browse accounts.
   */
  @Get("accounts/lookup")
  async lookup(@Query("q") q?: string) {
    const term = String(q ?? "").trim().slice(0, 254);

    if (term.length < 3) return { items: [] };

    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exact = { $regex: `^${escaped}$`, $options: "i" };

    const or: Record<string, unknown>[] = [{ email: exact }, { username: exact }];

    if (Types.ObjectId.isValid(term)) or.push({ _id: new Types.ObjectId(term) });

    const users = await this.connection
      .collection("users")
      .find(
        { $or: or },
        {
          projection: {
            username: 1,
            email: 1,
            role: 1,
            mfaEnabled: 1,
            lockedUntil: 1,
          },
        },
      )
      .limit(5)
      .toArray();

    return {
      items: users.map((user: any) => ({
        id: String(user._id),
        username: user.username ?? "",
        email: user.email ?? "",
        role: user.role ?? "user",
        mfaEnabled: Boolean(user.mfaEnabled),
        lockedUntil:
          user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()
            ? new Date(user.lockedUntil).toISOString()
            : null,
      })),
    };
  }

  private async prepareAccountAction(
    req: any,
    userId: string,
    permission: string,
    options: { allowSelf?: boolean; alwaysReauth?: boolean } = {},
  ) {
    const actor = actorFromRequest(req);

    if (!actorCan(actor, permission)) {
      throw new ForbiddenException(`This action requires the ${permission} permission.`);
    }

    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException("Invalid user ID.");
    }

    if (!options.allowSelf && actor.id === userId) {
      throw new ForbiddenException("You cannot perform this recovery action on your own account.");
    }

    const target = await this.connection
      .collection("users")
      .findOne(
        { _id: new Types.ObjectId(userId) },
        { projection: { role: 1, isSuperAdmin: 1, username: 1 } },
      );

    if (!target) throw new NotFoundException("User not found.");

    const targetRole = String(target.role ?? "").toLowerCase();

    if (
      (target.isSuperAdmin === true || targetRole === "super_admin") &&
      !actor.isSuperAdmin
    ) {
      throw new ForbiddenException("Only a super administrator can act on this account.");
    }

    const platform = await this.policy.getPlatform();

    this.accounts.assertReauthenticated(
      req,
      actor.id ?? "",
      Boolean(options.alwaysReauth || platform.accounts.requireAdminReauthentication),
    );

    return { actor, target };
  }

  @Post("accounts/:userId/unlock")
  async unlock(
    @Param("userId") userId: string,
    @Body() body: SecurityAdminActionDto,
    @Req() req: any,
  ) {
    const { actor } = await this.prepareAccountAction(req, userId, "security.account_recovery", {
      allowSelf: false,
    });

    await this.connection.collection("users").updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          lockedUntil: null,
          failedLoginAttempts: 0,
          lastFailedLoginAt: null,
          lockoutCount: 0,
        },
      },
    );

    const notified = await this.notifications.notifyUser(
      userId,
      "Your account was unlocked",
      "An administrator unlocked your account. If you did not ask for this, contact Fockis support.",
    );

    await this.events.record({
      action: "admin.account.unlocked",
      outcome: "success",
      severity: "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetId: userId,
      targetType: "user",
      metadata: { reason: body.reason, userNotified: notified },
      ...requestContext(req),
    });

    return { success: true };
  }

  @Post("accounts/:userId/revoke-sessions")
  async revokeSessions(
    @Param("userId") userId: string,
    @Body() body: SecurityAdminActionDto,
    @Req() req: any,
  ) {
    const actor = actorFromRequest(req);
    const permission = actorCan(actor, "security.sessions.manage")
      ? "security.sessions.manage"
      : "security.account_recovery";

    await this.prepareAccountAction(req, userId, permission);

    await this.accounts.revokeSessions(userId, {
      reason: `admin: ${body.reason}`.slice(0, 500),
      actorId: actor.id,
      actorName: actor.name,
      context: requestContext(req),
    });

    const notified = await this.notifications.notifyUser(
      userId,
      "You were signed out",
      "An administrator signed you out of all sessions. Sign in again to continue.",
    );

    return { success: true, userNotified: notified };
  }

  /**
   * Account recovery for a user who lost their authenticator and recovery
   * codes. Two-factor is removed and every session is signed out; if policy
   * requires two-factor for the account, the user must enroll again at their
   * next sign-in, so the requirement is not bypassed.
   */
  @Post("accounts/:userId/reset-mfa")
  async resetMfa(
    @Param("userId") userId: string,
    @Body() body: SecurityAdminActionDto,
    @Req() req: any,
  ) {
    const { actor } = await this.prepareAccountAction(req, userId, "security.account_recovery", {
      alwaysReauth: true,
    });

    if (String(body.reason ?? "").trim().length < 10) {
      throw new BadRequestException("Describe why two-factor is being reset (at least 10 characters).");
    }

    await this.connection.collection("users").updateOne(
      { _id: new Types.ObjectId(userId) },
      {
        $set: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaRecoveryCodes: [],
          mfaVerifiedAt: null,
          mfaRecoveryCodesGeneratedAt: null,
        },
      },
    );

    await this.accounts.revokeSessions(userId, {
      reason: "admin_mfa_reset",
      actorId: actor.id,
      actorName: actor.name,
      context: requestContext(req),
    });

    const notified = await this.notifications.notifyUser(
      userId,
      "Two-factor was reset by an administrator",
      "An administrator removed two-factor from your account during account recovery. You may be asked to set it up again at your next sign-in.",
    );

    await this.events.record({
      action: "admin.account.mfa_reset",
      outcome: "success",
      severity: "high",
      actorId: actor.id,
      actorName: actor.name,
      targetId: userId,
      targetType: "user",
      metadata: { reason: body.reason, userNotified: notified },
      ...requestContext(req),
    });

    return { success: true, userNotified: notified };
  }

  @Post("accounts/:userId/require-password-change")
  async requirePasswordChange(
    @Param("userId") userId: string,
    @Body() body: SecurityAdminActionDto,
    @Req() req: any,
  ) {
    const { actor } = await this.prepareAccountAction(req, userId, "security.account_recovery");

    await this.connection
      .collection("users")
      .updateOne({ _id: new Types.ObjectId(userId) }, { $set: { mustChangePassword: true } });

    await this.events.record({
      action: "admin.account.password_change_required",
      outcome: "success",
      severity: "medium",
      actorId: actor.id,
      actorName: actor.name,
      targetId: userId,
      targetType: "user",
      metadata: { reason: body.reason },
      ...requestContext(req),
    });

    return { success: true };
  }
}

// ============================================================================
// ADMIN CENTER AUDIT LOGS
//
// The existing Audit Logs page calls GET /admin/audit; this endpoint did not
// exist before. It reads the same AuditLog collection used by every module.
// ============================================================================

@Controller("admin")
export class AdminAuditLogsController {
  constructor(private readonly events: SecurityEventsService) {}

  @Get("audit")
  list(@Query() query: Record<string, string>, @Req() req: any) {
    if (!canViewAudit(actorFromRequest(req))) {
      throw new ForbiddenException("You do not have permission to view audit logs.");
    }

    return this.events.query(query);
  }
}
