import { useState } from "react";
import type { DateRange, DateRangePreset } from "../types/mailchimp.types";
import { Icon } from "./ui/Icon";
import { Popover } from "./ui/Popover";
import { Button } from "./ui/Button";
import { TextField } from "./ui/Field";

const PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "custom", label: "Custom" },
];

export function describeRange(r: DateRange): string {
  if (r.preset === "custom" && r.from && r.to) return `${r.from} – ${r.to}`;
  return PRESETS.find((p) => p.id === r.preset)?.label ?? "Last 30 days";
}

export function DateRangeSelect({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [from, setFrom] = useState(value.from ?? "");
  const [to, setTo] = useState(value.to ?? "");
  const invalid = Boolean(from && to && from > to);

  return (
    <Popover
      id="fm-daterange"
      label="Date range"
      width={280}
      trigger={({ open, toggle, id }) => (
        <button type="button" className="fm-btn fm-btn--secondary fm-btn--md" aria-expanded={open} aria-controls={id} onClick={toggle}>
          <Icon name="calendar" size={16} />
          <span>{describeRange(value)}</span>
          <Icon name="chevronDown" size={14} />
        </button>
      )}
    >
      {(close) => (
        <div className="fm-daterange">
          <div className="fm-daterange__presets" role="radiogroup" aria-label="Date range presets">
            {PRESETS.filter((p) => p.id !== "custom").map((p) => (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={value.preset === p.id}
                className={value.preset === p.id ? "is-active" : undefined}
                onClick={() => {
                  onChange({ preset: p.id });
                  close();
                }}
              >
                {p.label}
                {value.preset === p.id && <Icon name="check" size={14} />}
              </button>
            ))}
          </div>
          <div className="fm-daterange__custom">
            <p>Custom range</p>
            <div className="fm-row">
              <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            {invalid && <p className="fm-field__error">The start date must be before the end date.</p>}
            <Button
              variant="primary"
              size="sm"
              disabled={!from || !to || invalid}
              onClick={() => {
                onChange({ preset: "custom", from, to });
                close();
              }}
            >
              Apply range
            </Button>
          </div>
        </div>
      )}
    </Popover>
  );
}
