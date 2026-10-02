import { delay } from '../mock/delay';
import { PERMISSIONS } from '../permissions/permission.constants';
import { hasPermission } from '../permissions/permissionHelpers';
import type { PermissionValue } from '../permissions/permission.constants';
import { ForbiddenError, type PlatformUser, type UserAccountStatus } from '../types/admin.types';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { useAdminStore } from '../store/adminStore';

function requirePermission(permission: PermissionValue) {
  const granted = useAdminSessionStore.getState().permissions;
  if (!hasPermission(granted, permission)) {
    throw new ForbiddenError(permission);
  }
}

function currentAdmin() {
  return useAdminSessionStore.getState().currentAdmin;
}

export interface UserListParams {
  search?: string;
  status?: UserAccountStatus | 'ALL';
  role?: PlatformUser['role'] | 'ALL';
  page?: number;
  pageSize?: number;
}

export interface UserListResult {
  items: PlatformUser[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getUsers(params: UserListParams = {}): Promise<UserListResult> {
  requirePermission(PERMISSIONS.USERS_VIEW);
  await delay(280);

  const { search = '', status = 'ALL', role = 'ALL', page = 1, pageSize = 10 } = params;
  let items = useAdminStore.getState().users;

  if (status !== 'ALL') items = items.filter((u) => u.status === status);
  if (role !== 'ALL') items = items.filter((u) => u.role === role);
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q),
    );
  }

  const total = items.length;
  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  return { items: pageItems, total, page, pageSize };
}

export async function getUser(id: string): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_VIEW);
  await delay(200);
  const user = useAdminStore.getState().getUser(id);
  if (!user) throw new Error('NOT_FOUND');
  return user;
}

function transition(
  id: string,
  status: UserAccountStatus,
  patch: Partial<PlatformUser> = {},
): PlatformUser {
  const store = useAdminStore.getState();
  const user = store.getUser(id);
  if (!user) throw new Error('NOT_FOUND');
  store.updateUser(id, { status, ...patch });
  return { ...user, status, ...patch };
}

export async function activateUser(id: string, reason: string): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_ACTIVATE);
  await delay(350);
  const store = useAdminStore.getState();
  const before = store.getUser(id);
  const user = transition(id, 'ACTIVE');
  store.recordAuditEvent({
    action: 'USER_ACTIVATE',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    previousValue: before?.status,
    newValue: 'ACTIVE',
    reason,
    risk: 'LOW',
  });
  return user;
}

export async function deactivateUser(
  id: string,
  input: { reason: string; notes?: string; notifyUser: boolean },
): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_DEACTIVATE);
  await delay(350);
  const store = useAdminStore.getState();
  const before = store.getUser(id);
  const user = transition(id, 'DEACTIVATED', {
    deactivationReason: input.reason,
    userNotified: input.notifyUser,
  });
  store.recordAuditEvent({
    action: 'USER_DEACTIVATE',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    previousValue: before?.status,
    newValue: 'DEACTIVATED',
    reason: input.reason,
    risk: 'MEDIUM',
  });
  return user;
}

export async function suspendUser(
  id: string,
  input: { reason: string; notes?: string; startDate: string; endDate?: string; notifyUser: boolean },
): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_SUSPEND);
  await delay(350);
  const store = useAdminStore.getState();
  const before = store.getUser(id);
  const user = transition(id, 'SUSPENDED', {
    suspensionStart: input.startDate,
    suspensionEnd: input.endDate,
    userNotified: input.notifyUser,
  });
  store.recordAuditEvent({
    action: 'USER_SUSPEND',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    previousValue: before?.status,
    newValue: 'SUSPENDED',
    reason: input.reason,
    risk: 'MEDIUM',
  });
  return user;
}

export async function blockUser(
  id: string,
  input: { reason: string; details?: string; notifyUser: boolean },
): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_BLOCK);
  await delay(350);
  const store = useAdminStore.getState();
  const before = store.getUser(id);
  const admin = currentAdmin();
  const caseId = `CASE-2026-${Math.floor(100000 + Math.random() * 899999)}`;
  const user = transition(id, 'BLOCKED', {
    blockCaseId: caseId,
    blockedAt: new Date().toISOString(),
    blockedBy: admin.role,
    blockReason: input.reason,
    blockNotes: input.details,
    userNotified: input.notifyUser,
    reviewStatus: 'PENDING',
  });
  store.recordAuditEvent({
    action: 'USER_BLOCK',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    previousValue: before?.status,
    newValue: 'BLOCKED',
    reason: input.reason,
    risk: 'HIGH',
  });
  return user;
}

