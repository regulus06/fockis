import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/** Small shared building blocks for the redesigned Academy content pages. */

export function SectionHead({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="fa-shead">
      <div>
        {eyebrow && <span className="fa-shead__eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/** Loading / error / empty line in the new style (never shows fake data). */
export function StateLine({ loading, error, empty, onRetry }: { loading?: boolean; error?: boolean | string; empty?: boolean; onRetry?: () => void }) {
  if (loading)
    return (
      <div className="fa-state">
        <span className="fa-spin" /> Loading…
      </div>
    );
  if (error)
    return (
      <div className="fa-state fa-state--err" role="alert">
        Couldn&apos;t load this section right now.{typeof error === "string" ? ` ${error}` : ""}
        {onRetry && (
          <button className="fa-link" onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  if (empty) return <div className="fa-state">Nothing here yet — check back soon.</div>;
  return null;
}

const ICONS = ["cap", "book", "briefcase", "users", "award", "globe", "shield", "chart", "heart", "palette", "cpu", "layers"];
const TONES = ["blue", "purple", "green", "amber", "red", "sky"];

/** A card with a tinted icon, title and optional text — the design board's feature tile. */
export function FeatureCard({ title, text, index = 0, icon, children }: { title: string; text?: string; index?: number; icon?: string; children?: ReactNode }) {
  return (
    <div className="fa-card fa-feature">
      <span className={`fa-stat__ic tone-${TONES[index % TONES.length]}`}>
        <Icon name={icon ?? ICONS[index % ICONS.length]} size={18} />
      </span>
      <b>{title}</b>
      {text && <p>{text}</p>}
      {children}
    </div>
  );
}

export function FaAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="fa-acc">
      {items.map((it, i) => (
        <div key={it.q + i} className={`fa-acc__item ${open === i ? "is-open" : ""}`}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {it.q}
            <Icon name="chevron" size={16} />
          </button>
          {open === i && <div className="fa-acc__body">{it.a}</div>}
        </div>
      ))}
    </div>
  );
}

export function FaModal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fa-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="fa-card fa-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="fa-cardhead">
          <h4>{title}</h4>
          <button type="button" className="fa-icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Loosely typed CMS content item (academy/content/:section). */
export type CmsItem = { _id?: string; title: string; description?: string; meta?: Record<string, string | undefined> };
export const asItems = (items: unknown): CmsItem[] => (Array.isArray(items) ? (items as CmsItem[]).filter((i) => i && typeof i.title === "string") : []);
