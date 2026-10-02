import type { ReactNode } from 'react';
import { useAdminSessionStore } from '../store/adminSessionStore';
import type { PermissionValue } from '../permissions/permission.constants';
import { hasAllPermissions, hasAnyPermission } from '../permissions/permissionHelpers';

interface PermissionGateProps {
  /** must have ALL of these */
  require?: PermissionValue[];
  /** must have AT LEAST ONE of these */
  requireAny?: PermissionValue[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ require, requireAny, children, fallback = null }: PermissionGateProps) {
  const granted = useAdminSessionStore((s) => s.permissions);

  if (require && !hasAllPermissions(granted, require)) return <>{fallback}</>;
  if (requireAny && !hasAnyPermission(granted, requireAny)) return <>{fallback}</>;

  return <>{children}</>;
}

// Backwards/spec-compatible alias
export const AdminPermissionGate = PermissionGate;
