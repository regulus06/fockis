import { create } from 'zustand';
import type { AuditActionType, AuditEvent, AuditRisk, PlatformUser } from '../types/admin.types';
import { mockAuditLogs } from '../mock/mockAuditLogs';
import { mockUsers } from '../mock/mockUsers';
import { useAdminSessionStore } from './adminSessionStore';

interface RecordAuditInput {
  action: AuditActionType;
  resource: string;
  target: string;
  targetId?: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
  risk: AuditRisk;
  result?: 'SUCCESS' | 'FAILURE' | 'DENIED';
}

interface AdminStoreState {
  users: PlatformUser[];
  auditLog: AuditEvent[];
  recordAuditEvent: (input: RecordAuditInput) => AuditEvent;
  updateUser: (id: string, patch: Partial<PlatformUser>) => void;
  getUser: (id: string) => PlatformUser | undefined;
}

let auditCounter = mockAuditLogs.length;

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  users: mockUsers,
  auditLog: mockAuditLogs,

  recordAuditEvent: (input) => {
    const actor = useAdminSessionStore.getState().currentAdmin;
    auditCounter += 1;
    const event: AuditEvent = {
      id: `audit_${(9000 + auditCounter).toString()}`,
      timestamp: new Date().toISOString(),
      actor: actor.name,
      actorRole: actor.role,
      resource: input.resource,
      action: input.action,
      target: input.target,
      targetId: input.targetId,
      previousValue: input.previousValue,
      newValue: input.newValue,
      reason: input.reason,
      ip: '10.20.30.40',
      session: `sess_live_${actor.id}`,
      requestId: `req_${Date.now().toString(16)}`,
      result: input.result ?? 'SUCCESS',
      risk: input.risk,
    };
    set((state) => ({ auditLog: [event, ...state.auditLog] }));
    return event;
  },

  updateUser: (id, patch) => {
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  },

  getUser: (id) => get().users.find((u) => u.id === id),
}));
