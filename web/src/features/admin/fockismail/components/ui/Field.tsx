import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon } from "./Icon";
import { cx } from "../../utils/format";

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
  className?: string;
  optional?: boolean;
}

export function FieldShell({ label, hint, error, children, className, optional }: FieldShellProps) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className={cx("fm-field", error && "has-error", className)}>
      <label htmlFor={id}>
        {label}
        {optional && <span className="fm-field__optional">Optional</span>}
      </label>
      {children(id, hintId)}
      {(error || hint) && (
        <p id={hintId} className={error ? "fm-field__error" : "fm-field__hint"}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & { label: string; hint?: string; error?: string; optional?: boolean };

export function TextField({ label, hint, error, optional, className, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id, d) => <input id={id} className="fm-input" aria-describedby={d} aria-invalid={Boolean(error) || undefined} {...rest} />}
    </FieldShell>
  );
}

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> & { label: string; hint?: string; error?: string; optional?: boolean };

export function TextArea({ label, hint, error, optional, className, ...rest }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id, d) => <textarea id={id} className="fm-input fm-textarea" aria-describedby={d} aria-invalid={Boolean(error) || undefined} {...rest} />}
    </FieldShell>
  );
}

export interface Option {
  value: string;
  label: string;
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> & { label: string; options: Option[]; hint?: string; error?: string; optional?: boolean };

export function SelectField({ label, options, hint, error, optional, className, ...rest }: SelectFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={className}>
      {(id, d) => (
        <span className="fm-select">
          <select id={id} aria-describedby={d} {...rest}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={15} />
        </span>
      )}
    </FieldShell>
  );
}

/** Compact select without a visible label (for filter bars). */
export function FilterSelect({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <span className="fm-select fm-select--filter">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} />
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label?: string }) {
  return (
    <span className="fm-search">
      <Icon name="search" size={16} />
      <input type="search" value={value} placeholder={placeholder} aria-label={label ?? placeholder} onChange={(e) => onChange(e.target.value)} />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Clear search">
          <Icon name="x" size={14} />
        </button>
      )}
    </span>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <div className="fm-toggle-row">
      <div>
        <label htmlFor={id} className="fm-toggle-row__label">
          {label}
        </label>
        {description && <p className="fm-toggle-row__desc">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} className={cx("fm-switch", checked && "is-on")} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label, indeterminate, hideLabel }: { checked: boolean; onChange: (v: boolean) => void; label: string; indeterminate?: boolean; hideLabel?: boolean }) {
  return (
    <label className={cx("fm-check", hideLabel && "is-bare")}>
      <input
        type="checkbox"
        checked={checked}
        ref={(el) => {
          if (el) el.indeterminate = Boolean(indeterminate);
        }}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={hideLabel ? label : undefined}
      />
      <span className="fm-check__box" aria-hidden>
        <Icon name={indeterminate ? "divider" : "check"} size={12} />
      </span>
      {!hideLabel && <span>{label}</span>}
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FieldShell label={label}>
      {(id) => (
        <span className="fm-color">
          <input id={id} type="color" value={value.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} />
          <input className="fm-input" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} hex value`} />
        </span>
      )}
    </FieldShell>
  );
}

export function RangeField({ label, value, min, max, step = 1, unit = "px", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <FieldShell label={`${label}: ${value}${unit}`}>
      {(id) => <input id={id} type="range" className="fm-range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />}
    </FieldShell>
  );
}
