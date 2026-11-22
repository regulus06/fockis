import * as crypto from "crypto";

// ============================================================================
// MFA SECRET ENCRYPTION AT REST
//
// TOTP secrets are encrypted with AES-256-GCM before they are stored.
//
// Key source (in order):
//   1. MFA_ENCRYPTION_KEY  – 32 bytes as 64 hex characters or base64
//   2. derived from JWT_SECRET with HKDF (domain-separated), so existing
//      deployments keep working without a new variable
//
// Stored format:  enc:v1:<base64(iv[12] | tag[16] | ciphertext)>
//
// Secrets written before this change are plaintext; decryptMfaSecret() still
// reads them, and they are re-encrypted after the next successful use.
// ============================================================================

const PREFIX = "enc:v1:";

let cachedKey: Buffer | null = null;

function loadKey(): Buffer {
  if (cachedKey) return cachedKey;

  const configured = String(process.env.MFA_ENCRYPTION_KEY ?? "").trim();

  if (configured) {
    const fromHex = /^[0-9a-f]{64}$/i.test(configured)
      ? Buffer.from(configured, "hex")
      : null;
    const key = fromHex ?? Buffer.from(configured, "base64");

    if (key.length !== 32) {
      throw new Error(
        "MFA_ENCRYPTION_KEY must be 32 bytes (64 hex characters or base64).",
      );
    }

    cachedKey = key;
    return key;
  }

  const jwtSecret = String(process.env.JWT_SECRET ?? "").trim();

  if (jwtSecret.length < 32) {
    throw new Error(
      "MFA secrets cannot be protected: set MFA_ENCRYPTION_KEY (or a JWT_SECRET of at least 32 characters).",
    );
  }

  cachedKey = Buffer.from(
    crypto.hkdfSync(
      "sha256",
      Buffer.from(jwtSecret, "utf8"),
      Buffer.from("fockis-mfa-salt-v1", "utf8"),
      Buffer.from("fockis-mfa-secret-encryption", "utf8"),
      32,
    ),
  );

  return cachedKey;
}

export function isEncryptedMfaSecret(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export function encryptMfaSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", loadKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(plain), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString("base64");
}

/**
 * Returns the plaintext TOTP secret, or null if it cannot be decrypted.
 */
export function decryptMfaSecret(stored: unknown): string | null {
  if (typeof stored !== "string" || !stored) return null;

  if (!stored.startsWith(PREFIX)) {
    // Legacy plaintext secret.
    return stored;
  }

  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", loadKey(), iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    );
  } catch {
    return null;
  }
}

/** For tests only. */
export function resetMfaKeyCacheForTests(): void {
  cachedKey = null;
}
