import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { PlatformSecurityPolicyService } from "./platform-security-policy.service";
import { SecurityEventsService } from "./security-events.service";

// ============================================================================
// SECURITY OVERVIEW
//
// Every number comes from MongoDB. When a query fails, the metric is returned
// as null and the Admin Center shows it as unavailable instead of a guess.
// ============================================================================

async function safe<T>(work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch {
    return null;
  }
}

@Injectable()
export class SecurityOverviewService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly policy: PlatformSecurityPolicyService,
    private readonly events: SecurityEventsService,
  ) {}

  async overview() {
    const now = Date.now();
    const day = new Date(now - 86_400_000);
    const week = new Date(now - 7 * 86_400_000);
    const users = this.connection.collection("users");
    const loginEvents = this.connection.collection("user_login_events");

    const platform = await this.policy.getPlatform();

    const adminFilter = {
      isActive: { $ne: false },
      $or: [
        { role: { $in: ["admin", "super_admin", "superadmin"] } },
        { isSuperAdmin: true },
      ],
    };

    const [
      activeAccounts,
      mfaAccounts,
      adminCount,
      adminsWithoutMfa,
      lockedAccounts,
      activeLast15,
      failed24h,
      failed7d,
      success24h,
      lockouts7d,
      suspicious7d,
      recentEvents,
      lockedList,
      orgPolicies,
      orgsRequiringMfa,
      managedIdentities,
      history,
    ] = await Promise.all([
      safe(() => users.countDocuments({ isActive: { $ne: false } })),
      safe(() => users.countDocuments({ isActive: { $ne: false }, mfaEnabled: true })),
      safe(() => users.countDocuments(adminFilter)),
      safe(() => users.countDocuments({ ...adminFilter, mfaEnabled: { $ne: true } })),
      safe(() => users.countDocuments({ lockedUntil: { $gt: new Date(now) } })),
      safe(() =>
        users.countDocuments({ lastActiveAt: { $gte: new Date(now - 15 * 60_000) } }),
      ),
      safe(() => loginEvents.countDocuments({ success: false, at: { $gte: day } })),
      safe(() => loginEvents.countDocuments({ success: false, at: { $gte: week } })),
      safe(() => loginEvents.countDocuments({ success: true, at: { $gte: day } })),
      safe(() => this.events.countSince("auth.login.locked", week)),
      safe(() =>
        this.events.countSince("auth.login.success", week, {
          "metadata.suspicious": true,
        }),
      ),
      safe(() => this.events.recent(10)),
      safe(() =>
        users
          .find(
            { lockedUntil: { $gt: new Date(now) } },
            {
              projection: {
                username: 1,
                lockedUntil: 1,
                lockoutCount: 1,
                failedLoginAttempts: 1,
              },
            },
          )
          .sort({ lockedUntil: -1 })
          .limit(5)
          .toArray(),
      ),
      safe(() =>
        this.connection.collection("organization_security_policies").countDocuments({}),
      ),
      safe(() =>
        this.connection
          .collection("organization_security_policies")
          .countDocuments({ requireTwoFactor: true, platformManagedAt: { $ne: null } }),
      ),
      safe(() =>
        this.connection
          .collection("organization_identities")
          .countDocuments({ status: { $ne: "disabled" } }),
      ),
      safe(() => this.policy.getHistory(undefined, 1, 5)),
    ]);

    // ------------------------------------------------------------------------
    // Alerts needing attention (derived only from the numbers above)
    // ------------------------------------------------------------------------

    const alerts: Array<{ level: "danger" | "warning" | "info"; title: string; detail: string; link?: string }> = [];

    if (
      platform.accounts.requireTwoFactorForAdministrators &&
      adminsWithoutMfa
    ) {
      alerts.push({
        level: "warning",
        title: `${adminsWithoutMfa} administrator account${adminsWithoutMfa === 1 ? "" : "s"} without two-factor`,
        detail: "They will be asked to enroll at their next sign-in.",
        link: "/admin/security/two-factor",
      });
    }

    if (!platform.accounts.requireTwoFactorForAdministrators) {
      alerts.push({
        level: "danger",
        title: "Two-factor is not required for administrators",
        detail: "Administrators can sign in with a password alone.",
        link: "/admin/security/two-factor",
      });
    }

    if (!platform.accounts.loginLockoutEnabled) {
      alerts.push({
        level: "danger",
        title: "Login lockout is off",
        detail: "Passwords can be guessed without limit.",
        link: "/admin/security/login-protection",
      });
    }

    if (lockedAccounts) {
      alerts.push({
        level: "info",
        title: `${lockedAccounts} account${lockedAccounts === 1 ? " is" : "s are"} locked right now`,
        detail: "Locks expire automatically; you can also unlock them below.",
      });
    }

    if (failed24h !== null && success24h !== null && failed24h > 50 && failed24h > success24h * 2) {
      alerts.push({
        level: "warning",
        title: "Failed sign-ins are unusually high",
        detail: `${failed24h} failed vs ${success24h} successful sign-ins in the last 24 hours.`,
        link: "/admin/security/audit?action=auth.login.failed",
      });
    }

    if (platform.fallback) {
      alerts.push({
        level: "danger",
        title: "Security policy could not be loaded",
        detail: "Secure defaults are in use until the database is reachable.",
      });
    }

    return {
      generatedAt: new Date(now).toISOString(),
      policy: {
        version: platform.version,
        updatedAt: platform.updatedAt,
        updatedByName: platform.updatedByName,
        fallback: platform.fallback,
        accounts: platform.accounts,
        managed: platform.managed,
        delegatedCount: platform.delegatedFields.length,
      },
      mfa: {
        activeAccounts,
        enrolledAccounts: mfaAccounts,
        administrators: adminCount,
        administratorsWithoutMfa: adminsWithoutMfa,
        requiredForAdministrators: Boolean(platform.accounts.requireTwoFactorForAdministrators),
        requiredForEveryone: Boolean(platform.accounts.requireTwoFactor),
      },
      authentication: {
        failedLast24h: failed24h,
        failedLast7d: failed7d,
        successfulLast24h: success24h,
        lockoutsLast7d: lockouts7d,
        suspiciousLast7d: suspicious7d,
      },
      accounts: {
        lockedNow: lockedAccounts,
        activeLast15Minutes: activeLast15,
        locked: (lockedList ?? []).map((user: any) => ({
          id: String(user._id),
          username: user.username ?? "",
          lockedUntil: user.lockedUntil ? new Date(user.lockedUntil).toISOString() : null,
          lockoutCount: Number(user.lockoutCount || 0),
        })),
      },
      organizations: {
        organizationsWithPolicy: orgPolicies,
        organizationsRequiringMfa: orgsRequiringMfa,
        managedIdentities,
      },
      recentEvents,
      recentPolicyChanges: history?.items ?? null,
      alerts,
    };
  }

  // ==========================================================================
  // LOCKED ACCOUNTS
  // ==========================================================================

  async lockedAccounts(page = 1, pageSize = 25) {
    const users = this.connection.collection("users");
    const filter = { lockedUntil: { $gt: new Date() } };
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(100, Math.max(5, Math.floor(pageSize)));

    const [items, total] = await Promise.all([
      users
        .find(filter, {
          projection: {
            username: 1,
            email: 1,
            role: 1,
            lockedUntil: 1,
            lockoutCount: 1,
            failedLoginAttempts: 1,
            lastFailedLoginAt: 1,
          },
        })
        .sort({ lockedUntil: -1 })
        .skip((safePage - 1) * safeSize)
        .limit(safeSize)
        .toArray(),
      users.countDocuments(filter),
    ]);

    return {
      items: items.map((user: any) => ({
        id: String(user._id),
        username: user.username ?? "",
        email: user.email ?? "",
        role: user.role ?? "user",
        lockedUntil: user.lockedUntil ? new Date(user.lockedUntil).toISOString() : null,
        lockoutCount: Number(user.lockoutCount || 0),
        failedLoginAttempts: Number(user.failedLoginAttempts || 0),
        lastFailedLoginAt: user.lastFailedLoginAt
          ? new Date(user.lastFailedLoginAt).toISOString()
          : null,
      })),
      total,
      page: safePage,
      pageSize: safeSize,
    };
  }

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  async organizations(search = "", page = 1, pageSize = 25) {
    const platform = await this.policy.getPlatform();
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(100, Math.max(5, Math.floor(pageSize)));

    const orgFilter: Record<string, any> = {};
    const term = String(search).trim().slice(0, 80);

    if (term) {
      orgFilter.name = {
        $regex: term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        $options: "i",
      };
    }

    // Organizations that use managed identities or have a security policy.
    const policyOrgIds = await this.connection
      .collection("organization_security_policies")
      .distinct("organizationId");

    const identityOrgIds = await this.connection
      .collection("organization_identities")
      .distinct("organizationId");

    const ids = Array.from(
      new Set([...policyOrgIds, ...identityOrgIds].filter(Boolean).map(String)),
    )
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const filter = { _id: { $in: ids }, ...orgFilter };

    const [orgs, total] = await Promise.all([
      this.connection
        .collection("church_organizations")
        .find(filter, { projection: { name: 1, createdByUserId: 1 } })
        .sort({ name: 1 })
        .skip((safePage - 1) * safeSize)
        .limit(safeSize)
        .toArray(),
      this.connection.collection("church_organizations").countDocuments(filter),
    ]);

    const items = await Promise.all(
      orgs.map(async (org: any) => {
        const orgId = String(org._id);
        const resolved = await this.policy.getOrganizationPolicy(orgId);
        const managedUsers = await this.connection
          .collection("organization_identities")
          .countDocuments({ organizationId: org._id, status: { $ne: "disabled" } });

        return {
          id: orgId,
          name: org.name ?? "Organization",
          managedUsers,
          customized: resolved.customized,
          overriddenFields: resolved.overriddenFields,
          requireTwoFactor: Boolean(resolved.values.requireTwoFactor),
          requireTwoFactorForAdministrators: Boolean(
            resolved.values.requireTwoFactorForAdministrators,
          ),
          minimumPasswordLength: Number(resolved.values.minimumPasswordLength),
          inactivityTimeoutMinutes: Number(resolved.values.inactivityTimeoutMinutes),
        };
      }),
    );

    return {
      items,
      total,
      page: safePage,
      pageSize: safeSize,
      platformVersion: platform.version,
    };
  }
}
