import { create } from 'zustand';

/* Toasts for the Admin Center. Admin notifications themselves come from
   the backend (see ../notifications/adminNotificationFeed.ts). */

export interface Toast {
  id: string;
  variant: 'success' | 'warning' | 'error' | 'info';
  message: string;
}

interface ToastState {
  toasts: Toast[];
  pushToast: (variant: Toast['variant'], message: string) => void;
  dismissToast: (id: string) => void;
}

export const useAdminNotificationStore = create<ToastState>((set) => ({
  toasts: [],
  pushToast: (variant, message) =>
    set((state) => ({
      toasts: [...state.toasts, { id: `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`, variant, message }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
