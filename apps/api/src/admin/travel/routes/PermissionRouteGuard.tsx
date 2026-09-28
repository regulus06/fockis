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

function getAdminPermissions(): TravelAdminPermission[] {
  try {
    const raw =
      localStorage.getItem("admin_permissions") ??
      sessionStorage.getItem("admin_permissions");

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Restricts a route to admins holding a specific Travel permission.
 * Superadmins (permission list containing "*") always pass.
 */
export default function PermissionRouteGuard({
  permission,
  children,
}: PermissionRouteGuardProps) {
  const permissions = getAdminPermissions();

  const allowed =
    permissions.includes("*") || permissions.includes(permission);

  if (!allowed) {
    return <Navigate to="/admin/access-denied" replace />;
  }

  return <>{children}</>;
}
