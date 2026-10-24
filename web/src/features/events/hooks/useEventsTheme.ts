import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";

  const attr = document.documentElement.getAttribute("data-fk-theme");

  if (attr === "light" || attr === "dark") return attr;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Follows the app's ThemeContext, which writes data-fk-theme on <html>.
 * Read from the DOM so Events pages work with or without the provider.
 */
export function useEventsTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(readTheme()));

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-fk-theme"] });

    return () => observer.disconnect();
  }, []);

  return theme;
}
