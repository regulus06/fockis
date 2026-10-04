import type { ReactNode } from "react";
import type { Tone } from "../../utils/labels";
import { cx, formatChange } from "../../utils/format";
import { Icon } from "./Icon";

export function Badge({ tone = "neutral", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={cx("fm-badge", `fm-badge--${tone}`)}>
      {dot && <span className="fm-badge__dot" aria-hidden />}
      {children}
    </span>
  );
}

export function TagChip({ name, color, onRemove }: { name: string; color: string; onRemove?: () => void }) {
  return (
    <span className="fm-tagchip" style={{ ["--chip" as string]: color }}>
      {name}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove tag ${name}`}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}

/** Shows a +/- change. `invert` flips colors when a decrease is good. */
export function Trend({ value, invert }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const flat = value === 0;
  return (
    <span className={cx("fm-trend", flat ? "is-flat" : good ? "is-good" : "is-bad")}>
      {!flat && <Icon name={value > 0 ? "arrowUp" : "arrowDown"} size={12} />}
      {flat ? "No change" : formatChange(value)}
    </span>
  );
}

export function DemoBadge({ label = "Demo data" }: { label?: string }) {
  return (
    <span className="fm-demo" title="This is sample data. Connect the marketing backend to see real results.">
      {label}
    </span>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const parts = name.trim().split(/\s+/);
  const letters = `${parts[0]?.charAt(0) ?? ""}${parts[1]?.charAt(0) ?? ""}`.toUpperCase();
  const hue = Array.from(name).reduce((h, ch) => h + ch.charCodeAt(0), 0) % 360;
  return (
    <span
      className="fm-avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 70% 92%)`, color: `hsl(${hue} 55% 32%)` }}
      aria-hidden
    >
      {letters}
    </span>
  );
}
