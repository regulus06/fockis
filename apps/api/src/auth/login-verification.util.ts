import * as crypto from "crypto";

// Pure helpers for the sign-in verification step (unit-tested).

/** Keyed hash of a verification code, bound to one restriction. */
export function hashVerificationCode(key: Buffer, restrictionId: string, code: string): string {
  return crypto.createHmac("sha256", key).update(`${restrictionId}:${code}`).digest("hex");
}

/** Uniformly random 6-digit code. */
export function generateVerificationCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** jordan@example.com → jo****@example.com */
export function maskEmail(email: string): string {
  const [name, domain] = String(email ?? "").split("@");

  if (!name || !domain) return "";

  const visible = name.length <= 2 ? name.slice(0, 1) : name.slice(0, 2);

  return `${visible}${"*".repeat(Math.max(1, Math.min(6, name.length - visible.length)))}@${domain}`;
}
