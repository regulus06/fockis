import type { ReactNode } from "react";
import { cx } from "../../utils/format";

/** Page title row with optional description and actions. */
export function PageHeader({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <header className="fm-pagehead">
      <div className="fm-pagehead__text">
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
      {actions && <div className="fm-pagehead__actions">{actions}</div>}
    </header>
  );
}

/** A titled surface. Use for sections, not for every list item. */
export function Panel({ title, description, actions, children, className, flush }: { title?: string; description?: string; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("fm-panel", flush && "is-flush", className)}>
      {(title || actions) && (
        <header className="fm-panel__head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p>{description}</p>}
          </div>
          {actions && <div className="fm-panel__actions">{actions}</div>}
        </header>
      )}
      <div className="fm-panel__body">{children}</div>
    </section>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="fm-toolbar">{children}</div>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="fm-stat">
      <span className="fm-stat__label">{label}</span>
      <span className="fm-stat__value">{value}</span>
      {sub && <span className="fm-stat__sub">{sub}</span>}
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return <div className="fm-statstrip">{children}</div>;
}
