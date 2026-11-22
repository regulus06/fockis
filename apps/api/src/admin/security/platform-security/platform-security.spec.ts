import * as bcrypt from "bcryptjs";

import {
  POLICY_FIELDS,
  POLICY_FIELD_MAP,
  defaultDelegatedFields,
  defaultsFor,
  isWeaker,
  stricterValue,
  validateFieldValue,
} from "./security-policy.definitions";
import {
  diffProfile,
  highRiskChanges,
  mergeStrictest,
  normalizeDelegation,
  normalizeProfile,
  organizationUpdateProblems,
  resolveOrganizationValues,
} from "./platform-security-policy.service";
import {
  isPasswordExpired,
  isPasswordReused,
  nextPasswordHistory,
  passwordPolicyProblems,
} from "./password-policy";
import {
  deviceFingerprint,
  lockoutDurationMs,
  networkPrefix,
} from "./account-security.service";
import {
  decryptMfaSecret,
  encryptMfaSecret,
  isEncryptedMfaSecret,
  resetMfaKeyCacheForTests,
} from "./mfa-secret-crypto";
import { redactAuditValue } from "../../audit/audit.service";

const field = (key: string) => {
  const definition = POLICY_FIELD_MAP.get(key);
  if (!definition) throw new Error(`missing ${key}`);
  return definition;
};

const platform = () => ({
  managed: defaultsFor("managed"),
  delegatedFields: defaultDelegatedFields(),
  version: 3,
});

describe("security policy definitions", () => {
  it("has unique keys and a default for every profile it belongs to", () => {
    const keys = POLICY_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);

    for (const f of POLICY_FIELDS) {
      for (const profile of f.profiles) {
        expect(f.defaults[profile]).toBeDefined();
        expect(validateFieldValue(f, f.defaults[profile])).toBeNull();
      }
    }
  });

  it("keeps the behaviour Fockis had before the policy existed", () => {
    const accounts = defaultsFor("accounts");

    expect(accounts.minimumPasswordLength).toBe(12);
    expect(accounts.maxFailedLoginAttempts).toBe(5);
    expect(accounts.loginRetryDelaySeconds).toBe(30);
    expect(accounts.accountLockoutDurationMinutes).toBe(15);
    expect(accounts.failedLoginResetMinutes).toBe(30);
    expect(accounts.inactivityTimeoutMinutes).toBe(0);
    expect(accounts.maximumSessionHours).toBe(0);
    expect(accounts.adminInactivityMinutes).toBe(10);
    expect(accounts.adminMaximumSessionHours).toBe(8);
    expect(accounts.superAdminInactivityMinutes).toBe(5);
    expect(accounts.superAdminMaximumSessionHours).toBe(4);
    expect(accounts.requireTwoFactorForAdministrators).toBe(true);
  });

  it("only delegates fields that are delegable managed fields", () => {
    for (const key of defaultDelegatedFields()) {
      expect(field(key).delegable).toBe(true);
      expect(field(key).profiles).toContain("managed");
    }

    expect(defaultDelegatedFields()).not.toContain("protectOrganizationOwner");
    expect(defaultDelegatedFields()).not.toContain("requireVerifiedEmail");
  });

  it("validates ranges and types", () => {
    expect(validateFieldValue(field("minimumPasswordLength"), 7)).toMatch(/at least 8/);
    expect(validateFieldValue(field("minimumPasswordLength"), 129)).toMatch(/at most 128/);
    expect(validateFieldValue(field("minimumPasswordLength"), 12.5)).toMatch(/whole number/);
    expect(validateFieldValue(field("minimumPasswordLength"), "12")).toMatch(/number/);
    expect(validateFieldValue(field("strongPasswords"), "yes")).toMatch(/on or off/);
    expect(validateFieldValue(field("minimumPasswordLength"), 16)).toBeNull();
  });
});

