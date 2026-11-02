import { create } from 'zustand';

/* The Admin Center follows the app-wide Fockis theme (Lumière / Sombre,
   saved as "fockis-theme" and applied on <html data-fk-theme>), and its own
   sun/moon toggle changes that same setting. */

type AdminTheme = 'dark' | 'light';

const STORAGE_KEY = 'fockis-theme';
const CHANGE_EVENT = 'fockis-theme-change';

function currentTheme(): AdminTheme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-fk-theme') === 'light' ? 'light' : 'dark';
}

interface AdminUiState {
  sidebarCollapsed: boolean;
  theme: AdminTheme;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export const useAdminUiStore = create<AdminUiState>((set, get) => ({
  sidebarCollapsed: false,
  theme: currentTheme(),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleTheme: () => {
    const next: AdminTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({ theme: next });
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the theme still applies for this visit */
    }
    document.documentElement.setAttribute('data-fk-theme', next);
    document.documentElement.style.colorScheme = next;
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }));
  },
}));

// Follow changes made elsewhere (Settings → Appearance, other tabs, device).
if (typeof window !== 'undefined' && typeof MutationObserver !== 'undefined') {
  new MutationObserver(() => {
    const theme = currentTheme();
    if (useAdminUiStore.getState().theme !== theme) useAdminUiStore.setState({ theme });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-fk-theme'] });
}
