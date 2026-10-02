import { delay } from '../mock/delay';
import { mockAdministrators } from '../mock/mockAdministrators';
import { PERMISSIONS } from '../permissions/permission.constants';
import { hasPermission } from '../permissions/permissionHelpers';
import type { PermissionValue } from '../permissions/permission.constants';
import { ForbiddenError, type AdminUser } from '../types/admin.types';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { useAdminStore } from '../store/adminStore';

function requirePermission(permission: PermissionValue) {
  const granted = useAdminSessionStore.getState().permissions;
  if (!hasPermission(granted, permission)) {
    throw new ForbiddenError(permission);
  }
}

export async function getAdministrators(): Promise<AdminUser[]> {
  requirePermission(PERMISSIONS.ADMINS_VIEW);
  await delay(280);
  return mockAdministrators;
}

export async function getAdministrator(id: string): Promise<AdminUser> {
  requirePermission(PERMISSIONS.ADMINS_VIEW);
  await delay(200);
  const admin = mockAdministrators.find((a) => a.id === id);
  if (!admin) throw new Error('NOT_FOUND');
  return admin;
}

export async function suspendAdministrator(id: string, reason: string): Promise<void> {
  requirePermission(PERMISSIONS.ADMINS_SUSPEND);
  await delay(350);
  const admin = mockAdministrators.find((a) => a.id === id);
  if (!admin) throw new Error('NOT_FOUND');
  admin.status = 'SUSPENDED';
  useAdminStore.getState().recordAuditEvent({
    action: 'ADMIN_SUSPENDED',
    resource: 'admins',
    target: admin.name,
    targetId: admin.id,
    reason,
    risk: 'HIGH',
  });
}

export async function restoreAdministrator(id: string, reason: string): Promise<void> {
  requirePermission(PERMISSIONS.ADMINS_RESTORE);
  await delay(350);
  const admin = mockAdministrators.find((a) => a.id === id);
  if (!admin) throw new Error('NOT_FOUND');
  admin.status = 'ACTIVE';
  useAdminStore.getState().recordAuditEvent({
    action: 'ADMIN_RESTORED',
    resource: 'admins',
    target: admin.name,
    targetId: admin.id,
    reason,
    risk: 'MEDIUM',
  });
}
