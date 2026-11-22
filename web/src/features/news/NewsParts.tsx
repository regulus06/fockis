/**
 * NewsParts.tsx — shared building blocks for Fockis News & Media pages.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { BadgeCheck, Bell, BellOff, Check, ChevronDown, Loader2, Newspaper, UserPlus, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { getToken } from "../../utils/auth";
import { CATEGORY_LABELS, FOLLOW_PREF_LABELS, articlePath, compact, initials, newsApi, newsError, timeAgo, type ArticleCard, type OutletRef, type Prefs } from "./newsApi";

export const signedIn = () => Boolean(getToken());

export function loginPath(back?: string) {
  const to = back ?? (typeof window !== "undefined" ? window.location.pathname + window.location.search : "/news");
  return `/login?returnTo=${encodeURIComponent(to)}`;
}

/* ---------------------------------------------------------------- toast */

export function useToast() {
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);
  const node = toast
    ? createPortal(
        <div className={`nm-toast nm-toast--${toast.tone}`} role="status">
          {toast.text}
        </div>,
        document.body,
      )
    : null;
  return { show: (tone: "ok" | "error", text: string) => setToast({ tone, text }), node };
}

/* ---------------------------------------------------------------- logo & badges */

export function OutletLogo({ outlet, size = 40 }: { outlet: Pick<OutletRef, "name" | "logoUrl">; size?: number }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className="nm-logo" style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}>
      {outlet.logoUrl && !broken ? <img src={outlet.logoUrl} alt="" onError={() => setBroken(true)} /> : <span>{initials(outlet.name) || "N"}</span>}
    </span>
  );
}

export function Verified({ size = 16 }: { size?: number }) {
  return <BadgeCheck className="nm-verified" width={size} height={size} aria-label="Verified media" />;
}

export function CategoryTag({ category, solid = false }: { category: string; solid?: boolean }) {
  return <span className={`nm-cat${solid ? " nm-cat--solid" : ""}`} data-cat={category}>{CATEGORY_LABELS[category] ?? category}</span>;
}

