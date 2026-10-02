import { delay } from '../mock/delay';
import { PERMISSIONS } from '../permissions/permission.constants';
import { hasPermission } from '../permissions/permissionHelpers';
import type { PermissionValue } from '../permissions/permission.constants';
import { ForbiddenError, type AuditEvent } from '../types/admin.types';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { useAdminStore } from '../store/adminStore';

function requirePermission(permission: PermissionValue) {
  const granted = useAdminSessionStore.getState().permissions;
  if (!hasPermission(granted, permission)) {
    throw new ForbiddenError(permission);
  }
}

export interface AuditListParams {
  search?: string;
  risk?: string;
  result?: string;
  page?: number;
  pageSize?: number;
}

export async function getAuditLogs(
  params: AuditListParams = {},
): Promise<{ items: AuditEvent[]; total: number }> {
  requirePermission(PERMISSIONS.AUDIT_VIEW);
  await delay(300);

  const { search = '', risk = 'ALL', result = 'ALL', page = 1, pageSize = 15 } = params;
  let items = useAdminStore.getState().auditLog;

  if (risk !== 'ALL') items = items.filter((e) => e.risk === risk);
  if (result !== 'ALL') items = items.filter((e) => e.result === result);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (e) =>
        e.actor.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        e.target.toLowerCase().includes(q),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total };
}

export async function getUserAuditHistory(userId: string): Promise<AuditEvent[]> {
  requirePermission(PERMISSIONS.AUDIT_VIEW);
  await delay(250);
  return useAdminStore.getState().auditLog.filter((e) => e.targetId === userId);
}
