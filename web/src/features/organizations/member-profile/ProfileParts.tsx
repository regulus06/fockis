/* Shared building blocks of the member profile dashboard. */

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CircleCheck, CircleAlert, Pencil, X, type LucideIcon } from "lucide-react";

export function Card({
  icon: Icon,
  title,
  action,
  children,
  className = "",
  id,
}: {
  icon: LucideIcon;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section className={`mpf-card ${className}`} aria-labelledby={headingId} id={id}>
      <header className="mpf-card__head">
        <Icon className="mpf-card__icon" aria-hidden="true" />
        <h2 id={headingId}>{title}</h2>
        {action && <div className="mpf-card__action">{action}</div>}
      </header>
      {children}
    </section>
  );
}

export function EditButton({ onClick, label = "Edit", title }: { onClick: () => void; label?: string; title?: string }) {
  return (
    <button type="button" className="mpf-edit" onClick={onClick} aria-label={title}>
      <Pencil aria-hidden="true" /> {label}
    </button>
  );
}

export function Rows({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <dl className={`mpf-rows ${wide ? "mpf-rows--wide" : ""}`}>{children}</dl>;
}

export function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="mpf-row">
      <dt>{label}</dt>
      <dd>{children === "" || children === null || children === undefined ? "—" : children}</dd>
    </div>
  );
}

export function Pill({ tone = "blue", children, icon: Icon, dot = false }: { tone?: "blue" | "green" | "gold" | "amber" | "gray" | "red" | "violet"; children: ReactNode; icon?: LucideIcon; dot?: boolean }) {
  return (
    <span className={`mpf-pill mpf-pill--${tone}`}>
      {dot && <span className="mpf-pill__dot" aria-hidden="true" />}
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  );
}

export function EmptyBox({ icon: Icon, title, text, children, compact = false }: { icon: LucideIcon; title: string; text?: string; children?: ReactNode; compact?: boolean }) {
  return (
    <div className={`mpf-empty ${compact ? "mpf-empty--compact" : ""}`}>
      <Icon className="mpf-empty__icon" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {text && <p>{text}</p>}
        {children && <div className="mpf-empty__actions">{children}</div>}
      </div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  wide = false,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button:not(.mpf-modal__close)");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [busy, onClose]);

  return createPortal(
    <div className="fo mpf-modal" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`mpf-modal__card ${wide ? "mpf-modal__card--wide" : ""}`} ref={ref}>
        <header className="mpf-modal__head">
          <h2>{title}</h2>
          <button type="button" className="mpf-modal__close" onClick={onClose} disabled={busy} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="mpf-modal__body">{children}</div>
        {footer && <footer className="mpf-modal__foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  title,
  body,
  confirmLabel,
  danger = false,
  busy,
  onConfirm,
  onClose,
  children,
}: {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="fo-btn fo-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={`fo-btn ${danger ? "mpf-btn-danger" : "fo-btn--primary"}`} onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="mpf-muted">{body}</p>
      {children}
    </Modal>
  );
}

export function Toast({ message, tone, onClose }: { message: string; tone: "ok" | "error"; onClose: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onClose, tone === "ok" ? 3500 : 7000);
    return () => window.clearTimeout(t);
  }, [message, tone, onClose]);
  return createPortal(
    <div className={`fo mpf-toast mpf-toast--${tone}`} role={tone === "ok" ? "status" : "alert"}>
      {tone === "ok" ? <CircleCheck aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss">
        <X aria-hidden="true" />
      </button>
    </div>,
    document.body,
  );
}

export function Field({ label, children, hint, error, required = false, full = false }: { label: string; children: ReactNode; hint?: string; error?: string; required?: boolean; full?: boolean }) {
  return (
    <label className={`fo-field mpf-field ${full ? "mpf-field--full" : ""}`}>
      <span>
        {label}
        {required && <span className="fo-field__req"> *</span>}
      </span>
      {children}
      {hint && !error && <small>{hint}</small>}
      {error && <small className="mpf-error">{error}</small>}
    </label>
  );
}
