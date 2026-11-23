import {
  REASON,
  evaluateAccountRisk,
  evaluateSourceRisk,
  levelToPriority,
  thresholdsFromPolicy,
} from "./risk-evaluation";
import { failuresSince, isPrivilegedAccount, networkOf, summarizeEvents } from "./login-monitor.service";
import { availableMethods } from "./auth-restriction.service";
import { canSee, higherPriority, safeAdminLink } from "../../notifications/admin-notification.types";
import { effectivePermissions, qualifies } from "../../notifications/admin-recipients.service";
import { AdminNotificationsService } from "../../notifications/admin-notifications.service";
import { generateVerificationCode, hashVerificationCode, maskEmail } from "../../../auth/login-verification.util";
import { nextDisputeStatus } from "../../../fockis-shop/disputes/disputes.service";
import { POLICY_FIELD_MAP, defaultsFor } from "../platform-security/security-policy.definitions";

const DEFAULTS = thresholdsFromPolicy(defaultsFor("accounts"));

describe("monitoring policy defaults", () => {
  it("uses the requested defaults: 10 min window, 3 / 5 / 10", () => {
    expect(DEFAULTS).toMatchObject({ windowMinutes: 10, warning: 3, high: 5, critical: 10 });
  });

  it("defines every monitoring field as platform-only and not delegable", () => {
    for (const key of [
      "loginMonitoringEnabled",
      "loginMonitoringWindowMinutes",
      "loginWarningThreshold",
      "loginHighRiskThreshold",
      "loginCriticalThreshold",
      "stepUpVerificationOnHighRisk",
      "revokeSessionsOnCritical",
      "loginRestrictionDurationHours",
      "sourceAbuseThreshold",
    ]) {
      const field = POLICY_FIELD_MAP.get(key);
      expect(field).toBeDefined();
      expect(field?.section).toBe("login");
      expect(field?.profiles).toEqual(["accounts"]);
      expect(field?.delegable).toBe(false);
      expect(field?.enforcement).toBe("enforced");
    }
  });

  it("keeps thresholds increasing even if stored values are inconsistent", () => {
    const t = thresholdsFromPolicy({ loginWarningThreshold: 6, loginHighRiskThreshold: 4, loginCriticalThreshold: 2 });
    expect(t.warning).toBe(6);
    expect(t.high).toBeGreaterThan(t.warning);
    expect(t.critical).toBeGreaterThan(t.high);
  });
});

describe("account risk evaluation", () => {
  const base = { windowBlocked: 0, distinctSources: 1, privileged: false };

  it("stays quiet below the warning threshold", () => {
    expect(evaluateAccountRisk({ ...base, windowFailures: 2 }, DEFAULTS).level).toBe("none");
  });

  it("maps 3 / 5 / 10 failures to warning / high / critical with reason codes", () => {
    const warning = evaluateAccountRisk({ ...base, windowFailures: 3 }, DEFAULTS);
    const high = evaluateAccountRisk({ ...base, windowFailures: 5 }, DEFAULTS);
    const critical = evaluateAccountRisk({ ...base, windowFailures: 10 }, DEFAULTS);

    expect(warning.level).toBe("warning");
    expect(warning.reasonCodes).toContain(REASON.WARNING);
    expect(high.level).toBe("high");
    expect(high.reasonCodes).toContain(REASON.HIGH);
    expect(critical.level).toBe("critical");
    expect(critical.reasonCodes).toContain(REASON.CRITICAL);
    expect(critical.score).toBeGreaterThan(high.score);
  });

  it("raises administrator accounts one level", () => {
    const result = evaluateAccountRisk({ ...base, privileged: true, windowFailures: 3 }, DEFAULTS);
    expect(result.level).toBe("high");
    expect(result.reasonCodes).toContain(REASON.PRIVILEGED);

    const off = evaluateAccountRisk(
      { ...base, privileged: true, windowFailures: 3 },
      { ...DEFAULTS, privilegedEscalation: false },
    );
    expect(off.level).toBe("warning");
  });

  it("records blocked attempts, several networks and unknown addresses as reasons", () => {
    const result = evaluateAccountRisk(
      { windowFailures: 4, windowBlocked: 2, distinctSources: 3, privileged: false, unknownAccount: true },
      DEFAULTS,
    );
    expect(result.reasonCodes).toEqual(
      expect.arrayContaining([REASON.BLOCKED, REASON.MULTI_SOURCE, REASON.UNKNOWN_ACCOUNT]),
    );
  });

  it("maps levels to notification priorities", () => {
    expect(levelToPriority("warning")).toBe("medium");
    expect(levelToPriority("high")).toBe("high");
    expect(levelToPriority("critical")).toBe("critical");
  });
});

describe("source risk evaluation (monitoring only)", () => {
  it("ignores normal traffic from shared addresses", () => {
    expect(evaluateSourceRisk({ windowFailures: 24, distinctTargets: 20 }, DEFAULTS).level).toBe("none");
  });

  it("flags volume and many targeted accounts", () => {
    expect(evaluateSourceRisk({ windowFailures: 25, distinctTargets: 1 }, DEFAULTS).level).toBe("warning");
    const spray = evaluateSourceRisk({ windowFailures: 30, distinctTargets: 8 }, DEFAULTS);
    expect(spray.level).toBe("high");
    expect(spray.reasonCodes).toContain(REASON.SOURCE_MANY_ACCOUNTS);
    expect(evaluateSourceRisk({ windowFailures: 100, distinctTargets: 1 }, DEFAULTS).level).toBe("critical");
  });
});

