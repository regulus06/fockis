import { create } from "zustand";

import type {
  AdminRole,
  AdminUser,
} from "../types/admin.types";

import type { PermissionValue } from "../permissions/permission.constants";

import { getPermissionsForRole } from "../permissions/rolePermissions";

import { findAdministratorByRole } from "../mock/mockAdministrators";

interface AdminSessionState {
  currentAdmin: AdminUser;

  permissions: PermissionValue[];

  /**
   * Bumps on every role switch so UI can key
   * a re-mount / transition.
   */
  switchToken: number;

  setRole: (role: AdminRole) => void;
}

const initialRole: AdminRole = "SUPER_ADMIN";

function buildAdminForRole(
  role: AdminRole,
): AdminUser {
  const admin =
    findAdministratorByRole(role);

  /*
   * Keep the AdminUser object exactly compatible
   * with the existing AdminUser type.
   *
   * Authorization is determined from the role,
   * while permissions are loaded separately below.
   */
  return {
    ...admin,
    role,
  };
}

export const useAdminSessionStore =
  create<AdminSessionState>((set) => ({
    currentAdmin:
      buildAdminForRole(initialRole),

    permissions:
      getPermissionsForRole(initialRole),

    switchToken: 0,

    setRole: (role) =>
      set((state) => ({
        currentAdmin:
          buildAdminForRole(role),

        permissions:
          getPermissionsForRole(role),

        switchToken:
          state.switchToken + 1,
      })),
  }));

export default useAdminSessionStore;