/* Helpers for the authenticated principal (request.user from JwtStrategy). */

export interface Actor {
  id?: string;
  _id?: string;
  userId?: string;
  sub?: string;
  role?: string;
  isSuperAdmin?: boolean;
  permissions?: unknown;
  username?: string;
}

export function actorId(actor: Actor | null | undefined): string {
  return String(actor?.id ?? actor?._id ?? actor?.userId ?? actor?.sub ?? "").trim();
}

export function normalizeRole(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function isSuperAdmin(actor: Actor | null | undefined): boolean {
  return Boolean(actor && (actor.isSuperAdmin === true || normalizeRole(actor.role) === "super_admin"));
}

/** Same rule as RbacGuard: super admins pass, others need the permission. */
export function hasPermission(actor: Actor | null | undefined, permission: string): boolean {
  if (!actor) return false;
  if (isSuperAdmin(actor)) return true;

  const granted = Array.isArray(actor.permissions)
    ? actor.permissions.map((value) => String(value).trim().toLowerCase())
    : [];

  return granted.includes(permission.trim().toLowerCase());
}

export const STAFF_ROLES = ["moderator", "admin", "super_admin"];
