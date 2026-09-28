import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { travelPartnerAdminApi } from "../api/travelPartnerAdminApi";

interface AdminRouteGuardProps {
  children: ReactNode;
}

interface StoredUser {
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  permissions?: string[];
}

function getStoredUser(): StoredUser | null {
  const keys = [
    "user",
    "currentUser",
    "auth_user",
    "fockis_user",
  ];

  for (const key of keys) {
    try {
      const raw =
        localStorage.getItem(key) ??
        sessionStorage.getItem(key);

      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object") {
        return parsed as StoredUser;
      }
    } catch {
      // Ignore malformed stored user data.
    }
  }

  return null;
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isAdministrator(user: StoredUser | null): boolean {
  if (!user) {
    return false;
  }

  if (user.isAdmin === true || user.isSuperAdmin === true) {
    return true;
  }

  const roles = Array.isArray(user.roles)
    ? user.roles.map(normalizeRole)
    : [];

  const role = normalizeRole(user.role);

  const allowedRoles = new Set([
    "admin",
    "administrator",
    "super_admin",
    "superadmin",
  ]);

  if (allowedRoles.has(role)) {
    return true;
  }

  return roles.some((item) => allowedRoles.has(item));
}

export default function AdminRouteGuard({
  children,
}: AdminRouteGuardProps) {
  const location = useLocation();

  const hasToken = travelPartnerAdminApi.hasAuthToken();

  if (!hasToken) {
    return (
      <Navigate
        to={`/admin/sign-in?returnTo=${encodeURIComponent(
          location.pathname,
        )}`}
        replace
      />
    );
  }

  const user = getStoredUser();

  if (!isAdministrator(user)) {
    return (
      <Navigate
        to="/admin/access-denied"
        replace
      />
    );
  }

  return <>{children}</>;
}