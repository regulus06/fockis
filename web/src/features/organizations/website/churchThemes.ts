/**
 * churchThemes.ts
 * -----------------------------------------------------------------------------
 * Colour themes for the Fockis Church Website Template. Every theme uses the
 * same template (same sections, same layout) — only the colours change.
 * Ocean Blue is the default every new church receives.
 *
 * The values are applied as CSS custom properties on .cw (ChurchWebsite.scss).
 * -----------------------------------------------------------------------------
 */

export type ChurchThemeId = "ocean-blue" | "royal-gold" | "royal-purple" | "forest-green" | "burgundy-classic" | "modern-minimal";

export interface ChurchTheme {
  id: ChurchThemeId;
  name: string;
  /** Buttons, active nav, icons. */
  primary: string;
  primaryHover: string;
  /** Highlights (badges, verse marks). */
  accent: string;
  /** Footer, hero shade, schedule card. RGB triplet so it can be used with alpha. */
  darkRgb: string;
  /** Page background. */
  page: string;
  /** Light tint behind icons / hover rows. */
  soft: string;
  /** Text on top of `primary`. */
  onPrimary: string;
}

export const CHURCH_THEMES: ChurchTheme[] = [
  { id: "ocean-blue", name: "Ocean Blue", primary: "#1463d9", primaryHover: "#0f52b8", accent: "#1463d9", darkRgb: "11, 43, 94", page: "#f2f6fc", soft: "#e8f0fd", onPrimary: "#ffffff" },
  { id: "royal-gold", name: "Royal Gold", primary: "#15294d", primaryHover: "#0e1d38", accent: "#c79a1e", darkRgb: "14, 29, 56", page: "#fbf7ee", soft: "#f5ecd5", onPrimary: "#ffffff" },
  { id: "royal-purple", name: "Royal Purple", primary: "#6a3fc6", primaryHover: "#5630a8", accent: "#8b5cf6", darkRgb: "45, 22, 96", page: "#f7f4fd", soft: "#ede6fb", onPrimary: "#ffffff" },
  { id: "forest-green", name: "Forest Green", primary: "#2d6a3a", primaryHover: "#22552d", accent: "#7aa344", darkRgb: "23, 61, 33", page: "#f8f6ef", soft: "#e6efe0", onPrimary: "#ffffff" },
  { id: "burgundy-classic", name: "Burgundy Classic", primary: "#8a1c33", primaryHover: "#701528", accent: "#b23a52", darkRgb: "74, 14, 28", page: "#fbf7f2", soft: "#f5e5e8", onPrimary: "#ffffff" },
  { id: "modern-minimal", name: "Modern Minimal", primary: "#1f2a44", primaryHover: "#141c2f", accent: "#3b4a6b", darkRgb: "34, 38, 46", page: "#f4f5f7", soft: "#eceef2", onPrimary: "#ffffff" },
];

export const DEFAULT_CHURCH_THEME: ChurchThemeId = "ocean-blue";

export function churchTheme(id?: string | null): ChurchTheme {
  return CHURCH_THEMES.find((t) => t.id === id) ?? CHURCH_THEMES[0];
}

/** CSS custom properties for a theme, ready for a `style` prop. */
export function churchThemeVars(theme: ChurchTheme): Record<string, string> {
  return {
    "--cw-primary": theme.primary,
    "--cw-primary-hover": theme.primaryHover,
    "--cw-accent": theme.accent,
    "--cw-dark-rgb": theme.darkRgb,
    "--cw-page": theme.page,
    "--cw-soft": theme.soft,
    "--cw-on-primary": theme.onPrimary,
  };
}
