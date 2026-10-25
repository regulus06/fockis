import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type FockisTheme = "light" | "dark";

interface ThemeContextValue {
  theme: FockisTheme;
  toggleTheme: () => void;
  setTheme: (theme: FockisTheme) => void;
}

const STORAGE_KEY = "fockis-theme";
const CHANGE_EVENT = "fockis-theme-change";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): FockisTheme {
  if (typeof window === "undefined") return "dark";

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage blocked (private mode etc.) — fall through to the default.
  }

  // Default: the Fockis blue (dark) look.
  return "dark";
}

function writeStoredTheme(theme: FockisTheme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Ignore — the theme still applies for this visit.
  }
}

/**
 * Theme state is saved in localStorage and shared between every
 * ThemeProvider on the page (Layout, Profile page, …), so clicking the
 * sun/moon button anywhere switches the whole app and survives a refresh.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<FockisTheme>(readStoredTheme);

  // Keep all providers (and other tabs) in step.
  useEffect(() => {
    function onChange(event: Event) {
      const next = (event as CustomEvent<FockisTheme>).detail;
      if (next === "light" || next === "dark") setThemeState(next);
    }

    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY && (event.newValue === "light" || event.newValue === "dark")) {
        setThemeState(event.newValue);
      }
    }

    window.addEventListener(CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-fk-theme", theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const setTheme = useCallback((next: FockisTheme) => {
    setThemeState(next);
    writeStoredTheme(next);
    window.dispatchEvent(new CustomEvent<FockisTheme>(CHANGE_EVENT, { detail: next }));
  }, []);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useFockisTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useFockisTheme must be used within ThemeProvider");
  return ctx;
}
