import { create } from 'zustand';

export type EmployerToastTone = 'success' | 'error' | 'info';

export interface EmployerToast {
  id: number;
  tone: EmployerToastTone;
  message: string;
}

interface EmployerNotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  toasts: EmployerToast[];
  notify: (message: string, tone?: EmployerToastTone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useEmployerNotificationStore = create<EmployerNotificationState>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount: Math.max(0, unreadCount) }),
  toasts: [],
  notify: (message, tone = 'success') => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, tone, message }].slice(-4) });
    window.setTimeout(() => get().dismiss(id), tone === 'error' ? 7000 : 4000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
}));

/** Shorthand for components: const notify = useNotify(); notify('Saved'); */
export const useNotify = () => useEmployerNotificationStore((state) => state.notify);
