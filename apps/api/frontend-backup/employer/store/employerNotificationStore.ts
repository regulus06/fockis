import { create } from 'zustand';
interface EmployerNotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}
export const useEmployerNotificationStore = create<EmployerNotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount: Math.max(0, unreadCount) }),
}));
