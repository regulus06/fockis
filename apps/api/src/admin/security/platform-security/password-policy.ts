import * as bcrypt from "bcryptjs";

import { PolicyValues } from "./security-policy.definitions";

// ============================================================================
// PASSWORD POLICY HELPERS
//
// Pure functions shared by registration, password change, password reset and
// administrator resets so every path enforces the same effective policy.
// ============================================================================

/** Hard limits that no policy can relax. */
export const PASSWORD_ABSOLUTE_MIN = 8;
export const PASSWORD_ABSOLUTE_MAX = 128;
export const PASSWORD_HISTORY_STORED = 50;

/**
 * Returns a list of problems with a new password (empty when it is allowed).
 */
export function passwordPolicyProblems(
  password: string,
  values: PolicyValues,
): string[] {
  const value = String(password ?? "");
  const problems: string[] = [];

  const minimum = Math.max(
    PASSWORD_ABSOLUTE_MIN,
    Number(values.minimumPasswordLength || 12),
  );

  if (value.length < minimum) {
    problems.push(`Password must be at least ${minimum} characters long.`);
  }

  if (value.length > PASSWORD_ABSOLUTE_MAX) {
    problems.push(`Password must be at most ${PASSWORD_ABSOLUTE_MAX} characters long.`);
  }

  if (values.strongPasswords !== false) {
    if (!/[A-Z]/.test(value)) {
      problems.push("Password must contain at least one uppercase letter.");
    }

    if (!/[a-z]/.test(value)) {
      problems.push("Password must contain at least one lowercase letter.");
    }

    if (!/[0-9]/.test(value)) {
      problems.push("Password must contain at least one number.");
    }

    if (!/[^A-Za-z0-9]/.test(value)) {
      problems.push("Password must contain at least one special character.");
    }
  }

  return problems;
}

/**
 * True when the new password matches the current password or one of the
 * remembered previous passwords (bcrypt comparison only).
 */
export async function isPasswordReused(
  newPassword: string,
  currentHash: string | null | undefined,
  history: unknown,
  values: PolicyValues,
): Promise<boolean> {
  if (currentHash && (await bcrypt.compare(newPassword, currentHash))) {
    return true;
  }

  if (values.preventPasswordReuse === false) return false;

  const count = Math.max(0, Number(values.passwordHistoryCount || 0));

  if (!count || !Array.isArray(history)) return false;

  for (const hash of history.slice(0, count)) {
    if (typeof hash !== "string" || !hash) continue;

    try {
      if (await bcrypt.compare(newPassword, hash)) return true;
    } catch {
      // Ignore malformed hashes.
    }
  }

  return false;
}

/** Previous-password list after a change (hashes only, newest first). */
export function nextPasswordHistory(
  previousHash: string | null | undefined,
  history: unknown,
): string[] {
  const list = Array.isArray(history)
    ? history.filter((item): item is string => typeof item === "string" && !!item)
    : [];

  return (previousHash ? [previousHash, ...list] : list).slice(
    0,
    PASSWORD_HISTORY_STORED,
  );
}

/** True when the password is older than the policy allows. */
export function isPasswordExpired(
  passwordChangedAt: unknown,
  values: PolicyValues,
  now = Date.now(),
): boolean {
  if (!values.passwordExpirationEnabled) return false;

  const days = Number(values.passwordExpirationDays || 0);

  if (days <= 0) return false;

  if (!passwordChangedAt) return false;

  const changed = new Date(String(passwordChangedAt)).getTime();

  if (Number.isNaN(changed)) return false;

  return now - changed > days * 86_400_000;
}