export async function restoreUser(id: string, reason: string): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_RESTORE);
  await delay(350);
  const store = useAdminStore.getState();
  const before = store.getUser(id);
  const user = transition(id, 'ACTIVE', {
    blockCaseId: undefined,
    blockReason: undefined,
    reviewStatus: 'RESOLVED',
  });
  store.recordAuditEvent({
    action: 'USER_RESTORE',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    previousValue: before?.status,
    newValue: 'ACTIVE',
    reason,
    risk: 'MEDIUM',
  });
  return user;
}

export async function forceLogoutUser(id: string, reason: string): Promise<void> {
  requirePermission(PERMISSIONS.USERS_FORCE_LOGOUT);
  await delay(300);
  const store = useAdminStore.getState();
  const user = store.getUser(id);
  if (!user) throw new Error('NOT_FOUND');
  store.recordAuditEvent({
    action: 'USER_FORCE_LOGOUT',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    reason,
    risk: 'LOW',
  });
}

export async function sendPasswordReset(id: string, reason: string): Promise<void> {
  requirePermission(PERMISSIONS.USERS_RECOVERY);
  await delay(300);
  const store = useAdminStore.getState();
  const user = store.getUser(id);
  if (!user) throw new Error('NOT_FOUND');
  store.recordAuditEvent({
    action: 'USER_PASSWORD_RESET_REQUEST',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    reason,
    risk: 'LOW',
  });
}

export async function requestUserDeletion(
  id: string,
  input: { reason: string; notes?: string },
): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_DELETE_REQUEST);
  await delay(350);
  const store = useAdminStore.getState();
  const before = store.getUser(id);
  const caseId = `DEL-2026-${Math.floor(1000 + Math.random() * 8999)}`;
  const user = transition(id, 'PENDING_DELETION', {
    deletionCaseId: caseId,
    deletionReason: input.reason,
  });
  store.recordAuditEvent({
    action: 'USER_DELETE_REQUEST',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    previousValue: before?.status,
    newValue: 'PENDING_DELETION',
    reason: input.reason,
    risk: 'HIGH',
  });
  return user;
}

export async function permanentlyDeleteUser(
  id: string,
  input: { usernameConfirmation: string; reason: string },
): Promise<PlatformUser> {
  requirePermission(PERMISSIONS.USERS_DELETE_PERMANENT);
  await delay(500);
  const store = useAdminStore.getState();
  const user = store.getUser(id);
  if (!user) throw new Error('NOT_FOUND');
  if (input.usernameConfirmation !== user.username) {
    throw new Error('USERNAME_CONFIRMATION_MISMATCH');
  }
  const admin = currentAdmin();
  const updated = transition(id, 'PERMANENTLY_DELETED', {
    deletedBy: admin.role,
    deletedAt: new Date().toISOString(),
    deletionReason: input.reason,
  });
  store.recordAuditEvent({
    action: 'USER_PERMANENT_DELETE',
    resource: 'users',
    target: updated.name,
    targetId: updated.id,
    previousValue: 'PENDING_DELETION',
    newValue: 'PERMANENTLY_DELETED',
    reason: input.reason,
    risk: 'CRITICAL',
  });
  return updated;
}

export async function viewSensitiveData(
  id: string,
  category: string,
  reason: string,
): Promise<void> {
  requirePermission(PERMISSIONS.USERS_VIEW_SENSITIVE);
  await delay(200);
  const store = useAdminStore.getState();
  const user = store.getUser(id);
  if (!user) throw new Error('NOT_FOUND');
  store.recordAuditEvent({
    action: 'USER_SENSITIVE_DATA_VIEW',
    resource: 'users',
    target: user.name,
    targetId: user.id,
    newValue: category,
    reason,
    risk: 'MEDIUM',
  });
}
