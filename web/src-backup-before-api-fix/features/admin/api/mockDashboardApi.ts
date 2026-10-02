import { delay } from '../mock/delay';
import { PERMISSIONS } from '../permissions/permission.constants';
import { hasPermission } from '../permissions/permissionHelpers';
import type { PermissionValue } from '../permissions/permission.constants';
import { ForbiddenError, type DashboardStats } from '../types/admin.types';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { useAdminStore } from '../store/adminStore';

function requirePermission(permission: PermissionValue) {
  const granted = useAdminSessionStore.getState().permissions;
  if (!hasPermission(granted, permission)) {
    throw new ForbiddenError(permission);
  }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  requirePermission(PERMISSIONS.ANALYTICS_VIEW);
  await delay(320);

  const users = useAdminStore.getState().users;
  const byStatus = (s: string) => users.filter((u) => u.status === s).length;

  return {
    totalUsers: users.length,
    activeUsers: byStatus('ACTIVE'),
    blockedUsers: byStatus('BLOCKED'),
    suspendedUsers: byStatus('SUSPENDED'),
    pendingRecoveryCases: 15,
    pendingModerationCases: 8,
    pendingMarketplaceReviews: 6,
    pendingPayouts: 10,
    openSupportCases: 12,
    securityAlerts: 4,
    pendingDeletionRequests: byStatus('PENDING_DELETION'),
    revenue: 482310,
    marketplaceGmv: 1284900,
    activeLiveStreams: 7,
    activeMeetings: 22,
    subscriptionRevenue: 96430,
  };
}
