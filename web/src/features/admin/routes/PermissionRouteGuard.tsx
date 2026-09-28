import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { useAdminSessionStore } from "../store/adminSessionStore";
import { AccessDeniedPage } from "../pages/AccessDeniedPage";

interface PermissionRouteGuardProps {
  requireAny?: string[];
  requireAll?: string[];
  children: ReactNode;
}

interface AdminSessionUser {
  role?: string | null;
  roles?: string[] | null;

  isAdmin?: boolean | null;
  isSuperAdmin?: boolean | null;

  is_admin?: boolean | null;
  is_super_admin?: boolean | null;

  permissions?: string[] | null;
}

function normalizeRole(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function isSuperAdmin(
  user: AdminSessionUser | null,
): boolean {
  if (!user) {
    return false;
  }

  if (
    user.isSuperAdmin === true ||
    user.is_super_admin === true
  ) {
    return true;
  }

  if (
    normalizeRole(user.role) ===
      "super_admin" ||
    normalizeRole(user.role) ===
      "superadmin"
  ) {
    return true;
  }

  if (
    Array.isArray(user.roles) &&
    user.roles.some(
      (role) =>
        normalizeRole(role) ===
          "super_admin" ||
        normalizeRole(role) ===
          "superadmin",
    )
  ) {
    return true;
  }

  return false;
}

function normalizePermission(
  value: unknown,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function hasPermission(
  user: AdminSessionUser,
  permission: string,
): boolean {
  const required =
    normalizePermission(permission);

  if (!required) {
    return true;
  }

  /*
   * SUPER_ADMIN has unrestricted administration
   * permissions.
   */
  if (isSuperAdmin(user)) {
    return true;
  }

  const permissions =
    Array.isArray(user.permissions)
      ? user.permissions
      : [];

  return permissions.some(
    (granted) =>
      normalizePermission(granted) ===
      required,
  );
}

export function PermissionRouteGuard({
  requireAny = [],
  requireAll = [],
  children,
}: PermissionRouteGuardProps) {
  const location = useLocation();

  const currentAdmin =
    useAdminSessionStore(
      (state) => state.currentAdmin,
    );

  /*
   * No authenticated admin session.
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

  const user =
    currentAdmin as AdminSessionUser;

  /*
   * SUPER_ADMIN bypasses frontend permission
   * lists. Backend authorization still remains
   * enforced by JwtAuthGuard/RbacGuard/
   * SuperAdminGuard.
   */
  if (isSuperAdmin(user)) {
    return <>{children}</>;
  }

  /*
   * If no permission requirement was supplied,
   * authenticated admins may continue.
   */
  if (
    requireAny.length === 0 &&
    requireAll.length === 0
  ) {
    return <>{children}</>;
  }

  /*
   * ANY permission.
   */
  const anyGranted =
    requireAny.length === 0 ||
    requireAny.some((permission) =>
      hasPermission(
        user,
        permission,
      ),
    );

  /*
   * ALL permissions.
   */
  const allGranted =
    requireAll.length === 0 ||
    requireAll.every((permission) =>
      hasPermission(
        user,
        permission,
      ),
    );

  if (!anyGranted || !allGranted) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}

export default PermissionRouteGuard;