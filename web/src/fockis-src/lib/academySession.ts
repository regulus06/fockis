/**
 * Academy sign-in state for the public Academy pages (navbar, login page).
 *
 * Academy has its own accounts (POST /academy/auth/login | register,
 * GET /academy/auth/me). This module only looks at the Academy token
 * ("academyToken"), never the main Fockis app token, and signing out of
 * Academy leaves the main Fockis session alone.
 */
import { useEffect, useState } from "react";
import { getAcademyApiBaseUrl, getMe, type AcademyUser } from "./academyApi";

const KEYS = ["academyToken", "academy_token"];

export type Session = { status: "loading" | "guest" | "user"; user: AcademyUser | null };

let current: Session = { status: "loading", user: null };
let inflight: Promise<void> | null = null;
const listeners = new Set<(s: Session) => void>();

function emit(s: Session) {
  current = s;
  listeners.forEach((l) => l(s));
}

export function academyToken(): string | null {
  try {
    for (const k of KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch {
    /* storage unavailable */
  }
  return null;
}

function clearToken() {
  try {
    KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

/** (Re)load the signed-in Academy user. */
export function refreshSession(): Promise<void> {
  if (!academyToken()) {
    emit({ status: "guest", user: null });
    return Promise.resolve();
  }
  if (!inflight)
    inflight = getMe()
      .then((user) => emit({ status: "user", user }))
      .catch((e: { status?: number; message?: string }) => {
        // Expired / invalid / other-server token: forget it.
        if (e?.status === 401 || e?.status === 403 || /unauthor|jwt|token/i.test(String(e?.message ?? ""))) clearToken();
        emit({ status: "guest", user: null });
      })
      .finally(() => {
        inflight = null;
      });
  return inflight;
}

export function useAcademySession(): Session {
  const [s, setS] = useState<Session>(current);
  useEffect(() => {
    listeners.add(setS);
    if (current.status === "loading") void refreshSession();
    else setS(current);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

export function signOutAcademy() {
  clearToken();
  emit({ status: "guest", user: null });
}

async function authPost(path: string, body: unknown): Promise<AcademyUser | null> {
  const res = await fetch(`${getAcademyApiBaseUrl()}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = Array.isArray(data?.message) ? data.message.join(", ") : data?.message;
    throw new Error(msg || (res.status === 401 ? "Incorrect email or password." : `Request failed (${res.status})`));
  }
  const token = data.accessToken || data.token || data.access_token;
  if (!token) throw new Error(data?.message || "Sign-in did not return a session. If two-factor is on, use the admin sign-in.");
  try {
    localStorage.setItem("academyToken", token);
  } catch {
    throw new Error("Your browser blocked storage, so you can't stay signed in.");
  }
  await refreshSession();
  return current.user;
}

export const signInAcademy = (email: string, password: string) => authPost("login", { email: email.trim(), password });
export const registerAcademy = (name: string, email: string, password: string) => authPost("register", { name: name.trim(), email: email.trim(), password });

/** Where to send someone after signing in, by role. */
export function homeFor(user: AcademyUser | null): string {
  const role = String(user?.role ?? "");
  if (role === "administrator" || role === "staff") return "/academy/admin";
  if (role === "instructor") return "/academy/instructor";
  return "/academy/portal";
}