describe("strictness", () => {
  it("compares each direction correctly", () => {
    expect(stricterValue(field("minimumPasswordLength"), 12, 16)).toBe(16);
    expect(stricterValue(field("maxFailedLoginAttempts"), 5, 3)).toBe(3);
    expect(stricterValue(field("requireTwoFactor"), false, true)).toBe(true);
    expect(stricterValue(field("inactivityTimeoutMinutes"), 0, 30)).toBe(30);
    expect(stricterValue(field("inactivityTimeoutMinutes"), 15, 30)).toBe(15);
  });

  it("detects weaker values", () => {
    expect(isWeaker(field("minimumPasswordLength"), 10, 12)).toBe(true);
    expect(isWeaker(field("minimumPasswordLength"), 14, 12)).toBe(false);
    expect(isWeaker(field("maxFailedLoginAttempts"), 10, 5)).toBe(true);
    expect(isWeaker(field("requireTwoFactorForAdministrators"), false, true)).toBe(true);
    expect(isWeaker(field("inactivityTimeoutMinutes"), 0, 15)).toBe(true);
    expect(isWeaker(field("inactivityTimeoutMinutes"), 10, 15)).toBe(false);
    expect(isWeaker(field("inactivityTimeoutMinutes"), 10, 0)).toBe(false);
  });
});

describe("normalizeProfile", () => {
  it("fills defaults, drops unknown keys and replaces invalid values", () => {
    const values = normalizeProfile("accounts", {
      minimumPasswordLength: 3,
      maxFailedLoginAttempts: 7,
      somethingElse: true,
    });

    expect(values.minimumPasswordLength).toBe(12);
    expect(values.maxFailedLoginAttempts).toBe(7);
    expect(values).not.toHaveProperty("somethingElse");
  });

  it("pins locked and unavailable settings to their defaults", () => {
    const values = normalizeProfile("accounts", {
      requireVerifiedEmail: true,
      securityAuditLog: false,
    });

    expect(values.requireVerifiedEmail).toBe(false);
    expect(values.securityAuditLog).toBe(true);
  });

  it("filters delegation to delegable fields", () => {
    expect(normalizeDelegation(["minimumPasswordLength", "protectLastAdministrator", "nope"])).toEqual([
      "minimumPasswordLength",
    ]);
    expect(normalizeDelegation(undefined)).toEqual(defaultDelegatedFields());
  });
});

describe("organization policy resolution", () => {
  const created = new Date("2026-01-01T00:00:00Z");

  it("inherits the baseline when the organization never saved settings", () => {
    const resolved = resolveOrganizationValues(platform(), "org1", {
      minimumPasswordLength: 20,
      inactivityTimeoutMinutes: 15,
      createdAt: created,
      updatedAt: created,
    });

    expect(resolved.customized).toBe(false);
    expect(resolved.values.minimumPasswordLength).toBe(12);
    expect(resolved.values.inactivityTimeoutMinutes).toBe(0);
  });

  it("applies stricter delegated settings", () => {
    const resolved = resolveOrganizationValues(platform(), "org1", {
      minimumPasswordLength: 16,
      requireTwoFactor: true,
      createdAt: created,
      updatedAt: new Date(created.getTime() + 60_000),
    });

    expect(resolved.customized).toBe(true);
    expect(resolved.values.minimumPasswordLength).toBe(16);
    expect(resolved.values.requireTwoFactor).toBe(true);
    expect(resolved.overriddenFields).toEqual(
      expect.arrayContaining(["minimumPasswordLength", "requireTwoFactor"]),
    );
  });

  it("never lets an organization weaken the platform baseline", () => {
    const base = platform();
    base.managed.minimumPasswordLength = 14;

    const resolved = resolveOrganizationValues(base, "org1", {
      minimumPasswordLength: 8,
      platformManagedAt: new Date(),
    });

    expect(resolved.values.minimumPasswordLength).toBe(14);
  });

  it("ignores organization values for non-delegated fields", () => {
    const base = platform();
    base.delegatedFields = base.delegatedFields.filter((key) => key !== "requireTwoFactor");

    const resolved = resolveOrganizationValues(base, "org1", {
      requireTwoFactor: true,
      platformManagedAt: new Date(),
    });

    expect(resolved.values.requireTwoFactor).toBe(false);
    expect(resolved.lockedFields).toContain("requireTwoFactor");
  });

  it("reports problems for weakening or locked changes", () => {
    const base = platform();
    const current = resolveOrganizationValues(base, "org1", null).values;

    expect(
      organizationUpdateProblems(base, current, { minimumPasswordLength: 8 }),
    ).toEqual([expect.stringMatching(/cannot be weaker/)]);

    expect(
      organizationUpdateProblems(base, current, { protectLastAdministrator: false }),
    ).toEqual([expect.stringMatching(/managed by Fockis/)]);

    expect(
      organizationUpdateProblems(base, current, { minimumPasswordLength: 16, requireTwoFactor: true }),
    ).toEqual([]);
  });
});