export function Thumb({ src, alt = "", className = "" }: { src: string; alt?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span className={`nm-thumb ${className}`}>
      {src && !broken ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="nm-thumb__ph" aria-hidden="true">
          <Newspaper />
        </span>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------- article teasers */

export function ArticleMeta({ a, views = true }: { a: ArticleCard; views?: boolean }) {
  return (
    <span className="nm-meta">
      {a.outlet && (
        <>
          <span className="nm-meta__outlet">
            {a.outlet.name}
            {a.outlet.verified && <Verified size={13} />}
          </span>
          <span aria-hidden="true">·</span>
        </>
      )}
      <span>{timeAgo(a.publishedAt)}</span>
      {views && a.views > 0 && (
        <>
          <span aria-hidden="true">·</span>
          <span>{compact(a.views)} views</span>
        </>
      )}
    </span>
  );
}

export function ArticleRowItem({ a, compactRow = false }: { a: ArticleCard; compactRow?: boolean }) {
  return (
    <Link to={articlePath(a)} className={`nm-row${compactRow ? " nm-row--compact" : ""}`}>
      <Thumb src={a.imageUrl} className="nm-row__img" />
      <span className="nm-row__text">
        <CategoryTag category={a.category} />
        <b>{a.headline}</b>
        <ArticleMeta a={a} views={!compactRow} />
      </span>
    </Link>
  );
}

export function ArticleTile({ a, size = "md" }: { a: ArticleCard; size?: "sm" | "md" | "lg" }) {
  return (
    <Link to={articlePath(a)} className={`nm-tile nm-tile--${size}`}>
      <span className="nm-tile__media">
        <Thumb src={a.imageUrl} />
        <span className="nm-tile__badge">
          <CategoryTag category={a.category} solid />
        </span>
        {a.isBreaking && <span className="nm-breaking-dot">Breaking</span>}
      </span>
      <span className="nm-tile__body">
        <b>{a.headline}</b>
        {size !== "sm" && a.excerpt && <span className="nm-tile__excerpt">{a.excerpt}</span>}
        <ArticleMeta a={a} />
        {a.sponsored && <span className="nm-sponsored">Sponsored</span>}
      </span>
    </Link>
  );
}

/* ---------------------------------------------------------------- empty / loading */

export function Empty({ icon: Icon = Newspaper, title, text, action }: { icon?: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="nm-empty">
      <span className="nm-empty__icon" aria-hidden="true">
        <Icon />
      </span>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ h = 120, className = "" }: { h?: number; className?: string }) {
  return <span className={`nm-sk ${className}`} style={{ height: h }} aria-hidden="true" />;
}

export function SectionHead({ title, to, icon: Icon, label = "See all" }: { title: string; to?: string; icon?: LucideIcon; label?: string }) {
  return (
    <header className="nm-sechead">
      <h2>
        {Icon && <Icon aria-hidden="true" />}
        {title}
      </h2>
      {to && (
        <Link to={to} className="nm-seemore">
          {label} →
        </Link>
      )}
    </header>
  );
}

/* ---------------------------------------------------------------- modal */

export function Modal({ title, subtitle, onClose, children, footer, wide = false, busy = false }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean; busy?: boolean }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);
  return createPortal(
    <div className="nm-modal" role="presentation" onMouseDown={(ev) => ev.target === ev.currentTarget && !busy && onClose()}>
      <div ref={ref} className={`nm-modal__box${wide ? " nm-modal__box--wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="nm-iconbtn" onClick={onClose} disabled={busy} aria-label="Close">
            <X />
          </button>
        </header>
        <div className="nm-modal__body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="nm-field">
      <span className="nm-field__label">
        {label}
        {required && <i aria-hidden="true"> *</i>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/* ---------------------------------------------------------------- follow */

/**
 * Follow / Following menu with per-category notification switches.
 * Following does not turn everything on (only Breaking News by default).
 */
export function FollowControl({
  outletId,
  outletName,
  initial,
  onChange,
  size = "md",
  withBell = false,
  icon = false,
  notify,
}: {
  outletId: string;
  outletName: string;
  initial: { isFollowing: boolean; muted?: boolean; prefs?: Prefs };
  onChange?: (following: boolean) => void;
  size?: "sm" | "md";
  withBell?: boolean;
  /** Show a person-plus icon on the Follow button. */
  icon?: boolean;
  notify?: (tone: "ok" | "error", text: string) => void;
}) {
  const [state, setState] = useState({ isFollowing: initial.isFollowing, muted: Boolean(initial.muted), prefs: initial.prefs ?? {} });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => setState({ isFollowing: initial.isFollowing, muted: Boolean(initial.muted), prefs: initial.prefs ?? {} }), [initial.isFollowing, initial.muted, initial.prefs]);
  useEffect(() => {
    if (!open) return;
    const off = (ev: MouseEvent) => box.current && !box.current.contains(ev.target as Node) && setOpen(false);
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);

  async function run(fn: () => Promise<{ isFollowing: boolean; muted: boolean; prefs: Prefs }>, okText?: string) {
    if (!signedIn()) {
      window.location.assign(loginPath());
      return;
    }
    setBusy(true);
    try {
      const next = await fn();
      setState(next);
      onChange?.(next.isFollowing);
      if (okText) notify?.("ok", okText);
    } catch (err) {
      notify?.("error", newsError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!state.isFollowing) {
    return (
      <button type="button" className={`nm-btn nm-btn--follow nm-btn--${size}`} disabled={busy} onClick={() => run(() => newsApi.follow(outletId), `You follow ${outletName}. Choose your notifications from the bell.`)}>
        {busy ? <Loader2 className="nm-spin" /> : icon ? <UserPlus /> : null} Follow
      </button>
    );
  }
  const anyOn = Object.values(state.prefs).some(Boolean);
  return (
    <div className="nm-follow" ref={box}>
      {withBell && (
        <button type="button" className="nm-iconbtn nm-iconbtn--ring" aria-label="Notification settings" onClick={() => setOpen((v) => !v)}>
          {state.muted || !anyOn ? <BellOff /> : <Bell />}
        </button>
      )}
      <button type="button" className={`nm-btn nm-btn--following nm-btn--${size}`} aria-expanded={open} onClick={() => setOpen((v) => !v)} disabled={busy}>
        {busy ? <Loader2 className="nm-spin" /> : <Check />} Following <ChevronDown />
      </button>
      {open && (
        <div className="nm-follow__menu" role="dialog" aria-label={`Notifications from ${outletName}`}>
          <b>Notifications from {outletName}</b>
          <p>Choose what you want to hear about. Your global Fockis notification settings still apply.</p>
          <ul>
            {FOLLOW_PREF_LABELS.map(([key, label]) => (
              <li key={key}>
                <span>{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(state.prefs[key])}
                  className={`nm-switch${state.prefs[key] ? " is-on" : ""}`}
                  disabled={busy || state.muted}
                  onClick={() => run(() => newsApi.setPrefs(outletId, { prefs: { [key]: !state.prefs[key] } }))}
                >
                  <span />
                </button>
              </li>
            ))}
          </ul>
          <div className="nm-follow__actions">
            <button type="button" className="nm-link" disabled={busy} onClick={() => run(() => newsApi.setPrefs(outletId, { all: true }), "All notifications on.")}>
              Enable all
            </button>
            <button type="button" className="nm-link" disabled={busy} onClick={() => run(() => newsApi.setPrefs(outletId, { all: false }), "All notifications off.")}>
              Disable all
            </button>
            <button type="button" className="nm-link" disabled={busy} onClick={() => run(() => newsApi.setPrefs(outletId, { muted: !state.muted }), state.muted ? "Unmuted." : `${outletName} is muted.`)}>
              {state.muted ? "Unmute" : "Mute"}
            </button>
            <button
              type="button"
              className="nm-link nm-link--danger"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                void run(() => newsApi.unfollow(outletId), `You unfollowed ${outletName}.`);
              }}
            >
              Unfollow
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function OutletLine({ o, right }: { o: OutletRef & { followerCount?: number }; right?: ReactNode }) {
  return (
    <div className="nm-outletline">
      <Link to={`/news/${o.slug}`} className="nm-outletline__who">
        <OutletLogo outlet={o} size={42} />
        <span>
          <b>
            {o.name}
            {o.verified && <Verified size={15} />}
          </b>
          {o.followerCount !== undefined && <small>{compact(o.followerCount)} followers</small>}
        </span>
      </Link>
      {right}
    </div>
  );
}
