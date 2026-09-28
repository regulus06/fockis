import { create } from 'zustand';

export interface ChatWindow {
  conversationId: string;
  minimized: boolean;
  unread: number;
}

interface ChatWindowsState {
  windows: ChatWindow[];
  launcherOpen: boolean;

  toggleLauncher: () => void;
  closeLauncher: () => void;
  openWindow: (conversationId: string) => void;
  closeWindow: (conversationId: string) => void;
  minimizeWindow: (conversationId: string) => void;
  restoreWindow: (conversationId: string) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
}

const MAX_WINDOWS = 3;

export const useChatWindowsStore = create<ChatWindowsState>((set, get) => ({
  windows: [],
  launcherOpen: false,

  toggleLauncher: () => set((state) => ({ launcherOpen: !state.launcherOpen })),
  closeLauncher: () => set({ launcherOpen: false }),

  openWindow: (conversationId) => {
    set((state) => {
      const exists = state.windows.find((w) => w.conversationId === conversationId);
      if (exists) {
        return {
          windows: state.windows.map((w) =>
            w.conversationId === conversationId ? { ...w, minimized: false, unread: 0 } : w,
          ),
        };
      }
      const windows = [{ conversationId, minimized: false, unread: 0 }, ...state.windows].slice(0, MAX_WINDOWS);
      return { windows };
    });
  },

  closeWindow: (conversationId) => {
    set((state) => ({ windows: state.windows.filter((w) => w.conversationId !== conversationId) }));
  },

  minimizeWindow: (conversationId) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.conversationId === conversationId ? { ...w, minimized: true } : w)),
    }));
  },

  restoreWindow: (conversationId) => {
    set((state) => ({
      windows: state.windows.map((w) =>
        w.conversationId === conversationId ? { ...w, minimized: false, unread: 0 } : w,
      ),
    }));
  },

  incrementUnread: (conversationId) => {
    const win = get().windows.find((w) => w.conversationId === conversationId);
    if (!win || !win.minimized) return;
    set((state) => ({
      windows: state.windows.map((w) =>
        w.conversationId === conversationId ? { ...w, unread: w.unread + 1 } : w,
      ),
    }));
  },

  clearUnread: (conversationId) => {
    set((state) => ({
      windows: state.windows.map((w) => (w.conversationId === conversationId ? { ...w, unread: 0 } : w)),
    }));
  },
}));
