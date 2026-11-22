/**
 * sidebarBackground.ts
 * -----------------------------------------------------------------------------
 * The organization dashboard sidebar background (Profile & Locations →
 * Branding → Sidebar Appearance). Stored with the existing page branding
 * (MongoDB "organization_page_branding", pageKey "sidebar-background"):
 *   bannerDesktop.url  the uploaded image
 *   bgPosition         top | center | bottom
 *   bgFit              cover | contain
 *   overlay            dark blue gradient on/off
 *   overlayOpacity     0 … 0.9
 * No saved image = the deep navy Fockis sidebar (or the theme sidebar color).
 * -----------------------------------------------------------------------------
 */

import type { CSSProperties } from "react";

import { mediaUrl } from "../api/dashboardApi";
import type { PageBrandingContent } from "./pageBrandingApi";

export const SIDEBAR_BG_KEY = "sidebar-background";
export const SIDEBAR_BG_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const SIDEBAR_BG_MAX_BYTES = 10 * 1024 * 1024;

export interface SidebarBg {
  url: string | null;
  position: "top" | "center" | "bottom";
  fit: "cover" | "contain";
  overlay: boolean;
  opacity: number;
}

export const DEFAULT_SIDEBAR_BG: SidebarBg = { url: null, position: "center", fit: "cover", overlay: true, opacity: 0.6 };

export function sidebarBgFrom(content?: PageBrandingContent | null): SidebarBg {
  if (!content) return { ...DEFAULT_SIDEBAR_BG };
  return {
    url: content.bannerDesktop?.url ?? null,
    position: content.bgPosition ?? "center",
    fit: content.bgFit ?? "cover",
    overlay: content.overlay !== false,
    opacity: typeof content.overlayOpacity === "number" ? content.overlayOpacity : 0.6,
  };
}

export function sidebarBgContent(bg: SidebarBg & { url: string }): PageBrandingContent {
  return {
    bannerDesktop: { url: bg.url },
    showBanner: false,
    bgPosition: bg.position,
    bgFit: bg.fit,
    overlay: bg.overlay,
    overlayOpacity: Math.min(0.9, Math.max(0, Math.round(bg.opacity * 100) / 100)),
    overlayColor: "#061a4a",
  };
}

/**
 * Class + CSS variables for an element showing the sidebar background
 * (`.fo-app__side` or a preview). Without an image the sidebar is the deep
 * navy Fockis gradient (or the organization's sidebar color). `src` is an
 * already-resolved URL (e.g. a local preview); otherwise the saved url is
 * resolved.
 */
export function sidebarBgProps(bg: SidebarBg | null, src?: string | null, color?: string | null): { className: string; style: CSSProperties } {
  const url = src ?? (bg?.url ? mediaUrl(bg.url) : null);
  const vars: Record<string, string> = {};
  if (color && /^#[0-9a-f]{6}$/i.test(color)) vars["--fo-side-color"] = color;
  if (!bg || !url) return { className: "fo-sidebg", style: vars as CSSProperties };
  // With the overlay off, a light gradient still keeps white text readable.
  const a = bg.overlay ? bg.opacity : 0.18;
  const pct = (n: number) => `${Math.round(Math.min(0.95, n) * 100)}%`;
  Object.assign(vars, {
    "--fo-side-img": `url("${url.replace(/"/g, "%22")}")`,
    "--fo-side-pos": bg.position,
    "--fo-side-fit": bg.fit,
    "--fo-side-p1": pct(a + 0.12),
    "--fo-side-p2": pct(a),
    "--fo-side-p3": pct(a + 0.2),
  });
  return { className: "fo-sidebg fo-sidebg--img" + (bg.overlay ? "" : " fo-sidebg--plain"), style: vars as CSSProperties };
}
