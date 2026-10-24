import { useRef } from "react";
import type { KeyboardEvent } from "react";

import type { BillingInterval } from "../types/subscriptionTypes";

import "../styles/BillingIntervalSelector.scss";

interface Props {
  value: BillingInterval;
  onChange: (value: BillingInterval) => void;
  disabled?: boolean;
  /**
   * Largest real yearly saving computed from backend prices.
   * The "Save" badge only renders when this is a positive number.
   */
  yearlySavingsPercent?: number | null;
  label?: string;
}

const OPTIONS: { value: BillingInterval; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

export default function BillingIntervalSelector({
  value,
  onChange,
  disabled = false,
  yearlySavingsPercent = null,
  label = "Billing interval",
}: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"];
    if (!keys.includes(event.key) || disabled) return;

    event.preventDefault();

    const index = OPTIONS.findIndex((option) => option.value === value);
    let next = index;

    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = OPTIONS.length - 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + OPTIONS.length) % OPTIONS.length;
    else next = (index + 1) % OPTIONS.length;

    onChange(OPTIONS[next].value);
    refs.current[next]?.focus();
  }

  const showSave = typeof yearlySavingsPercent === "number" && yearlySavingsPercent > 0;

  return (
    <div
      className={`fk-sub-interval${value === "YEARLY" ? " is-yearly" : ""}`}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      <span className="fk-sub-interval__thumb" aria-hidden="true" />

      {OPTIONS.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            className={`fk-sub-interval__option${selected ? " is-selected" : ""}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
            {option.value === "YEARLY" && showSave && (
              <span className="fk-sub-interval__save">Save up to {yearlySavingsPercent}%</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
