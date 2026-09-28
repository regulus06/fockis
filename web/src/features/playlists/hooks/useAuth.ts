/**
 * ASSUMPTION (no existing codebase was provided to match against):
 * Fockis almost certainly already has an app-wide auth context/hook (e.g.
 * `shared/auth/useAuth` or `app/providers/AuthProvider`). This stand-in
 * mirrors the minimal shape the playlist feature needs from it.
 *
 * >>> Replace this import in every consuming file with the real app hook,
 * >>> e.g. `import { useAuth } from '@/shared/auth/useAuth'`, and delete
 * >>> this file once that's wired up. <<<
 */

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isProducer: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

declare global {
  interface Window {
    __FOCKIS_AUTH__?: AuthState;
  }
}

/**
 * Reads session state the real AuthProvider is expected to expose on
 * `window.__FOCKIS_AUTH__` until wired to the actual context. Never invents
 * a signed-in user when none is present — unauthenticated is a first-class
 * state throughout this feature (see the "Sign in to access your library"
 * state in StateViews.tsx).
 */
export function useAuth(): AuthState {
  if (typeof window !== 'undefined' && window.__FOCKIS_AUTH__) {
    return window.__FOCKIS_AUTH__;
  }
  return { user: null, isAuthenticated: false, isLoading: false };
}