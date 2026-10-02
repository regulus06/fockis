import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type FockisTheme = "light" | "dark";

interface ThemeContextValue {
  theme: FockisTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<FockisTheme>(() => {
    if (typeof window === "undefined") return "dark";
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-fk-theme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useFockisTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useFockisTheme must be used within ThemeProvider");
  return ctx;
}