describe("sliding window counters", () => {
  const now = Date.now();
  const at = (minutesAgo: number, extra: Partial<{ s: string | null; g: string | null; b: boolean }> = {}) => ({
    t: new Date(now - minutesAgo * 60_000),
    s: null,
    g: null,
    b: false,
    ...extra,
  });

  it("counts only events inside the window", () => {
    const events = [at(30), at(11), at(9), at(5, { b: true }), at(1, { s: "1.2.3" }), at(0, { s: "1.2.4" })];
    const signals = summarizeEvents(events, now - 10 * 60_000);

    expect(signals.windowFailures).toBe(4);
    expect(signals.windowBlocked).toBe(1);
    expect(signals.distinctSources).toBe(2);
  });

  it("counts failures after the owner verified", () => {
    const events = [at(8), at(6), at(2), at(1)];
    expect(failuresSince(events, now - 3 * 60_000)).toBe(2);
  });

  it("reduces addresses to a network prefix", () => {
    expect(networkOf("203.0.113.77")).toBe("203.0.113");
    expect(networkOf("::ffff:10.1.2.3")).toBe("10.1.2");
    expect(networkOf("2001:db8:1:2:3::9")).toBe("2001:db8:1:2");
    expect(networkOf("")).toBeNull();
  });

  it("detects administrator accounts", () => {
    expect(isPrivilegedAccount({ role: "user" })).toBe(false);
    expect(isPrivilegedAccount({ role: "Super Admin" })).toBe(true);
    expect(isPrivilegedAccount({ role: "user", adminRoleId: "x" })).toBe(true);
    expect(isPrivilegedAccount({ role: "user", permissions: ["support.view"] })).toBe(true);
  });
});

describe("verification methods", () => {
  const now = Date.now();
  const day = 86_400_000;

  it("always offers recovery so no account is locked out permanently", () => {
    expect(availableMethods({}, { emailCodesAllowed: false })).toEqual(["recovery"]);
  });

  it("offers authenticator and email when they can be trusted", () => {
    expect(
      availableMethods(
        { mfaEnabled: true, mfaSecret: "enc:v1:x", email: "a@b.co", mfaEnabledAt: new Date(now - 30 * day) },
        { emailCodesAllowed: true, now },
      ),
    ).toEqual(["totp", "email", "recovery"]);
  });

  it("does not trust a recently changed email address or a new authenticator", () => {
    const methods = availableMethods(
      {
        mfaEnabled: true,
        mfaSecret: "enc:v1:x",
        mfaEnabledAt: new Date(now - 2 * day),
        email: "a@b.co",
        emailChangedAt: new Date(now - day),
      },
      { emailCodesAllowed: true, now },
    );
    expect(methods).toEqual(["recovery"]);
  });

  it("respects the email-code policy switch", () => {
    expect(availableMethods({ email: "a@b.co" }, { emailCodesAllowed: false })).toEqual(["recovery"]);
  });
});

