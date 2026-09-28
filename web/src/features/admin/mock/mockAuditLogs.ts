import type { AuditActionType, AuditEvent, AuditRisk, AdminRole } from '../types/admin.types';
import { mockUsers } from './mockUsers';

const ACTIONS: { action: AuditActionType; resource: string; risk: AuditRisk }[] = [
  { action: 'USER_BLOCK', resource: 'users', risk: 'HIGH' },
  { action: 'USER_SUSPEND', resource: 'users', risk: 'MEDIUM' },
  { action: 'USER_DEACTIVATE', resource: 'users', risk: 'MEDIUM' },
  { action: 'USER_ACTIVATE', resource: 'users', risk: 'LOW' },
  { action: 'USER_RESTORE', resource: 'users', risk: 'MEDIUM' },
  { action: 'USER_FORCE_LOGOUT', resource: 'users', risk: 'LOW' },
  { action: 'USER_DELETE_REQUEST', resource: 'users', risk: 'HIGH' },
  { action: 'USER_PERMANENT_DELETE', resource: 'users', risk: 'CRITICAL' },
  { action: 'USER_PASSWORD_RESET_REQUEST', resource: 'users', risk: 'LOW' },
  { action: 'USER_RECOVERY_CASE_CREATED', resource: 'recovery', risk: 'LOW' },
  { action: 'USER_SENSITIVE_DATA_VIEW', resource: 'users', risk: 'MEDIUM' },
  { action: 'ADMIN_ROLE_CHANGED', resource: 'admins', risk: 'HIGH' },
  { action: 'ADMIN_CREATED', resource: 'admins', risk: 'HIGH' },
  { action: 'SECURITY_POLICY_CHANGED', resource: 'security', risk: 'HIGH' },
  { action: 'FEATURE_FLAG_CHANGED', resource: 'system', risk: 'MEDIUM' },
  { action: 'EMERGENCY_ACTION', resource: 'system', risk: 'CRITICAL' },
  { action: 'MARKETPLACE_APPROVAL', resource: 'marketplace', risk: 'LOW' },
  { action: 'MARKETPLACE_REJECTION', resource: 'marketplace', risk: 'LOW' },
  { action: 'MODERATION_ACTION', resource: 'moderation', risk: 'MEDIUM' },
  { action: 'SUPPORT_CASE_ACTION', resource: 'support', risk: 'LOW' },
];

const ACTORS: { name: string; role: AdminRole }[] = [
  { name: 'Elena Voss', role: 'SUPER_ADMIN' },
  { name: 'Marcus Chen', role: 'USER_ADMIN' },
  { name: 'Priya Nair', role: 'MODERATION_ADMIN' },
  { name: 'Jordan Blake', role: 'SUPPORT_ADMIN' },
  { name: 'Viktor Petrov', role: 'SECURITY_ADMIN' },
  { name: 'David Kaplan', role: 'FINANCE_ADMIN' },
];

function iso(hoursAgo: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString();
}

export const mockAuditLogs: AuditEvent[] = Array.from({ length: 30 }, (_, i) => {
  const def = ACTIONS[i % ACTIONS.length];
  const actor = ACTORS[i % ACTORS.length];
  const target = mockUsers[(i * 3) % mockUsers.length];
  return {
    id: `audit_${(9000 + i).toString()}`,
    timestamp: iso(i * 3 + 1),
    actor: actor.name,
    actorRole: actor.role,
    action: def.action,
    resource: def.resource,
    target: target.name,
    targetId: target.id,
    previousValue: def.action.includes('USER_') ? 'ACTIVE' : undefined,
    newValue: def.action.includes('USER_') ? def.action.replace('USER_', '') : undefined,
    reason: def.risk === 'LOW' ? undefined : 'Reviewed against platform policy and escalation history.',
    ip: `10.${(i * 7) % 255}.${(i * 13) % 255}.${(i * 19) % 255}`,
    session: `sess_${(4000 + i).toString(16)}`,
    requestId: `req_${(70000 + i).toString(16)}`,
    result: i % 13 === 0 ? 'DENIED' : 'SUCCESS',
    risk: def.risk,
  };
});
