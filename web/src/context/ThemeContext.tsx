import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/* ============================================================================
   FOCKIS THEME (Lumière / Sombre)
   One preference for the whole app, saved in localStorage ("fockis-theme"):
     "light" | "dark"  — explicit choice
     "system"          — follow the device (prefers-color-scheme)
   The resolved theme is written on <html> as data-fk-theme (plus
   color-scheme), and Layout/feed/profile wrappers keep their data-theme,
   so global styles and every module can follow it.
   index.html applies the same rules before React starts, so the page never
   flashes the wrong theme on load.
============================================================================ */

export type FockisTheme = "light" | "dark";
export type FockisThemePreference = FockisTheme | "system";

interface ThemeContextValue {
  /** The theme in effect right now. */
  theme: FockisTheme;
  /** What the user chose (may be "system"). */
  preference: FockisThemePreference;
  setPreference: (preference: FockisThemePreference) => void;
  /** Explicit light/dark choice (kept for existing callers). */
  setTheme: (theme: FockisTheme) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "fockis-theme";
const CHANGE_EVENT = "fockis-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isPreference(value: unknown): value is FockisThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

function readPreference(): FockisThemePreference {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isPreference(stored)) return stored;
  } catch {
    // Storage blocked (private mode etc.) — fall through to the default.
  }
  // Default: the Fockis blue (dark) look.
  return "dark";
}

function systemTheme(): FockisTheme {
  try {
    return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

function resolve(preference: FockisThemePreference): FockisTheme {
  return preference === "system" ? systemTheme() : preference;
}

function writePreference(preference: FockisThemePreference) {
  try {
    window.localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Ignore — the theme still applies for this visit.
  }
}

/** Applies the resolved theme to <html> (shared by every provider). */
function applyToDocument(theme: FockisTheme) {
  const root = document.documentElement;
  // data-fk-theme (not data-theme): modules opt in through the --fkt-*
  // tokens in styles/fockis-app-theme.scss, so pages built for one look are
  // never half-repainted by the older --fk-* token blocks.
  root.setAttribute("data-fk-theme", theme);
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#0b1d3a" : "#ffffff");
}

/**
 * Theme state is shared between every ThemeProvider on the page (Layout,
 * Profile page, …) and across tabs, so changing it anywhere switches the
 * whole app immediately and survives a refresh.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<FockisThemePreference>(readPreference);
  const [theme, setResolved] = useState<FockisTheme>(() => resolve(readPreference()));

  // Keep all providers (and other tabs) in step.
  useEffect(() => {
    function onChange(event: Event) {
      const next = (event as CustomEvent<FockisThemePreference>).detail;
      if (isPreference(next)) setPreferenceState(next);
    }
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY && isPreference(event.newValue)) setPreferenceState(event.newValue);
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Resolve the preference, and follow the device while on "system".
  useEffect(() => {
    setResolved(resolve(preference));
    if (preference !== "system") return;
    let media: MediaQueryList | null = null;
    try {
      media = window.matchMedia(DARK_QUERY);
    } catch {
      return;
    }
    const onSystem = () => setResolved(media!.matches ? "dark" : "light");
    media.addEventListener?.("change", onSystem);
    return () => media?.removeEventListener?.("change", onSystem);
  }, [preference]);

  useEffect(() => {
    applyToDocument(theme);
  }, [theme]);

  const setPreference = useCallback((next: FockisThemePreference) => {
    setPreferenceState(next);
    writePreference(next);
    window.dispatchEvent(new CustomEvent<FockisThemePreference>(CHANGE_EVENT, { detail: next }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      preference,
      setPreference,
      setTheme: (next: FockisTheme) => setPreference(next),
      toggleTheme: () => setPreference(theme === "light" ? "dark" : "light"),
    }),
    [theme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useFockisTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useFockisTheme must be used within ThemeProvider");
  return ctx;
}
