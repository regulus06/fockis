import { useRef } from "react";
import { cx } from "../../utils/format";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  count?: number;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: "line" | "pill";
}

/** WAI-ARIA tablist with arrow-key navigation. */
export function Tabs<T extends string>({ items, value, onChange, label, variant = "line" }: TabsProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = items.findIndex((t) => t.id === value);
    const next = items[(i + (e.key === "ArrowRight" ? 1 : -1) + items.length) % items.length];
    onChange(next.id);
    window.requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus());
  };
  return (
    <div ref={ref} className={cx("fm-tabs", `fm-tabs--${variant}`)} role="tablist" aria-label={label} onKeyDown={onKey}>
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          data-tab={t.id}
          aria-selected={t.id === value}
          tabIndex={t.id === value ? 0 : -1}
          className={cx("fm-tab", t.id === value && "is-active")}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span className="fm-tab__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Two-to-four option toggle (e.g., desktop/mobile). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: Array<{ id: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="fm-segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          className={cx(o.id === value && "is-active")}
          onClick={() => onChange(o.id)}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
