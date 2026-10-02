import React from "react";

import type {
  BillingInterval,
} from "../types/subscriptionTypes";

import "../styles/BillingIntervalSelector.scss";

interface Props {
  value: BillingInterval;

  onChange: (
    value: BillingInterval,
  ) => void;
}

export default function BillingIntervalSelector({
  value,
  onChange,
}: Props) {
  return (
    <div className="fk-billing-selector">
      <button
        type="button"
        className={
          value === "MONTHLY"
            ? "is-active"
            : ""
        }
        onClick={() =>
          onChange("MONTHLY")
        }
      >
        Monthly
      </button>

      <button
        type="button"
        className={
          value === "YEARLY"
            ? "is-active"
            : ""
        }
        onClick={() =>
          onChange("YEARLY")
        }
      >
        Yearly
        <span>Save annually</span>
      </button>
    </div>
  );
}