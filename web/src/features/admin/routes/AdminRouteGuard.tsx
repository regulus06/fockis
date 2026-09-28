import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAdminSessionStore } from "../store/adminSessionStore";

interface AdminRouteGuardProps {
  children: ReactNode;
}

interface AdminUser {
  role?: string | null;
  roles?: string[] | null;

  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;

  // Some Fockis auth responses use these names.
  permissions?: string[] | null;
  is_admin?: boolean | null;
  is_super_admin?: boolean | null;
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSuperAdminRole(value: unknown): boolean {
  const role = normalizeRole(value);

  return (
    role === "super_admin" ||
    role === "superadmin" ||
    role === "super_admin_user"
  );
}

function hasAdminRole(user: AdminUser | null): boolean {
  if (!user) {
    return false;
  }

  /*
   * SUPER_ADMIN is always an administrator.
   *
   * This intentionally checks both the canonical fields and the
   * alternate casing/naming that may come from older Fockis auth
   * responses.
   */
  if (
    user.isSuperAdmin === true ||
    user.is_super_admin === true
  ) {
    return true;
  }

  if (isSuperAdminRole(user.role)) {
    return true;
  }

  if (
    Array.isArray(user.roles) &&
    user.roles.some((role) =>
      isSuperAdminRole(role),
    )
  ) {
    return true;
  }

  /*
   * Normal administrator access.
   */
  if (
    user.isAdmin === true ||
    user.is_admin === true
  ) {
    return true;
  }

  const allowedRoles = new Set([
    "admin",
    "administrator",
    "super_admin",
    "superadmin",
    "super_admin_user",
  ]);

  if (
    allowedRoles.has(
      normalizeRole(user.role),
    )
  ) {
    return true;
  }

  if (
    Array.isArray(user.roles) &&
    user.roles.some((role) =>
      allowedRoles.has(
        normalizeRole(role),
      ),
    )
  ) {
    return true;
  }

  return false;
}

export function AdminRouteGuard({
  children,
}: AdminRouteGuardProps) {
  const location = useLocation();

  const currentAdmin =
    useAdminSessionStore(
      (state) => state.currentAdmin,
    );

  /*
   * IMPORTANT:
   *
   * Do not redirect a valid SUPER_ADMIN simply because
   * an older frontend session object is missing isAdmin.
   *
   * The backend is the final authorization authority.
   */
  if (!currentAdmin) {
    return (
      <Navigate
        to={`/admin/sign-in?returnTo=${encodeURIComponent(
          location.pathname +
            location.search,
        )}`}
        replace
      />
    );
  }

  const adminUser =
    currentAdmin as AdminUser;

  if (!hasAdminRole(adminUser)) {
    return (
      <Navigate
        to="/admin/access-denied"
        replace
      />
    );
  }

  return <>{children}</>;
}

export default AdminRouteGuard;