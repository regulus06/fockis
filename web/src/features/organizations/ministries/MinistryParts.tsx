/**
 * MinistryParts.tsx
 * Shared visuals for the ministries screens: category icons/colours, status
 * pills, cover art, modal, menu, toast and small form helpers.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Church,
  Coffee,
  Cross,
  Earth,
  Flower2,
  Gift,
  GraduationCap,
  HandHeart,
  HandHelping,
  Heart,
  HeartHandshake,
  Megaphone,
  Mic,
  Music,
  Shield,
  Users,
  UsersRound,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { MINISTRY_STATUS_LABELS } from "./ministriesApi";

export const CATEGORY_VISUALS: Record<string, { icon: LucideIcon; color: string; tint: string }> = {
  worship: { icon: Music, color: "#8b3df5", tint: "#f1e8ff" },
  youth: { icon: Users, color: "#2f6bff", tint: "#e7efff" },
  children: { icon: BookOpen, color: "#f59e0b", tint: "#fff3dc" },
  ushers: { icon: Shield, color: "#334155", tint: "#e9edf3" },
  media: { icon: Video, color: "#2f6bff", tint: "#e7efff" },
  outreach: { icon: HeartHandshake, color: "#10b981", tint: "#e3f8ef" },
  prayer: { icon: HandHeart, color: "#7c3aed", tint: "#efe7ff" },
  womens: { icon: Flower2, color: "#ec4899", tint: "#fde7f3" },
  mens: { icon: UsersRound, color: "#0ea5e9", tint: "#e2f5fd" },
  evangelism: { icon: Megaphone, color: "#ef4444", tint: "#fde8e8" },
  missions: { icon: Earth, color: "#14b8a6", tint: "#e0f7f4" },
  hospitality: { icon: Coffee, color: "#f97316", tint: "#ffeedd" },
  discipleship: { icon: Cross, color: "#6366f1", tint: "#ebebff" },
  music: { icon: Mic, color: "#a855f7", tint: "#f4e9ff" },
  education: { icon: GraduationCap, color: "#0284c7", tint: "#e0f0fb" },
  marriage_family: { icon: Heart, color: "#e11d48", tint: "#fde6eb" },
  pastoral_care: { icon: HandHelping, color: "#0d9488", tint: "#ddf4f1" },
  benevolence: { icon: Gift, color: "#16a34a", tint: "#e2f6e8" },
  other: { icon: Church, color: "#64748b", tint: "#edf1f6" },
};

export function visualFor(category: string, iconKey?: string, color?: string) {
  const base = CATEGORY_VISUALS[iconKey || ""] ?? CATEGORY_VISUALS[category] ?? CATEGORY_VISUALS.other;
  const c = color || base.color;
  return { icon: base.icon, color: c, tint: color ? `${color}1f` : base.tint };
}

export function MinistryIcon({ category, iconKey, color, size = 40 }: { category: string; iconKey?: string; color?: string; size?: number }) {
  const v = visualFor(category, iconKey, color);
  const Icon = v.icon;
  return (
    <span className="mn-icon" style={{ width: size, height: size, background: v.color }}>
      <Icon aria-hidden="true" style={{ width: size * 0.5, height: size * 0.5 }} />
    </span>
  );
}

export function MinistryCover({ photoUrl, category, iconKey, color, className = "" }: { photoUrl: string | null; category: string; iconKey?: string; color?: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  const src = mediaUrl(photoUrl);
  const v = visualFor(category, iconKey, color);
  const Icon = v.icon;
  if (src && !broken) return <img className={"mn-cover " + className} src={src} alt="" loading="lazy" onError={() => setBroken(true)} />;
  return (
    <div className={"mn-cover mn-cover--art " + className} style={{ background: `linear-gradient(135deg, ${v.color} 0%, ${v.color}b3 55%, ${v.color}66 100%)` }} aria-hidden="true">
      <Icon />
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`mn-pill mn-pill--${status}`}>{MINISTRY_STATUS_LABELS[status] ?? status}</span>;
}

export function Tone({ tone, children }: { tone: "green" | "amber" | "red" | "blue" | "gray" | "purple"; children: ReactNode }) {
  return <span className={`mn-tone mn-tone--${tone}`}>{children}</span>;
}

export function PersonAvatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const url = mediaUrl(src ?? null);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className="mn-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {url && !broken ? <img src={url} alt="" onError={() => setBroken(true)} /> : initials || "?"}
    </span>
  );
}

/* ------------------------------------------------------------------ modal */

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  busy?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, busy]);

  return createPortal(
    <div className="mn-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className={"mn-modal" + (wide ? " mn-modal--wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mn-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="mn-iconbtn" onClick={onClose} aria-label="Close" disabled={busy}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="mn-modal__body">{children}</div>
        {footer && <div className="mn-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, children, required = false }: { label: string; hint?: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="mn-field">
      <span className="mn-field__label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/* ------------------------------------------------------------------- menu */

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  divider?: boolean;
}

export function DotsMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    const r = btn.current?.getBoundingClientRect();
    if (r) {
      const width = 220;
      const height = items.length * 38 + 16;
      const top = r.bottom + 6 + height > window.innerHeight ? Math.max(8, r.top - height - 6) : r.bottom + 6;
      setPos({ top, left: Math.min(window.innerWidth - width - 8, Math.max(8, r.right - width)) });
    }
    setOpen((o) => !o);
  }

  return (
    <>
      <button ref={btn} type="button" className="mn-dots" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
        <span />
        <span />
        <span />
      </button>
      {open &&
        pos &&
        createPortal(
          <div className="mn-menu-layer" onMouseDown={() => setOpen(false)}>
            <div className="mn-menu" role="menu" style={{ top: pos.top, left: pos.left }} onMouseDown={(e) => e.stopPropagation()}>
              {items.map((it) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  className={"mn-menu__item" + (it.danger ? " is-danger" : "") + (it.divider ? " has-divider" : "")}
                  onClick={() => {
                    setOpen(false);
                    it.onSelect();
                  }}
                >
                  <it.icon aria-hidden="true" /> {it.label}
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ toast */

export function useToast() {
  const [toast, setToast] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);
  const node = toast
    ? createPortal(
        <div className={"mn-toast mn-toast--" + toast.tone} role="status">
          {toast.text}
        </div>,
        document.body,
      )
    : null;
  return { show: (tone: "ok" | "error", text: string) => setToast({ tone, text }), node };
}

/* --------------------------------------------------------------- helpers */

export function fmtDate(iso?: string | null, withTime = false) {
  if (!iso) return "";
  // Date-only values ("2026-12-01") are calendar dates, not UTC midnights.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, withTime ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" });
}

export function money(n: number | null | undefined, currency = "USD") {
  if (n == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function SkeletonCards({ count = 8 }: { count?: number }) {
  return (
    <div className="mn-grid" aria-busy="true" aria-label="Loading ministries">
      {Array.from({ length: count }).map((_, i) => (
        <div className="mn-card mn-card--skeleton" key={i}>
          <div className="mn-sk mn-sk--cover" />
          <div className="mn-card__body">
            <div className="mn-sk" style={{ width: "70%", height: 16 }} />
            <div className="mn-sk" style={{ width: "92%", height: 11 }} />
            <div className="mn-sk" style={{ width: "50%", height: 11 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="mn-empty">
      <span className="mn-empty__icon">
        <Icon aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
