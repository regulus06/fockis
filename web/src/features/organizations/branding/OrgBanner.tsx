/**
 * OrgBanner.tsx — the organization header banner of the admin pages
 * (Dashboard, Profile & Locations, Settings & Roles).
 * -----------------------------------------------------------------------------
 * Logo, name, accent line and tagline over the Fockis blue, with the header
 * image (Customize Page → Header) or else the organization cover on the
 * right. Appearance comes from the dashboard theme; the Customize Page
 * preview passes a draft `theme` and local image URLs instead.
 * -----------------------------------------------------------------------------
 */

import type { CSSProperties } from "react";

import { mediaUrl } from "../api/dashboardApi";
import { DASHBOARD_THEME_KEY, themeFrom, type DashboardTheme } from "./dashboardTheme";
import { usePageBranding } from "./usePageBranding";
import "./orgBanner.scss";

export interface OrgBannerProps {
  organizationId: string;
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  /** An already-resolved cover (e.g. a local preview while editing the profile). */
  coverSrc?: string | null;
  /** Preview overrides (Customize Page). */
  theme?: DashboardTheme;
  headerSrc?: string | null;
  logoSrc?: string | null;
  compact?: boolean;
}

export default function OrgBanner({ organizationId, name, tagline, logoUrl, coverUrl, coverSrc, theme: draft, headerSrc, logoSrc, compact }: OrgBannerProps) {
  const branding = usePageBranding(organizationId);
  const theme = draft ?? themeFrom(branding.publishedFor(DASHBOARD_THEME_KEY));
  const logo = logoSrc ?? (logoUrl ? mediaUrl(logoUrl) : null);
  const image =
    theme.headerStyle === "image" ? (headerSrc !== undefined ? headerSrc : theme.headerUrl ? mediaUrl(theme.headerUrl) : coverSrc !== undefined ? coverSrc : mediaUrl(coverUrl ?? null)) : null;
  const style = {
    "--ob-a": String(theme.headerOpacity),
    "--ob-primary": theme.colors.primary,
    "--ob-accent": theme.colors.secondary,
  } as CSSProperties;

  return (
    <div className={`ob ob--${theme.headerStyle}${compact ? " ob--compact" : ""}`} style={style}>
      {image && <div className="ob__photo" style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }} />}
      <div className="ob__inner">
        {logo ? <img className="ob__logo" src={logo} alt="" /> : <span className="ob__logo ob__logo--empty">{name.slice(0, 1)}</span>}
        <div className="ob__text">
          <strong>{name}</strong>
          <i aria-hidden="true" />
          {theme.showTagline && tagline ? <span>{tagline}</span> : null}
        </div>
      </div>
    </div>
  );
}
