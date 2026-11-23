import { FOCKIS_API_URL } from "../../config/fockisConfig";
import axios from "axios";
import type { AuthResponse } from "./loginTypes";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  FOCKIS_API_URL
).replace(/\/+$/, "");

const jsonHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

export async function loginRequest(
  email: string,
  password: string,
) {
  return axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/login`,
    { email: email.trim(), password },
    { headers: jsonHeaders },
  );
}

export async function mfaSetupRequest(setupToken: string) {
  return axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/mfa/setup`,
    { setupToken },
    { headers: jsonHeaders },
  );
}

export async function mfaConfirmRequest(
  setupToken: string,
  code: string,
) {
  return axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/mfa/confirm`,
    { setupToken, code },
    { headers: jsonHeaders },
  );
}

export async function mfaVerifyRequest(
  challengeToken: string,
  code: string,
) {
  return axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/mfa/verify`,
    {
      challenge_token: challengeToken,
      code,
    },
    { headers: jsonHeaders },
  );
}

/* ============================================================
   SIGN-IN VERIFICATION (after unusual sign-in activity)
============================================================ */

export async function verificationEmailRequest(verificationToken: string) {
  return axios.post<{ sent: boolean; maskedEmail: string; expiresInSeconds: number; resendAfterSeconds: number }>(
    `${API_BASE_URL}/auth/login/verification/email`,
    { verification_token: verificationToken },
    { headers: jsonHeaders },
  );
}

export async function verificationVerifyRequest(
  verificationToken: string,
  method: "totp" | "email",
  code: string,
) {
  return axios.post<AuthResponse>(
    `${API_BASE_URL}/auth/login/verification/verify`,
    { verification_token: verificationToken, method, code },
    { headers: jsonHeaders },
  );
}

export async function verificationRecoveryRequest(verificationToken: string, message: string) {
  return axios.post<{ submitted: boolean; caseNumber?: string; message: string }>(
    `${API_BASE_URL}/auth/login/verification/recovery`,
    { verification_token: verificationToken, message },
    { headers: jsonHeaders },
  );
}

/** Public recovery form. The answer is the same whether or not the account exists. */
export async function accountRecoveryRequest(email: string, message: string) {
  return axios.post<{ submitted: boolean; message: string }>(
    `${API_BASE_URL}/auth/recovery`,
    { email: email.trim(), message },
    { headers: jsonHeaders },
  );
}
