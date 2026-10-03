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