describe("effective user policy merge", () => {
  it("takes the strictest value across the platform and organizations", () => {
    const accounts = defaultsFor("accounts");
    const orgA = { ...defaultsFor("managed"), minimumPasswordLength: 16, inactivityTimeoutMinutes: 30 };
    const orgB = { ...defaultsFor("managed"), inactivityTimeoutMinutes: 15, requireTwoFactor: true };

    const merged = mergeStrictest(accounts, [orgA, orgB]);

    expect(merged.minimumPasswordLength).toBe(16);
    expect(merged.inactivityTimeoutMinutes).toBe(15);
    expect(merged.requireTwoFactor).toBe(true);
    expect(merged.adminInactivityMinutes).toBe(accounts.adminInactivityMinutes);
  });
});

describe("high-risk changes", () => {
  it("flags dangerous directions only", () => {
    const before = defaultsFor("accounts");

    const risky = highRiskChanges(
      diffProfile("accounts", before, {
        ...before,
        requireTwoFactor: true,
        requireTwoFactorForAdministrators: false,
        inactivityTimeoutMinutes: 5,
        minimumPasswordLength: 16,
      }),
    ).map((risk) => risk.field);

    expect(risky).toEqual(
      expect.arrayContaining([
        "requireTwoFactor",
        "requireTwoFactorForAdministrators",
        "inactivityTimeoutMinutes",
      ]),
    );
    expect(risky).not.toContain("minimumPasswordLength");
  });
});

describe("password policy", () => {
  const strict = { minimumPasswordLength: 12, strongPasswords: true };

  it("enforces length and character classes", () => {
    expect(passwordPolicyProblems("Short1!", strict)[0]).toMatch(/at least 12/);
    expect(passwordPolicyProblems("alllowercase123!", strict)[0]).toMatch(/uppercase/);
    expect(passwordPolicyProblems("Valid-Password-123", strict)).toEqual([]);
    expect(passwordPolicyProblems("plainlongpassword", { minimumPasswordLength: 12, strongPasswords: false })).toEqual([]);
  });

  it("never allows fewer than 8 characters", () => {
    expect(passwordPolicyProblems("Ab1!xyz", { minimumPasswordLength: 4, strongPasswords: true })[0]).toMatch(
      /at least 8/,
    );
  });

  it("blocks the current and remembered passwords only", async () => {
    const current = await bcrypt.hash("Current-Pass-1", 4);
    const older = await bcrypt.hash("Older-Pass-1", 4);
    const oldest = await bcrypt.hash("Oldest-Pass-1", 4);
    const history = [older, oldest];

    const values = { preventPasswordReuse: true, passwordHistoryCount: 1 };

    await expect(isPasswordReused("Current-Pass-1", current, history, values)).resolves.toBe(true);
    await expect(isPasswordReused("Older-Pass-1", current, history, values)).resolves.toBe(true);
    await expect(isPasswordReused("Oldest-Pass-1", current, history, values)).resolves.toBe(false);
    await expect(
      isPasswordReused("Older-Pass-1", current, history, { ...values, preventPasswordReuse: false }),
    ).resolves.toBe(false);
  });

  it("keeps only hashes in history, newest first, capped at 50", () => {
    const history = nextPasswordHistory("new", Array.from({ length: 60 }, (_, i) => `h${i}`));

    expect(history[0]).toBe("new");
    expect(history).toHaveLength(50);
  });

  it("expires passwords only when enabled", () => {
    const old = new Date(Date.now() - 100 * 86_400_000);

    expect(isPasswordExpired(old, { passwordExpirationEnabled: false, passwordExpirationDays: 90 })).toBe(false);
    expect(isPasswordExpired(old, { passwordExpirationEnabled: true, passwordExpirationDays: 90 })).toBe(true);
    expect(isPasswordExpired(new Date(), { passwordExpirationEnabled: true, passwordExpirationDays: 90 })).toBe(
      false,
    );
  });
});

