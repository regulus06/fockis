import {
  useEffect,
  useState,
} from "react";

import type {
  UpdateBudgetPayload,
} from "../types/marketingTypes";

interface Props {
  budget?: number;
  dailyBudget?: number;

  saving?: boolean;

  onSave: (
    payload: UpdateBudgetPayload,
  ) => Promise<void> | void;
}

export default function BudgetEditor({
  budget,
  dailyBudget,
  saving,
  onSave,
}: Props) {
  const [
    total,
    setTotal,
  ] = useState(
    String(budget ?? ""),
  );

  const [
    daily,
    setDaily,
  ] = useState(
    String(dailyBudget ?? ""),
  );

  useEffect(() => {
    setTotal(
      String(budget ?? ""),
    );

    setDaily(
      String(dailyBudget ?? ""),
    );
  }, [
    budget,
    dailyBudget,
  ]);

  return (
    <div className="fk-budget-editor">
      <div className="fk-form-field">
        <label>
          Campaign budget
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={total}
          onChange={(event) =>
            setTotal(
              event.target.value,
            )
          }
        />
      </div>

      <div className="fk-form-field">
        <label>
          Daily budget
        </label>

        <input
          type="number"
          min="0"
          step="0.01"
          value={daily}
          onChange={(event) =>
            setDaily(
              event.target.value,
            )
          }
        />
      </div>

      <button
        className="fk-marketing-primary-button"
        disabled={saving}
        onClick={() =>
          onSave({
            budget: Number(total),
            dailyBudget:
              Number(daily),
          })
        }
      >
        {saving
          ? "Saving..."
          : "Save budget"}
      </button>
    </div>
  );
}