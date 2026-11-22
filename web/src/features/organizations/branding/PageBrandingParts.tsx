/**
 * PageBrandingParts.tsx
 * -----------------------------------------------------------------------------
 * Display pieces used by every sidebar and page:
 *   <PageThumb>   the sidebar thumbnail (falls back to the page's icon)
 *   <PageBanner>  the page banner (desktop + mobile image, overlay, text, logo)
 * -----------------------------------------------------------------------------
 */

import type { LucideIcon } from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { ratioOf } from "./cropImage";
import type { PageBrandingContent } from "./pageBrandingApi";
import "./pageBranding.scss";

export function PageThumb({
  content,
  icon: Icon,
  size = 24,
  className,
}: {
  content?: PageBrandingContent | null;
  icon?: LucideIcon | null;
  /** Height in px; the width follows the thumbnail's aspect ratio. */
  size?: number;
  className?: string;
}): React.JSX.Element | null {
  const t = content?.thumbnail;
  const src = t?.url ? mediaUrl(t.url) : null;
  if (!src) return Icon ? <Icon aria-hidden="true" /> : null;
  const r = ratioOf(t?.aspect);
  const h = r < 1 ? Math.round(size * 1.15) : r > 1.5 ? Math.round(size * 0.9) : size;
  const w = Math.round(h * r);
  return (
    <img
      className={["pb-thumb", `pb-thumb--${t?.shape ?? "rounded"}`, className ?? ""].filter(Boolean).join(" ")}
      src={src}
      alt=""
      aria-hidden="true"
      width={w}
      height={h}
      style={{ width: w, height: h }}
      loading="lazy"
      decoding="async"
    />
  );
}

/** True when this content would actually show a banner. */
export function hasBanner(content?: PageBrandingContent | null): boolean {
  return Boolean(content?.showBanner && (content.bannerDesktop?.url || content.bannerMobile?.url));
}

export function PageBanner({
  content,
  fallbackTitle,
  mode = "auto",
  placeholder = false,
}: {
  content?: PageBrandingContent | null;
  fallbackTitle?: string;
  /** Force one layout (used by the editor preview). */
  mode?: "auto" | "desktop" | "mobile";
  /** Show an empty frame instead of nothing (editor preview). */
  placeholder?: boolean;
}): React.JSX.Element | null {
  const c = content ?? {};
  const desktop = mediaUrl(c.bannerDesktop?.url ?? c.bannerMobile?.url ?? null);
  const mobile = mediaUrl(c.bannerMobile?.url ?? c.bannerDesktop?.url ?? null);
  if (!placeholder && !hasBanner(c)) return null;
  const logo = c.logo?.url ? mediaUrl(c.logo.url) : null;
  const title = c.title ?? fallbackTitle;
  const cls = [
    "pb-banner",
    `pb-banner--${c.bannerHeight ?? "medium"}`,
    `pb-banner--${c.textAlign ?? "left"}`,
    mode !== "auto" ? `pb-banner--force-${mode}` : "",
    !desktop ? "pb-banner--empty" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <section className={cls} aria-label={title ? `${title} banner` : "Page banner"}>
      {desktop &&
        (mode === "auto" ? (
          <picture>
            {mobile && <source media="(max-width: 640px)" srcSet={mobile} />}
            <img className="pb-banner__img" src={desktop} alt="" />
          </picture>
        ) : (
          <img className="pb-banner__img" src={(mode === "mobile" ? mobile : desktop) ?? ""} alt="" />
        ))}
      {desktop && (
        <div
          className="pb-banner__overlay"
          style={{ background: c.overlayColor ?? "#000000", opacity: c.overlayOpacity ?? 0.35 }}
          aria-hidden="true"
        />
      )}
      {!desktop && <div className="pb-banner__hint">No banner image yet</div>}
      {(title || c.subtitle || c.description || logo) && desktop && (
        <div className="pb-banner__body">
          {logo && <img className={`pb-banner__logo pb-thumb--${c.logo?.shape ?? "rounded"}`} src={logo} alt="" />}
          <div className="pb-banner__text">
            {title && <h1 className="pb-banner__title">{title}</h1>}
            {c.subtitle && <p className="pb-banner__subtitle">{c.subtitle}</p>}
            {c.description && <p className="pb-banner__desc">{c.description}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
