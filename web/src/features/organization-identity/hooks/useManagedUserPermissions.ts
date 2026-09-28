import { useMemo } from "react";

import type {
  ManagedUserRole,
} from "../types/organizationIdentity.types";

export interface ManagedUserPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canSuspend: boolean;
  canRemove: boolean;
  canResetPassword: boolean;
  canManageDomains: boolean;
  canManageSecurity: boolean;
}

export function useManagedUserPermissions(
  role: ManagedUserRole,
): ManagedUserPermissions {
  return useMemo(() => {
    const owner =
      role === "owner";

    const admin =
      role === "admin";

    const manager =
      role === "manager";

    return {
      canCreate:
        owner ||
        admin ||
        manager,

      canEdit:
        owner ||
        admin ||
        manager,

      canSuspend:
        owner ||
        admin ||
        manager,

      canRemove:
        owner ||
        admin,

      canResetPassword:
        owner ||
        admin ||
        manager,

      canManageDomains:
        owner ||
        admin,

      canManageSecurity:
        owner ||
        admin,
    };
  }, [role]);
}

export default useManagedUserPermissions;