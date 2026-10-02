import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  generateSecret,
  generateURI,
  verify,
} from "otplib";

import * as QRCode from "qrcode";
import * as crypto from "crypto";
import * as bcrypt from "bcrypt";

@Injectable()
export class MfaService {
  private readonly ISSUER = "Fockis";

  private readonly RECOVERY_CODE_COUNT = 10;

  private readonly RECOVERY_CODE_LENGTH = 10;

  private readonly BCRYPT_ROUNDS = 12;

  // ============================================================
  // TOTP SECRET
  // ============================================================

  /**
   * Generate a new TOTP secret.
   */
  generateSecret(): string {
    return generateSecret();
  }

  // ============================================================
  // OTP AUTHENTICATION URL
  // ============================================================

  /**
   * Generate the otpauth URI used by authenticator applications.
   *
   * Compatible with:
   * - Google Authenticator
   * - Microsoft Authenticator
   * - Authy
   * - 1Password
   * - other standard TOTP applications
   */
  generateOtpAuthUrl(
    email: string,
    secret: string,
  ): string {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    const normalizedSecret = String(secret || "").trim();

    if (!normalizedEmail) {
      throw new BadRequestException(
        "Email is required.",
      );
    }

    if (!normalizedSecret) {
      throw new BadRequestException(
        "MFA secret is required.",
      );
    }

    return generateURI({
      issuer: this.ISSUER,
      label: normalizedEmail,
      secret: normalizedSecret,
    });
  }

  // ============================================================
  // QR CODE
  // ============================================================

  /**
   * Generate a QR-code data URL from an otpauth URI.
   */
  async generateQrCodeDataUrl(
    otpAuthUrl: string,
  ): Promise<string> {
    const normalizedUrl = String(
      otpAuthUrl || "",
    ).trim();

    if (!normalizedUrl) {
      throw new BadRequestException(
        "OTP authentication URL is required.",
      );
    }

    return QRCode.toDataURL(
      normalizedUrl,
      {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 300,
      },
    );
  }

  // ============================================================
  // TOTP VERIFICATION
  // ============================================================

  /**
   * Verify a six-digit TOTP code.
   */
  async verifyTotp(
    token: string,
    secret: string,
  ): Promise<boolean> {
    const normalizedToken = String(
      token || "",
    )
      .replace(/\s+/g, "")
      .trim();

    const normalizedSecret = String(
      secret || "",
    ).trim();

    if (!normalizedToken || !normalizedSecret) {
      return false;
    }

    if (!/^\d{6}$/.test(normalizedToken)) {
      return false;
    }

    try {
      const result = await verify({
        secret: normalizedSecret,
        token: normalizedToken,
      });

      return Boolean(result.valid);
    } catch {
      return false;
    }
  }

  // ============================================================
  // RECOVERY CODES
  // ============================================================

  /**
   * Generate one-time MFA recovery codes.
   *
   * IMPORTANT:
   * - `codes` are returned to the user once.
   * - `hashes` are what should be stored in MongoDB.
   * - Plaintext recovery codes must never be stored.
   */
  async generateRecoveryCodes(): Promise<{
    codes: string[];
    hashes: string[];
  }> {
    const codes: string[] = [];
    const hashes: string[] = [];

    for (
      let index = 0;
      index < this.RECOVERY_CODE_COUNT;
      index += 1
    ) {
      const code =
        this.generateRecoveryCode();

      const hash =
        await bcrypt.hash(
          code,
          this.BCRYPT_ROUNDS,
        );

      codes.push(code);
      hashes.push(hash);
    }

    return {
      codes,
      hashes,
    };
  }

  // ============================================================
  // RECOVERY CODE VERIFICATION
  // ============================================================

  /**
   * Find a matching recovery-code hash.
   *
   * Returns:
   *   index >= 0  -> matching recovery code
   *   -1          -> no match
   *
   * The caller is responsible for atomically removing the
   * consumed recovery code from the user's database record.
   */
  async verifyRecoveryCode(
    code: string,
    hashes: string[],
  ): Promise<number> {
    if (
      !code ||
      !Array.isArray(hashes) ||
      hashes.length === 0
    ) {
      return -1;
    }

    const normalizedCode =
      String(code)
        .replace(/[\s-]/g, "")
        .trim()
        .toUpperCase();

    if (!normalizedCode) {
      return -1;
    }

    for (
      let index = 0;
      index < hashes.length;
      index += 1
    ) {
      const hash = hashes[index];

      if (!hash) {
        continue;
      }

      try {
        const matches =
          await bcrypt.compare(
            normalizedCode,
            hash,
          );

        if (matches) {
          return index;
        }
      } catch {
        // Ignore malformed hashes and continue
        // checking the remaining recovery codes.
      }
    }

    return -1;
  }

  // ============================================================
  // RECOVERY CODE GENERATION
  // ============================================================

  /**
   * Generate a cryptographically secure recovery code.
   *
   * Characters that can easily be confused are excluded:
   * - 0
   * - 1
   * - I
   * - O
   */
  private generateRecoveryCode(): string {
    const alphabet =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const bytes =
      crypto.randomBytes(
        this.RECOVERY_CODE_LENGTH,
      );

    let result = "";

    for (
      let index = 0;
      index < this.RECOVERY_CODE_LENGTH;
      index += 1
    ) {
      result +=
        alphabet[
          bytes[index] %
            alphabet.length
        ];
    }

    return result;
  }
}