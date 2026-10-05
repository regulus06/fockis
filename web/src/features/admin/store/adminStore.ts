import { create } from "zustand";

import type {
  AdminRole,
  AdminUser,
} from "../types/admin.types";

import type { PermissionValue } from "../permissions/permission.constants";

import { getPermissionsForRole } from "../permissions/rolePermissions";

import { findAdministratorByRole } from "../mock/mockAdministrators";

interface StoredFockisUser {
  _id?: string;
  id?: string;

  name?: string;
  email?: string;
  username?: string;

  role?: string | null;
  roles?: string[] | null;

  isAdmin?: boolean | null;
  is_admin?: boolean | null;

  isSuperAdmin?: boolean | null;
  is_super_admin?: boolean | null;

  permissions?: string[] | null;

  [key: string]: unknown;
}

interface AdminStoreState {
  currentAdmin: AdminUser | null;
  permissions: PermissionValue[];
  switchToken: number;

  setRole: (role: AdminRole) => void;

  getCurrentAdmin: () => AdminUser | null;
  hasPermission: (permission: PermissionValue) => boolean;
  isSuperAdmin: () => boolean;
}

function normalizeRole(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function getStoredUser(): StoredFockisUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("user");

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    return parsed as StoredFockisUser;
  } catch {
    return null;
  }
}

function checkSuperAdmin(
  user: StoredFockisUser | null,
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

  const primaryRole = normalizeRole(user.role);

  if (
    primaryRole === "super_admin" ||
    primaryRole === "superadmin" ||
    primaryRole === "super_admin_user"
  ) {
    return true;
  }

  if (
    Array.isArray(user.roles) &&
    user.roles.some((value) => {
      const role = normalizeRole(value);

      return (
        role === "super_admin" ||
        role === "superadmin" ||
        role === "super_admin_user"
      );
    })
  ) {
    return true;
  }

  return false;
}

function checkAdmin(
  user: StoredFockisUser | null,
): boolean {
  if (!user) {
    return false;
  }

  if (
    user.isAdmin === true ||
    user.is_admin === true ||
    checkSuperAdmin(user)
  ) {
    return true;
  }

  const primaryRole = normalizeRole(user.role);

  if (
    primaryRole === "admin" ||
    primaryRole === "administrator" ||
    primaryRole === "super_admin" ||
    primaryRole === "superadmin"
  ) {
    return true;
  }

  return false;
}

function getRealAdminRole(
  user: StoredFockisUser,
): AdminRole | null {
  const candidates: string[] = [];

  if (user.role) {
    candidates.push(user.role);
  }

  if (Array.isArray(user.roles)) {
    candidates.push(...user.roles);
  }

  const knownRoles = [
    "SUPER_ADMIN",
    "USER_ADMIN",
    "MODERATION_ADMIN",
    "SUPPORT_ADMIN",
    "MARKETPLACE_ADMIN",
    "SELLER_ADMIN",
    "SHIPPING_ADMIN",
    "FINANCE_ADMIN",
    "PAYMENTS_ADMIN",
    "SUBSCRIPTION_ADMIN",
    "CONTENT_ADMIN",
    "MUSIC_ADMIN",
    "TRAVEL_ADMIN",
    "REAL_ESTATE_ADMIN",
    "AI_ADMIN",
    "MARKETING_ADMIN",
    "SECURITY_ADMIN",
    "SYSTEM_ADMIN",
    "AUDITOR",
  ] as const;

  for (const candidate of candidates) {
    const normalized = normalizeRole(candidate);

    const match = knownRoles.find(
      (knownRole) =>
        normalizeRole(knownRole) === normalized,
    );

    if (match) {
      return match as AdminRole;
    }
  }

  return null;
}

function buildCurrentAdmin(): AdminUser | null {
  const user = getStoredUser();

  if (!user) {
    return null;
  }

  /*
   * SECURITY:
   * Normal Fockis users must never receive
   * a fake administrator session.
   */
  if (!checkAdmin(user)) {
    return null;
  }

  const role = getRealAdminRole(user);

  /*
   * Never invent an administrator role.
   */
  if (!role) {
    return null;
  }

  const admin = findAdministratorByRole(role);

  if (!admin) {
    return null;
  }

  /*
   * Keep the original AdminUser structure intact.
   *
   * IMPORTANT:
   * Do NOT add isAdmin or isSuperAdmin here.
   * Those fields are not part of AdminUser.
   */
  return {
    ...admin,

    id:
      user.id ??
      user._id ??
      admin.id,

    name:
      user.name ??
      admin.name,

    email:
      user.email ??
      admin.email,

    role,
  };
}

function getPermissions(
  admin: AdminUser | null,
): PermissionValue[] {
  if (!admin) {
    return [];
  }

  return getPermissionsForRole(
    admin.role,
  );
}

const initialAdmin = buildCurrentAdmin();

export const useAdminStore =
  create<AdminStoreState>((set, get) => ({
    currentAdmin: initialAdmin,

    permissions:
      getPermissions(initialAdmin),

    switchToken: 0,

    setRole: (role: AdminRole) => {
      const user = getStoredUser();

      /*
       * Only a real Super Admin may switch
       * administrator roles.
       */
      if (!checkSuperAdmin(user)) {
        const actualAdmin =
          buildCurrentAdmin();

        set((state) => ({
          currentAdmin: actualAdmin,

          permissions:
            getPermissions(actualAdmin),

          switchToken:
            state.switchToken + 1,
        }));

        return;
      }

      const admin =
        findAdministratorByRole(role);

      if (!admin) {
        return;
      }

      set((state) => ({
        currentAdmin: {
          ...admin,

          id:
            user?.id ??
            user?._id ??
            admin.id,

          name:
            user?.name ??
            admin.name,

          email:
            user?.email ??
            admin.email,

          role,
        },

        permissions:
          getPermissionsForRole(role),

        switchToken:
          state.switchToken + 1,
      }));
    },

    getCurrentAdmin: () => {
      return get().currentAdmin;
    },

    hasPermission: (
      permission: PermissionValue,
    ) => {
      return get().permissions.includes(
        permission,
      );
    },

    isSuperAdmin: () => {
      const user = getStoredUser();

      return checkSuperAdmin(user);
    },
  }));

export default useAdminStore;