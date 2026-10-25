import { useCallback } from "react";

import { useAdminSessionStore } from "../store/adminSessionStore";

/* ============================================================================
   ADMIN ACCESS HELPERS

   Mirrors the logic used by PermissionRouteGuard so navigation and page
   controls show exactly the routes and actions the current administrator can
   actually open. The backend remains the final authority.
============================================================================ */

interface SessionLikeAdmin {
  role?: string | null;
  roles?: string[] | null;
  isSuperAdmin?: boolean | null;
  is_super_admin?: boolean | null;
  permissions?: unknown[] | null;
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

export function isSuperAdminSession(
  admin: SessionLikeAdmin | null | undefined,
): boolean {
  if (!admin) return false;

  if (admin.isSuperAdmin === true || admin.is_super_admin === true) {
    return true;
  }

  const superRoles = new Set(["super_admin", "superadmin", "super_admin_user"]);

  if (superRoles.has(normalizeRole(admin.role))) return true;

  return (
    Array.isArray(admin.roles) &&
    admin.roles.some((role) => superRoles.has(normalizeRole(role)))
  );
}

/**
 * Returns a stable `can(anyOf)` function.
 *
 * - SUPER_ADMIN: always true (same as PermissionRouteGuard).
 * - Empty requirement list: true for any authenticated admin.
 * - Otherwise: true when at least one permission is granted by either the
 *   role-derived session permissions or the admin record's own permissions.
 */
export function useAdminAccess() {
  const currentAdmin = useAdminSessionStore((state) => state.currentAdmin);
  const sessionPermissions = useAdminSessionStore((state) => state.permissions);

  const can = useCallback(
    (anyOf: readonly string[] = []): boolean => {
      if (!currentAdmin) return false;

      const admin = currentAdmin as unknown as SessionLikeAdmin;

      if (isSuperAdminSession(admin)) return true;

      if (anyOf.length === 0) return true;

      const granted = new Set<string>(
        [
          ...sessionPermissions,
          ...(Array.isArray(admin.permissions) ? admin.permissions : []),
        ].map((value) => String(value).trim().toLowerCase()),
      );

      return anyOf.some((permission) =>
        granted.has(String(permission).trim().toLowerCase()),
      );
    },
    [currentAdmin, sessionPermissions],
  );

  return { can, currentAdmin };
}
