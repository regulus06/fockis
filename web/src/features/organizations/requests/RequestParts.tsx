/* Small shared pieces of the Requests & Inquiries dashboard. */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  CircleCheck,
  CircleHelp,
  Droplet,
  Gem,
  Globe,
  HandHeart,
  HeartHandshake,
  IdCard,
  Info,
  MessageSquare,
  Network,
  UsersRound,
  X,
  type LucideIcon,
  LifeBuoy,
  Handshake,
} from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { PRIORITY_LABEL, STATUS_SHORT, type RequestPriority, type RequestStatus, type RequestType } from "./requestsApi";

export const TYPE_ICON: Record<RequestType, LucideIcon> = {
  prayer: HandHeart,
  visit: CalendarDays,
  counseling: MessageSquare,
  general: Info,
  volunteer: UsersRound,
  membership: IdCard,
  baptism: Droplet,
  marriage: Gem,
  event: CalendarCheck,
  ministry: Network,
  pastoral_support: HeartHandshake,
  assistance: LifeBuoy,
  meeting: Handshake,
  other: CircleHelp,
};

const AVATAR_TONES = ["#dbeafe:#1d4ed8", "#fce7f3:#be185d", "#dcfce7:#15803d", "#ede9fe:#6d28d9", "#ffedd5:#c2410c", "#e0f2fe:#0369a1"];

export function initials(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function RqAvatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const src = mediaUrl(url);
  const [broken, setBroken] = useState(false);
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, fg] = AVATAR_TONES[hash % AVATAR_TONES.length].split(":");
  return (
    <span className="rq-avatar" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.36 }} aria-hidden="true">
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  );
}

export function RequesterBadge({ type }: { type: "member" | "public" }) {
  return type === "member" ? (
    <span className="rq-who rq-who--member">
      <IdCard aria-hidden="true" /> Member
    </span>
  ) : (
    <span className="rq-who rq-who--public">
      <CircleCheck aria-hidden="true" /> Public
    </span>
  );
}

export function StatusPill({ status, overdue = false }: { status: RequestStatus; overdue?: boolean }) {
  return (
    <span className={`rq-status rq-status--${status}`}>
      {status === "resolved" ? <Check aria-hidden="true" /> : <span className="rq-status__dot" aria-hidden="true" />}
      {STATUS_SHORT[status]}
      {overdue && <span className="rq-status__late">Overdue</span>}
    </span>
  );
}

export function PriorityPill({ priority }: { priority: RequestPriority }) {
  return (
    <span className={`rq-priority rq-priority--${priority}`}>
      <span className="rq-priority__ring" aria-hidden="true" />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function TypeLabel({ type, label }: { type: RequestType; label: string }) {
  const Icon = TYPE_ICON[type] ?? CircleHelp;
  return (
    <span className="rq-type">
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

export function PublicIcon() {
  return <Globe aria-hidden="true" />;
}

/* ------------------------------------------------------------------ menu */

export interface MenuItem {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

export function RowMenu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean }>({ top: 0, left: 0, up: false });
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const scroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>("button")?.focus();
  }, [open]);

  const toggle = () => {
    const r = btn.current?.getBoundingClientRect();
    if (r) {
      const up = r.bottom + 320 > window.innerHeight;
      setPos({ top: up ? r.top - 6 : r.bottom + 6, left: Math.max(8, r.right - 220), up });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button ref={btn} type="button" className="rq-dots" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={(e) => { e.stopPropagation(); toggle(); }}>
        <span aria-hidden="true">•••</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={list}
            className={`rq-menu ${pos.up ? "is-up" : ""}`}
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {items
              .filter((i) => !i.hidden)
              .map((i) => (
                <button
                  key={i.label}
                  type="button"
                  role="menuitem"
                  disabled={i.disabled}
                  className={i.danger ? "is-danger" : ""}
                  onClick={() => {
                    setOpen(false);
                    i.onSelect();
                  }}
                >
                  <i.icon aria-hidden="true" />
                  {i.label}
                </button>
              ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/* ------------------------------------------------------------------ modal */

export function RqModal({
  title,
  onClose,
  children,
  footer,
  size = "md",
  busy = false,
  subtitle,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  busy?: boolean;
  subtitle?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button:not(.rq-modal__x)")?.focus();
    const key = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, [busy, onClose]);
  return createPortal(
    <div className="rq-modal" role="dialog" aria-modal="true">
      <div className={`rq-modal__card rq-modal__card--${size}`} ref={ref}>
        <header className="rq-modal__head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="rq-modal__x" onClick={onClose} disabled={busy} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="rq-modal__body">{children}</div>
        {footer && <footer className="rq-modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function RqToast({ text, tone, onClose }: { text: string; tone: "ok" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, tone === "ok" ? 3500 : 7000);
    return () => window.clearTimeout(t);
  }, [text, tone, onClose]);
  return createPortal(
    <div className={`rq-toast rq-toast--${tone}`} role={tone === "ok" ? "status" : "alert"}>
      {tone === "ok" ? <CircleCheck aria-hidden="true" /> : <Info aria-hidden="true" />}
      <span>{text}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss">
        <X aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}
