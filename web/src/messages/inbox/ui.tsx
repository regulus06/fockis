import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, CheckCheck, Clock, Users, X } from "lucide-react";

import { buildMediaUrl } from "../../utils/fockisFeedHelpers";
import type { InboxConversation, InboxUser } from "./inboxApi";
import { useInbox } from "./inboxStore";

/* ============================================================================
   SHARED INBOX UI PIECES
============================================================================ */

export const mediaUrl = (url?: string) => (url ? (/^(blob:|data:)/.test(url) ? url : buildMediaUrl(url)) : "");

export function initials(name = "") {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "F"
  );
}

export function Avatar({
  name,
  src,
  size = 48,
  online,
  group,
}: {
  name: string;
  src?: string;
  size?: number;
  online?: boolean;
  group?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const url = mediaUrl(src);
  useEffect(() => setBroken(false), [url]);
  return (
    <span className={`fki-avatar ${group ? "is-group" : ""}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>
      {url && !broken ? (
        <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : group ? (
        <Users size={Math.round(size * 0.46)} aria-hidden="true" />
      ) : (
        initials(name)
      )}
      {online && <i className="fki-avatar__dot" aria-label="Online" />}
    </span>
  );
}

export function conversationTitle(c: InboxConversation) {
  if (c.isGroup) return c.groupName || c.members?.map((m) => m.name.split(" ")[0]).join(", ") || "Group";
  return c.otherUser?.name || "Fockis user";
}

export function usePresence(user?: InboxUser) {
  const live = useInbox((s) => (user?.id ? s.presence[user.id] : undefined));
  return live ?? (user ? { presence: user.presence ?? "offline", lastSeen: user.lastSeen } : undefined);
}

export function lastSeenText(presence?: { presence: string; lastSeen?: string }) {
  if (!presence) return "";
  if (presence.presence === "online") return "Online";
  if (!presence.lastSeen) return "Offline";
  const d = new Date(presence.lastSeen);
  if (Number.isNaN(d.getTime())) return "Offline";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Last seen just now";
  if (mins < 60) return `Last seen ${mins} min ago`;
  if (isToday(d)) return `Last seen today at ${clock(d)}`;
  if (isYesterday(d)) return `Last seen yesterday at ${clock(d)}`;
  return `Last seen ${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isToday = (d: Date) => sameDay(d, new Date());
export const isYesterday = (d: Date) => sameDay(d, new Date(Date.now() - 86_400_000));
export const clock = (d: Date) => d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** 10:24 · Yesterday · Mon · 28 Oct */
export function listTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return clock(d);
  if (isYesterday(d)) return "Yesterday";
  if (Date.now() - d.getTime() < 6 * 86_400_000) return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function dayLabel(iso: string) {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function Ticks({ status }: { status?: string }) {
  if (status === "sending") return <Clock className="fki-ticks" size={13} aria-label="Sending" />;
  if (status === "read") return <CheckCheck className="fki-ticks is-read" size={16} aria-label="Read" />;
  if (status === "delivered") return <CheckCheck className="fki-ticks" size={16} aria-label="Delivered" />;
  if (status === "sent") return <Check className="fki-ticks" size={15} aria-label="Sent" />;
  return null;
}

export function Badge({ count, muted }: { count: number; muted?: boolean }) {
  if (!count) return null;
  return <span className={`fki-badge ${muted ? "is-muted" : ""}`}>{count > 99 ? "99+" : count}</span>;
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, button:not(.fki-modal__close)")?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fki-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className={`fki-modal ${wide ? "is-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="fki-modal__head">
          <h2>{title}</h2>
          <button type="button" className="fki-icon-btn fki-modal__close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="fki-modal__body">{children}</div>
        {footer && <footer className="fki-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

export function Confirm({
  title,
  body,
  confirmLabel,
  danger,
  onConfirm,
  onClose,
  extra,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void | Promise<unknown>;
  onClose: () => void;
  extra?: ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="fki-btn fki-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          {extra}
          <button
            type="button"
            className={`fki-btn ${danger ? "fki-btn--danger" : "fki-btn--primary"}`}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
              } finally {
                setBusy(false);
                onClose();
              }
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="fki-confirm">{body}</div>
    </Modal>
  );
}

export function Skeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="fki-skeleton" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="fki-skeleton__row">
          <span className="fki-skeleton__avatar" />
          <span className="fki-skeleton__lines">
            <i style={{ width: `${55 + ((i * 13) % 30)}%` }} />
            <i style={{ width: `${35 + ((i * 17) % 40)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="fki-empty">
      <span className="fki-empty__icon">{icon}</span>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [ref, onOutside, active]);
}
