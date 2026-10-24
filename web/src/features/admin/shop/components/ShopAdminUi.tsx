import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";

/* Small shared building blocks for the Marketplace (Shop admin) pages. */

export interface RowAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  icon?: ReactNode;
}

export function RowActionMenu({ label, actions, busy }: { label: string; actions: RowAction[]; busy?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="fk-menu-wrap" ref={ref}>
      <button
        type="button"
        className="fk-icon-action"
        aria-label={`Actions for ${label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {open && (
        <div className="fk-menu" role="menu">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              className={`fk-menu__item${action.danger ? " fk-menu__item--danger" : ""}`}
              onClick={() => {
                setOpen(false);
                action.onSelect();
              }}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = String(status || "unknown").toLowerCase();
  const variant =
    key === "active" || key === "approved" || key === "open"
      ? "success"
      : key === "pending" || key === "changes_requested"
        ? "warning"
        : key === "flagged" || key === "blocked" || key === "rejected" || key === "suspended"
          ? "danger"
          : key === "inactive"
            ? "neutral"
            : "info";
  const text = key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  return <span className={`fk-badge fk-badge--${variant}`}>{text}</span>;
}

export function ShopTableState({
  loading,
  error,
  empty,
  emptyText,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
  emptyText: string;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (error) {
    return (
      <div className="fk-state fk-state--compact" role="alert">
        <h3>Couldn&apos;t load this list</h3>
        <p>{error}</p>
        <button type="button" className="fk-btn fk-btn--sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="fk-state fk-state--compact" role="status">
        <div className="fk-spinner" />
        <p>Loading…</p>
      </div>
    );
  }
  if (empty) {
    return (
      <div className="fk-state fk-state--compact">
        <p>{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
}
