import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Types } from "mongoose";

import { RolePermissions } from "../rbac/role-permissions";
import { Role } from "../rbac/roles.enum";

// ============================================================================
// ADMIN NOTIFICATION RECIPIENTS
//
// Resolves who may receive a notification from the same RBAC data the API
// uses to authorize requests (system role permissions + active custom admin
// role + direct permissions; super administrators receive everything).
// ============================================================================

export interface PermissionSubject {
  role?: unknown;
  isSuperAdmin?: unknown;
  permissions?: unknown;
}

const ROLE_MAP: Record<string, Role> = {
  user: Role.USER,
  moderator: Role.MODERATOR,
  admin: Role.ADMIN,
  super_admin: Role.SUPER_ADMIN,
};

export function normalizeRoleName(role: unknown): string {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  return values.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
}

/** Same merge as JwtStrategy: role + custom role + direct permissions. */
export function effectivePermissions(
  user: PermissionSubject,
  customRolePermissions: unknown,
): { permissions: string[]; isSuperAdmin: boolean } {
  const role = normalizeRoleName(user.role);
  const isSuperAdmin = user.isSuperAdmin === true || role === "super_admin";
  const roleEnum = ROLE_MAP[role];

  const permissions = new Set<string>([
    ...normalizeList(roleEnum ? RolePermissions[roleEnum] : []),
    ...normalizeList(customRolePermissions),
    ...normalizeList(user.permissions),
  ]);

  return { permissions: Array.from(permissions), isSuperAdmin };
}

export function qualifies(
  required: string[],
  effective: { permissions: string[]; isSuperAdmin: boolean },
): boolean {
  if (effective.isSuperAdmin) return true;
  if (!required.length) return false;

  const owned = new Set(effective.permissions);

  return required.some((p) => owned.has(p.toLowerCase()));
}

const MAX_RECIPIENTS = 200;

@Injectable()
export class AdminRecipientsService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  /** Active accounts holding at least one of `required` permissions. */
  async resolve(required: string[], exclude: string[] = []): Promise<string[]> {
    const candidates = await this.connection
      .collection("users")
      .find(
        {
          isActive: { $ne: false },
          $or: [
            { role: { $in: ["moderator", "admin", "super_admin", "Super Admin", "super-admin"] } },
            { isSuperAdmin: true },
            { adminRoleId: { $exists: true, $ne: null } },
            { "permissions.0": { $exists: true } },
          ],
        },
        { projection: { _id: 1, role: 1, isSuperAdmin: 1, permissions: 1, adminRoleId: 1 } },
      )
      .limit(2000)
      .toArray();

    const roleIds = Array.from(
      new Set(
        candidates
          .map((u) => u.adminRoleId)
          .filter((id) => id && Types.ObjectId.isValid(String(id)))
          .map(String),
      ),
    );

    const roles = roleIds.length
      ? await this.connection
          .collection("admin_roles")
          .find(
            { _id: { $in: roleIds.map((id) => new Types.ObjectId(id)) }, isActive: true },
            { projection: { permissions: 1 } },
          )
          .toArray()
      : [];

    const rolePermissions = new Map(roles.map((r) => [String(r._id), r.permissions]));
    const excluded = new Set(exclude.map(String));
    const result: string[] = [];

    for (const user of candidates) {
      const id = String(user._id);

      if (excluded.has(id)) continue;

      const effective = effectivePermissions(
        user as PermissionSubject,
        user.adminRoleId ? rolePermissions.get(String(user.adminRoleId)) : [],
      );

      if (qualifies(required, effective)) result.push(id);
      if (result.length >= MAX_RECIPIENTS) break;
    }

    return result;
  }
}
