import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";

import "../../styles/components/history.scss";

const FILTERS = [
  {
    value: "All",
    label: "All",
    icon: CalendarDays,
  },
  {
    value: "Hosted",
    label: "Hosted",
    icon: CheckCircle2,
  },
  {
    value: "Attended",
    label: "Attended",
    icon: Clock3,
  },
  {
    value: "Cancelled",
    label: "Cancelled",
    icon: XCircle,
  },
] as const;

export type HistoryFilter =
  (typeof FILTERS)[number]["value"];

interface HistoryFilterTabsProps {
  active: HistoryFilter;

  onChange: (
    filter: HistoryFilter,
  ) => void;
}

export function HistoryFilterTabs({
  active,
  onChange,
}: HistoryFilterTabsProps) {
  return (
    <div
      className="fm-history-filters"
      role="tablist"
      aria-label="Meeting history filters"
    >
      {FILTERS.map(
        ({
          value,
          label,
          icon: Icon,
        }) => {
          const selected =
            active === value;

          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={
                selected ? 0 : -1
              }
              className={[
                "fm-history-filters__item",
                selected
                  ? "fm-history-filters__item--active"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() =>
                onChange(value)
              }
            >
              <Icon size={14} />

              <span>{label}</span>
            </button>
          );
        },
      )}
    </div>
  );
}

export default HistoryFilterTabs;