describe("verification codes", () => {
  const key = Buffer.alloc(32, 7);

  it("generates 6-digit codes", () => {
    for (let i = 0; i < 50; i += 1) expect(generateVerificationCode()).toMatch(/^\d{6}$/);
  });

  it("stores a keyed hash bound to the restriction (never the code)", () => {
    const hash = hashVerificationCode(key, "r1", "123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("123456");
    expect(hashVerificationCode(key, "r2", "123456")).not.toBe(hash);
    expect(hashVerificationCode(Buffer.alloc(32, 8), "r1", "123456")).not.toBe(hash);
  });

  it("masks email addresses", () => {
    expect(maskEmail("jordan@example.com")).toBe("jo****@example.com");
    expect(maskEmail("a@x.io")).toBe("a*@x.io");
  });
});

describe("admin notification safety", () => {
  it("only allows internal /admin links", () => {
    expect(safeAdminLink("/admin/security/incidents/abc")).toBe("/admin/security/incidents/abc");
    expect(safeAdminLink("https://evil.example/admin")).toBe("/admin/notifications");
    expect(safeAdminLink("//evil.example")).toBe("/admin/notifications");
    expect(safeAdminLink("/admin/../settings")).toBe("/admin/notifications");
    expect(safeAdminLink("javascript:alert(1)")).toBe("/admin/notifications");
  });

  it("never shows a notification without a matching permission", () => {
    expect(canSee(["security.view"], ["security.view"], false)).toBe(true);
    expect(canSee(["security.view"], ["support.view"], false)).toBe(false);
    expect(canSee([], ["security.view"], false)).toBe(false);
    expect(canSee(["security.view"], [], true)).toBe(true);
  });

  it("only raises priority", () => {
    expect(higherPriority("medium", "critical")).toBe("critical");
    expect(higherPriority("high", "low")).toBe("high");
  });

  it("resolves recipients from roles, custom roles and direct permissions", () => {
    expect(qualifies(["security.view"], effectivePermissions({ role: "admin" }, []))).toBe(true);
    expect(qualifies(["security.view"], effectivePermissions({ role: "user" }, []))).toBe(false);
    expect(qualifies(["support.view"], effectivePermissions({ role: "user" }, ["SUPPORT.VIEW"]))).toBe(true);
    expect(qualifies(["legal.deletions.view"], effectivePermissions({ role: "user", permissions: ["legal.deletions.view"] }, []))).toBe(true);
    expect(qualifies(["anything"], effectivePermissions({ role: "user", isSuperAdmin: true }, []))).toBe(true);
    expect(qualifies([], effectivePermissions({ role: "admin" }, []))).toBe(false);
  });
});

describe("admin notification delivery", () => {
  function setup(options: { recipients: string[]; muted?: string[]; existing?: any }) {
    const upserts: any[] = [];
    const fixes: any[] = [];
    const delivered: any[] = [];

    const notifications: any = {
      collection: {
        findOneAndUpdate: jest.fn(async (filter: any, update: any) => {
          upserts.push({ filter, update });
          return options.existing ?? null;
        }),
        updateOne: jest.fn(async (_filter: any, update: any) => {
          fixes.push(update);
          return { modifiedCount: 1 };
        }),
      },
    };

    const preferences: any = {
      find: () => ({
        select: () => ({
          lean: () => ({ exec: async () => (options.muted ?? []).map((userId) => ({ userId })) }),
        }),
      }),
    };

    const recipients: any = { resolve: jest.fn(async () => options.recipients) };
    const gateway: any = { deliver: jest.fn((id: string, signal: any) => delivered.push({ id, signal })) };

    const service = new AdminNotificationsService(notifications, preferences, recipients, gateway);

    return { service, upserts, fixes, delivered, recipients };
  }

  const event = {
    type: "security.login_pattern",
    category: "security" as const,
    priority: "medium" as const,
    title: "Unusual login pattern",
    message: "3 failed sign-in attempts",
    groupKey: "security_incident:abc",
    entityType: "security_incident",
    entityId: "abc",
    link: "/admin/security/incidents/abc",
    requiredPermissions: ["security.view"],
    actionRequired: true,
  };

  const A = "64b7f0f0f0f0f0f0f0f0f0a1";
  const B = "64b7f0f0f0f0f0f0f0f0f0b2";

  it("refuses notifications without required permissions (no broadcast)", async () => {
    const { service } = setup({ recipients: [A] });
    await expect(service.raise({ ...event, requiredPermissions: [] })).rejects.toThrow();
  });

  it("stores one grouped record per recipient and pushes only to that recipient", async () => {
    const { service, upserts, delivered, recipients } = setup({ recipients: [A, B] });
    const count = await service.raise(event);

    expect(count).toBe(2);
    expect(recipients.resolve).toHaveBeenCalledWith(["security.view"], []);
    expect(upserts.map((u) => u.filter.groupKey)).toEqual(["security_incident:abc", "security_incident:abc"]);
    expect(upserts[0].update.$inc).toEqual({ occurrences: 1 });
    expect(upserts[0].update.$max).toEqual({ priorityRank: 2 });
    expect(delivered.map((d) => d.id)).toEqual([A, B]);
    expect(delivered[0].signal.alert).toBe(true);
  });

  it("skips muted categories, but never critical notifications", async () => {
    const muted = setup({ recipients: [A, B], muted: [A] });
    expect(await muted.service.raise(event)).toBe(1);

    const critical = setup({ recipients: [A, B], muted: [A] });
    expect(await critical.service.raise({ ...event, priority: "critical" })).toBe(2);
  });

  it("escalates an existing group instead of duplicating it", async () => {
    const { service, fixes, delivered } = setup({
      recipients: [A],
      existing: { priorityRank: 2, lastOccurredAt: new Date(), actionState: "open" },
    });

    await service.raise({ ...event, priority: "high" });

    expect(fixes[0].$set).toMatchObject({ priority: "high", read: false });
    expect(delivered[0].signal.alert).toBe(true);
  });

  it("does not re-alert a repeat at the same level inside the cooldown", async () => {
    const { service, fixes, delivered } = setup({
      recipients: [A],
      existing: { priorityRank: 2, lastOccurredAt: new Date(), actionState: "open" },
    });

    await service.raise(event);

    expect(fixes).toHaveLength(0);
    expect(delivered[0].signal.alert).toBe(false);
  });

  it("replaces unsafe links before storing", async () => {
    const { service, upserts } = setup({ recipients: [A] });
    await service.raise({ ...event, link: "https://evil.example" });
    expect(upserts[0].update.$set.link).toBe("/admin/notifications");
  });
});

describe("dispute transitions", () => {
  it("never reopens decided disputes", () => {
    expect(nextDisputeStatus("open", "resolve_buyer")).toBe("resolved_buyer");
    expect(nextDisputeStatus("resolved_seller", "resolve_buyer")).toBeNull();
  });
});
