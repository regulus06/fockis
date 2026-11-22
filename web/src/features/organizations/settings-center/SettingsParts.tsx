/**
 * SettingsParts.tsx — small building blocks for Settings & Roles.
 */

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { currencyInfo, currencyLabel, searchCurrencies } from "./currencies";

export function Card({ icon: Icon, title, sub, action, children, className = "" }: { icon?: LucideIcon; title: string; sub?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={"sr-card " + className}>
      <header className="sr-card__head">
        {Icon && (
          <span className="sr-card__icon" aria-hidden="true">
            <Icon />
          </span>
        )}
        <div>
          <h2>{title}</h2>
          {sub && <p>{sub}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Field({ label, required, hint, children }: { label: ReactNode; required?: boolean; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="sr-field">
      <span className="sr-field__label">
        {label}
        {required && <em aria-hidden="true"> *</em>}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

export function Toggle({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={"sr-switch" + (checked ? " is-on" : "")} onClick={() => onChange(!checked)} disabled={disabled}>
      <span />
    </button>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="sr-empty">{children}</p>;
}

/** Searchable single-select dropdown. */
export function Combobox<T>({
  value,
  items,
  getKey,
  render,
  match,
  onChange,
  placeholder,
  disabled,
  ariaLabel,
}: {
  value: string;
  items: T[];
  getKey: (t: T) => string;
  render: (t: T) => ReactNode;
  match: (t: T, q: string) => boolean;
  onChange: (key: string) => void;
  placeholder?: string;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const filtered = useMemo(() => (q ? items.filter((t) => match(t, q.toLowerCase())) : items).slice(0, 200), [items, q, match]);
  const current = items.find((t) => getKey(t) === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function pick(t: T) {
    onChange(getKey(t));
    setOpen(false);
    setQ("");
  }

  return (
    <div className={"sr-combo" + (open ? " is-open" : "")} ref={ref}>
      <button type="button" className="sr-input sr-combo__btn" onClick={() => setOpen((v) => !v)} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
        <span className="sr-combo__value">{current ? render(current) : <span className="sr-muted">{placeholder ?? "Choose…"}</span>}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      {open && (
        <div className="sr-combo__pop">
          <label className="sr-combo__search">
            <Search aria-hidden="true" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(a + 1, filtered.length - 1)));
                if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(a - 1, 0)));
                if (e.key === "Enter" && filtered[active]) (e.preventDefault(), pick(filtered[active]));
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Search…"
              aria-controls={listId}
            />
          </label>
          <ul id={listId} role="listbox" className="sr-combo__list">
            {filtered.length === 0 && <li className="sr-combo__none">No results</li>}
            {filtered.map((t, i) => (
              <li key={getKey(t)} role="option" aria-selected={getKey(t) === value}>
                <button type="button" className={(i === active ? "is-active " : "") + (getKey(t) === value ? "is-on" : "")} onMouseEnter={() => setActive(i)} onClick={() => pick(t)}>
                  {render(t)}
                  {getKey(t) === value && <Check aria-hidden="true" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CurrencyPicker({ value, onChange, disabled, exclude = [], placeholder, ariaLabel }: { value: string; onChange: (code: string) => void; disabled?: boolean; exclude?: string[]; placeholder?: string; ariaLabel: string }) {
  const items = useMemo(() => searchCurrencies("").filter((c) => !exclude.includes(c.code)), [exclude]);
  return (
    <Combobox
      value={value}
      items={items}
      getKey={(c) => c.code}
      render={(c) => (
        <span className="sr-cur">
          <span className="sr-cur__flag" aria-hidden="true">
            {c.flag || "¤"}
          </span>
          {currencyLabel(c.code)}
        </span>
      )}
      match={(c, q) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  );
}

export function CurrencyTags({ codes, locked, onRemove, disabled }: { codes: string[]; locked: string; onRemove: (code: string) => void; disabled?: boolean }) {
  return (
    <ul className="sr-tags">
      {codes.map((c) => (
        <li key={c} className={c === locked ? "is-default" : ""}>
          <span aria-hidden="true">{currencyInfo(c).flag}</span> {currencyLabel(c)}
          {c === locked ? (
            <small>default</small>
          ) : (
            <button type="button" onClick={() => onRemove(c)} disabled={disabled} aria-label={`Remove ${c}`}>
              <X aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
