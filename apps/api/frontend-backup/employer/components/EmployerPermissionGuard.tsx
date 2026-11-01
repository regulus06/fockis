import type { ReactNode } from 'react';

interface Props { permission: string; children: ReactNode; fallback?: ReactNode }

export function EmployerPermissionGuard({ permission, children, fallback = null }) {
  void permission; return <>{fallback}</>;
}
