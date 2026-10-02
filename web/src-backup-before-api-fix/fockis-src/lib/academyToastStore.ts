import { create } from 'zustand';

interface AcademyToastState {
  message: string;
  visible: boolean;
  showToast: (message: string) => void;
}

let hideTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Small zustand store for the Academy toast notifications (job applied,
 * message sent, etc). Matches the state-management pattern already used
 * elsewhere in this app (see node_modules/zustand). If your app already
 * has a shared toast/notification system, swap calls to `useAcademyToast`
 * for that instead and delete this file.
 */
export const useAcademyToast = create<AcademyToastState>((set) => ({
  message: '',
  visible: false,
  showToast: (message: string) => {
    if (hideTimer) clearTimeout(hideTimer);
    set({ message, visible: true });
    hideTimer = setTimeout(() => set({ visible: false }), 2600);
  },
}));
