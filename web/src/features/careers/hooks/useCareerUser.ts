import { create } from 'zustand';
import { profileApi } from '../services/profileApi';
import type { FockisUser } from '../types';

interface CareerUserState {
  user: FockisUser | null;
  loading: boolean;
  failed: boolean;
  newAlertMatches: number;
  load: () => Promise<void>;
  refreshAlerts: () => Promise<void>;
}

export const hasCareerToken = () =>
  ['access_token', 'token', 'jwt', 'authToken', 'auth_token'].some((key) => Boolean(localStorage.getItem(key)));

/** Signed-in Fockis account (GET /users/me) and alert badge count. */
export const useCareerUser = create<CareerUserState>((set, get) => ({
  user: null,
  loading: false,
  failed: false,
  newAlertMatches: 0,
  load: async () => {
    if (get().user || get().loading || !hasCareerToken()) return;
    set({ loading: true });
    try {
      const user = await profileApi.me();
      set({ user, failed: false });
      void get().refreshAlerts();
    } catch {
      set({ failed: true });
    } finally {
      set({ loading: false });
    }
  },
  refreshAlerts: async () => {
    try {
      const alerts = await profileApi.alerts();
      set({ newAlertMatches: alerts.reduce((sum, alert) => sum + alert.newMatches, 0) });
    } catch {
      /* alerts are optional in the header */
    }
  },
}));

export function displayName(user: FockisUser | null): string {
  if (!user) return '';
  return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || '';
}
