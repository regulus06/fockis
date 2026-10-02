import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

export type TravelAdminPermission =
  | "travel.dashboard.view"
  | "travel.applications.view"
  | "travel.applications.manage"
  | "travel.partners.view"
  | "travel.partners.manage"
  | "travel.listings.view"
  | "travel.listings.moderate"
  | "travel.bookings.view";

interface PermissionRouteGuardProps {
  permission: TravelAdminPermission;
  children: ReactNode;
}

type StoredUser = {
  role?: string;
  roles?: string[];
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getStoredUser(): StoredUser | null {
  try {
    const raw =
      localStorage.getItem("user") ??
      sessionStorage.getItem("user");

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed as StoredUser;
  } catch {
    return null;
  }
}

function getAdminPermissions(): string[] {
  try {
    const raw =
      localStorage.getItem("admin_permissions") ??
      sessionStorage.getItem("admin_permissions");

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((permission) => String(permission));
  } catch {
    return [];
  }
}

function isAdministrator(user: StoredUser | null): boolean {
  if (!user) {
    return false;
  }

  if (user.isSuperAdmin === true || user.isAdmin === true) {
    return true;
  }

  const role = normalize(user.role);

  if (
    role === "admin" ||
    role === "administrator" ||
    role === "super_admin" ||
    role === "superadmin"
  ) {
    return true;
  }

  const roles = Array.isArray(user.roles)
    ? user.roles.map(normalize)
    : [];

  return (
    roles.includes("admin") ||
    roles.includes("administrator") ||
    roles.includes("super_admin") ||
    roles.includes("superadmin")
  );
}

/**
 * Restricts a Travel Admin route to users with the required
 * Travel permission.
 *
 * Administrators and Super Administrators automatically have
 * access to Travel Admin.
 *
 * Other users must have the specific permission stored in
 * admin_permissions.
 *
 * A "*" permission also grants full access.
 */
export default function PermissionRouteGuard({
  permission,
  children,
}: PermissionRouteGuardProps) {
  const user = getStoredUser();
  const permissions = getAdminPermissions();

  const administrator = isAdministrator(user);

  const hasWildcardPermission = permissions.includes("*");
  const hasSpecificPermission = permissions.includes(permission);

  const allowed =
    administrator ||
    hasWildcardPermission ||
    hasSpecificPermission;

  if (!allowed) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  return <>{children}</>;
}