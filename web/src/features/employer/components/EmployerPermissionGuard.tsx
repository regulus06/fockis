
import type { ReactNode } from 'react';

interface EmployerPermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;

  /** Permissions supplied by the authenticated employer session. */
  permissions?: readonly string[];

  /** Optional permission-checking function supplied by the parent. */
  hasPermission?: (permission: string) => boolean;

  /** Hide protected content while permissions are being loaded. */
  loading?: boolean;

  /** Optional content displayed while permissions are loading. */
  loadingFallback?: ReactNode;
}

export function EmployerPermissionGuard({
  permission,
  children,
  fallback = null,
  permissions = [],
  hasPermission,
  loading = false,
  loadingFallback = null,
}: EmployerPermissionGuardProps) {
  if (loading) {
    return <>{loadingFallback}</>;
  }

  if (!permission.trim()) {
    return <>{fallback}</>;
  }

  const allowed = hasPermission
    ? hasPermission(permission)
    : permissions.includes(permission);

  return <>{allowed ? children : fallback}</>;
}

export default EmployerPermissionGuard;
