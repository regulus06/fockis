import type { EmployerRole } from '../types/Employer';
const ROLE_PERMISSIONS: Record<EmployerRole, string[]> = {
  owner: ['*'],
  admin: ['profile:read', 'profile:update', 'jobs:*', 'applicants:*', 'interviews:*', 'team:read', 'team:invite', 'analytics:read', 'billing:read'],
  hr_manager: ['profile:read', 'jobs:*', 'applicants:*', 'interviews:*', 'analytics:read'],
  recruiter: ['profile:read', 'jobs:read', 'applicants:read', 'applicants:update', 'interviews:read', 'interviews:create'],
  viewer: ['profile:read', 'jobs:read', 'applicants:read', 'analytics:read'],
};
export function canEmployer(role: EmployerRole | undefined, permission: string): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes('*') || permissions.includes(permission) ||
    permissions.some((entry) => entry.endsWith('*') && permission.startsWith(entry.slice(0, -1)));
}
// UI helper only. The backend must independently authorize every request.
