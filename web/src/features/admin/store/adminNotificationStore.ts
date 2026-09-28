import { create } from 'zustand';
import type { AdminNotification } from '../types/admin.types';

export interface Toast {
  id: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface NotificationState {
  toasts: Toast[];
  notifications: AdminNotification[];
  pushToast: (variant: Toast['variant'], message: string) => void;
  dismissToast: (id: string) => void;
  markAllRead: () => void;
  unreadCount: () => number;
}

const seedNotifications: AdminNotification[] = [
  {
    id: 'ntf_1',
    type: 'RECOVERY_CASE',
    title: 'New recovery case opened',
    message: 'A user has requested account recovery and needs verification.',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    read: false,
    severity: 'INFO',
  },
  {
    id: 'ntf_2',
    type: 'SECURITY_ALERT',
    title: 'Unusual login pattern detected',
    message: 'Multiple failed logins from a new region for an administrator account.',
    timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    read: false,
    severity: 'CRITICAL',
  },
  {
    id: 'ntf_3',
    type: 'MARKETPLACE_DISPUTE',
    title: 'New marketplace dispute',
    message: 'A buyer has escalated an order dispute for review.',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    read: false,
    severity: 'WARNING',
  },
  {
    id: 'ntf_4',
    type: 'PENDING_DELETION',
    title: 'Account pending deletion review',
    message: 'A deletion request is awaiting SUPER_ADMIN approval.',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    read: true,
    severity: 'INFO',
  },
];

export const useAdminNotificationStore = create<NotificationState>((set, get) => ({
  toasts: [],
  notifications: seedNotifications,
  pushToast: (variant, message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`, variant, message }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  markAllRead: () =>
    set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
}));
