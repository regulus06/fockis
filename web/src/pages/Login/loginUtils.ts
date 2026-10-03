import type { AuthResponse, LoginUser } from "./loginTypes";

export function extractToken(
  data: AuthResponse | undefined | null,
): string | null {
  const token =
    data?.access_token ||
    data?.accessToken ||
    data?.token ||
    data?.jwt ||
    data?.data?.access_token ||
    data?.data?.accessToken ||
    data?.data?.token ||
    data?.data?.jwt ||
    data?.result?.access_token ||
    data?.result?.accessToken ||
    data?.result?.token ||
    data?.result?.jwt;

  return typeof token === "string" && token.trim()
    ? token.trim()
    : null;
}

export function extractUser(
  data: AuthResponse | undefined | null,
): LoginUser | null {
  const user =
    data?.user ||
    data?.data?.user ||
    data?.result?.user;

  return user && typeof user === "object" ? user : null;
}

export function extractSetupToken(
  data: AuthResponse | undefined | null,
): string | null {
  const value = data?.setup_token || data?.setupToken;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export function extractChallengeToken(
  data: AuthResponse | undefined | null,
): string | null {
  const value = data?.challengeToken || data?.challenge_token;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

export function extractQrCode(
  data: AuthResponse | undefined | null,
): string | null {
  const value =
    data?.qrCode ||
    data?.qr_code ||
    data?.qrCodeDataUrl ||
    data?.qr_code_data_url ||
    data?.otpAuthUrl ||
    data?.otpauthUrl ||
    null;

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  return null;
}

export function extractMfaSecret(
  data: AuthResponse | undefined | null,
): string | null {
  const value = data?.mfaSecret || data?.secret;

  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}
