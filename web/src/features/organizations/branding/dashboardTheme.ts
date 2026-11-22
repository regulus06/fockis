/**
 * dashboardTheme.ts
 * -----------------------------------------------------------------------------
 * Organization dashboard theme (Customize Page → Colors / Header / Sidebar
 * color). Stored with the existing page branding (MongoDB
 * "organization_page_branding", pageKey "dashboard-theme"):
 *   theme.primary / secondary / button / navActive / sidebar   #rrggbb
 *   bannerDesktop.url   header background image (else the organization cover)
 *   headerStyle         image | gradient | solid
 *   overlayOpacity      header overlay strength
 *   showTagline         show the tagline under the name
 * Nothing saved = the Fockis defaults below.
 * -----------------------------------------------------------------------------
 */

import type { CSSProperties } from "react";

import type { PageBrandingContent } from "./pageBrandingApi";

export const DASHBOARD_THEME_KEY = "dashboard-theme";

export interface ThemeColors {
  primary: string;
  secondary: string;
  button: string;
  navActive: string;
  sidebar: string;
}

export interface DashboardTheme {
  colors: ThemeColors;
  headerUrl: string | null;
  headerStyle: "image" | "gradient" | "solid";
  headerOpacity: number;
  showTagline: boolean;
}

export const DEFAULT_COLORS: ThemeColors = {
  primary: "#0b63d1",
  secondary: "#d62839",
  button: "#0b63d1",
  navActive: "#0b63d1",
  sidebar: "#0b1f4d",
};

export const DEFAULT_THEME: DashboardTheme = {
  colors: { ...DEFAULT_COLORS },
  headerUrl: null,
  headerStyle: "image",
  headerOpacity: 0.55,
  showTagline: true,
};

const HEX = /^#[0-9a-f]{6}$/i;

export function themeFrom(content?: PageBrandingContent | null): DashboardTheme {
  if (!content) return { ...DEFAULT_THEME, colors: { ...DEFAULT_COLORS } };
  const t = content.theme ?? {};
  const pick = (v: string | undefined, d: string) => (v && HEX.test(v) ? v.toLowerCase() : d);
  return {
    colors: {
      primary: pick(t.primary, DEFAULT_COLORS.primary),
      secondary: pick(t.secondary, DEFAULT_COLORS.secondary),
      button: pick(t.button, DEFAULT_COLORS.button),
      navActive: pick(t.navActive, DEFAULT_COLORS.navActive),
      sidebar: pick(t.sidebar, DEFAULT_COLORS.sidebar),
    },
    headerUrl: content.bannerDesktop?.url ?? null,
    headerStyle: content.headerStyle ?? "image",
    headerOpacity: typeof content.overlayOpacity === "number" ? content.overlayOpacity : DEFAULT_THEME.headerOpacity,
    showTagline: content.showTagline !== false,
  };
}

export function themeContent(theme: DashboardTheme): PageBrandingContent {
  return {
    theme: { ...theme.colors },
    ...(theme.headerUrl ? { bannerDesktop: { url: theme.headerUrl } } : {}),
    headerStyle: theme.headerStyle,
    overlayOpacity: Math.min(0.9, Math.max(0, Math.round(theme.headerOpacity * 100) / 100)),
    showTagline: theme.showTagline,
    showBanner: false,
  };
}

export function isDefaultTheme(theme: DashboardTheme): boolean {
  return JSON.stringify(themeContent(theme)) === JSON.stringify(themeContent(DEFAULT_THEME));
}

/** CSS variables for the app root. Only colors that differ from the defaults are set. */
export function themeVars(colors: ThemeColors): CSSProperties {
  const v: Record<string, string> = {};
  const d = DEFAULT_COLORS;
  if (colors.primary !== d.primary) {
    v["--fo-blue"] = colors.primary;
    v["--fo-blue-600"] = `color-mix(in srgb, ${colors.primary} 86%, #000)`;
    v["--fo-blue-700"] = `color-mix(in srgb, ${colors.primary} 72%, #000)`;
    v["--fo-blue-050"] = `color-mix(in srgb, ${colors.primary} 8%, #fff)`;
    v["--fo-blue-100"] = `color-mix(in srgb, ${colors.primary} 16%, #fff)`;
  }
  if (colors.secondary !== d.secondary) v["--fo-accent"] = colors.secondary;
  if (colors.button !== d.button) {
    v["--fo-btn"] = colors.button;
    v["--fo-btn-600"] = `color-mix(in srgb, ${colors.button} 86%, #000)`;
  }
  if (colors.navActive !== d.navActive) v["--fo-nav-active"] = colors.navActive;
  return v as CSSProperties;
}