describe("login protection helpers", () => {
  it("doubles progressive lockouts up to 24 hours", () => {
    const values = { accountLockoutDurationMinutes: 15, progressiveLockout: true };

    expect(lockoutDurationMs(values, 0)).toBe(15 * 60_000);
    expect(lockoutDurationMs(values, 1)).toBe(30 * 60_000);
    expect(lockoutDurationMs(values, 10)).toBe(24 * 3_600_000);
    expect(lockoutDurationMs({ ...values, progressiveLockout: false }, 5)).toBe(15 * 60_000);
  });

  it("uses network prefixes, not exact addresses", () => {
    expect(networkPrefix("203.0.113.7")).toBe("203.0");
    expect(networkPrefix("::ffff:203.0.113.7")).toBe("203.0");
    expect(networkPrefix("2001:db8:abcd:12::1")).toBe("2001:db8:abcd");
    expect(networkPrefix("")).toBeNull();
  });

  it("fingerprints devices by browser, OS and type", () => {
    const chrome =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

    expect(deviceFingerprint(chrome)).toBe("Chrome|Windows|desktop");
    expect(deviceFingerprint(null)).toBeNull();
  });
});

describe("MFA secret encryption", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-that-is-definitely-longer-than-32-characters";
    delete process.env.MFA_ENCRYPTION_KEY;
    resetMfaKeyCacheForTests();
  });

  it("round-trips and never stores the plaintext", () => {
    const stored = encryptMfaSecret("JBSWY3DPEHPK3PXP");

    expect(isEncryptedMfaSecret(stored)).toBe(true);
    expect(stored).not.toContain("JBSWY3DPEHPK3PXP");
    expect(decryptMfaSecret(stored)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("reads legacy plaintext secrets and rejects tampering", () => {
    expect(decryptMfaSecret("JBSWY3DPEHPK3PXP")).toBe("JBSWY3DPEHPK3PXP");

    const stored = encryptMfaSecret("JBSWY3DPEHPK3PXP");
    const tampered = stored.slice(0, -4) + (stored.endsWith("A") ? "BBBB" : "AAAA");

    expect(decryptMfaSecret(tampered)).toBeNull();
  });

  it("uses MFA_ENCRYPTION_KEY when set", () => {
    process.env.MFA_ENCRYPTION_KEY = "a".repeat(64);
    resetMfaKeyCacheForTests();

    const stored = encryptMfaSecret("SECRET");
    expect(decryptMfaSecret(stored)).toBe("SECRET");

    process.env.MFA_ENCRYPTION_KEY = "b".repeat(64);
    resetMfaKeyCacheForTests();
    expect(decryptMfaSecret(stored)).toBeNull();
  });
});

describe("audit redaction", () => {
  it("removes secrets at any depth", () => {
    const redacted = redactAuditValue({
      password: "x",
      nested: { recoveryCode: "y", token: "z", keep: 1 },
      body: { newPassword: "p", code: "123456" },
    }) as any;

    expect(redacted.password).toBe("[REDACTED]");
    expect(redacted.nested.recoveryCode).toBe("[REDACTED]");
    expect(redacted.nested.token).toBe("[REDACTED]");
    expect(redacted.nested.keep).toBe(1);
    expect(redacted.body.newPassword).toBe("[REDACTED]");
    expect(redacted.body.code).toBe("[REDACTED]");
  });
});
