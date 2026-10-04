import { Icon } from "./ui/Icon";
import { cx } from "../utils/format";

export interface Choice<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface Props<T extends string> {
  label: string;
  choices: Choice<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  multiple?: boolean;
  columns?: 2 | 3 | 4;
  error?: string;
}

/** Large tap targets for single/multi selection. Works well on phones. */
export function ChoiceCards<T extends string>({ label, choices, value, onChange, multiple = true, columns = 3, error }: Props<T>) {
  const toggle = (v: T) => {
    if (!multiple) return onChange([v]);
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <fieldset className={cx("fm-choices", `is-cols-${columns}`, error && "has-error")}>
      <legend>{label}{multiple && <span className="fm-field__optional"> Choose all that apply</span>}</legend>
      <div className="fm-choices__grid" role={multiple ? "group" : "radiogroup"}>
        {choices.map((c) => {
          const on = value.includes(c.value);
          return (
            <button
              key={c.value}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              className={cx("fm-choice", on && "is-on", Boolean(c.description) && "has-desc")}
              onClick={() => toggle(c.value)}
            >
              <span className={cx("fm-choice__mark", !multiple && "is-radio")} aria-hidden>{on && <Icon name="check" size={12} />}</span>
              <span className="fm-choice__text">
                <strong>{c.label}</strong>
                {c.description && <span>{c.description}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="fm-field__error">{error}</p>}
    </fieldset>
  );
}
