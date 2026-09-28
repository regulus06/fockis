import { create } from 'zustand';
import {
  login as apiLogin,
  logout as apiLogout,
  getMe,
  getStoredToken,
  AcademyUser,
} from './academyApi';

interface AcademyAdminAuthState {
  user: AcademyUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated';
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Validates any stored token against the backend on app load. */
  hydrate: () => Promise<void>;
}

/**
 * Manages the admin session: who's logged in, their role, and the JWT.
 * The token itself lives in localStorage (see academyApi.ts); this store
 * just tracks the reactive UI state around it. Matches the state pattern
 * already used elsewhere in this app (zustand), same as academyToastStore.
 */
export const useAcademyAdminAuth = create<AcademyAdminAuthState>((set) => ({
  user: null,
  status: 'idle',
  error: null,

  login: async (email, password) => {
    set({ status: 'loading', error: null });
    try {
      const result = await apiLogin(email, password);
      set({ user: result.user, status: 'authenticated', error: null });
    } catch (err: any) {
      set({ status: 'unauthenticated', error: err?.message ?? 'Sign in failed.' });
      throw err;
    }
  },

  logout: () => {
    apiLogout();
    set({ user: null, status: 'unauthenticated', error: null });
  },

  hydrate: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ status: 'unauthenticated' });
      return;
    }
    set({ status: 'loading' });
    try {
      const user = await getMe();
      set({ user, status: 'authenticated', error: null });
    } catch {
      set({ user: null, status: 'unauthenticated' });
    }
  },
}));

export const ADMIN_ROLES = ['administrator', 'staff'] as const;

export function isAdminRole(role: string | undefined): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
