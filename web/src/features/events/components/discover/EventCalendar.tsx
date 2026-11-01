import { useMemo } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { longDayLabel, monthGrid, monthTitle } from "../../utils/eventCalendar";

interface Props {
  month: Date;
  onMonthChange: (month: Date) => void;
  /** Day keys (YYYY-MM-DD) that have at least one event. */
  eventDays: Map<string, number>;
  selected: string;
  onSelect: (key: string) => void;
  loading?: boolean;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function EventCalendar({ month, onMonthChange, eventDays, selected, onSelect, loading }: Props) {
  const cells = useMemo(() => monthGrid(month), [month]);
  const shift = (delta: number) => onMonthChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));

  return (
    <section className="fkd-card fkd-cal" aria-labelledby="fkd-cal-title" aria-busy={loading || undefined}>
      <header className="fkd-card__head">
        <CalendarDays size={22} className="fkd-card__icon" aria-hidden="true" />
        <h2 id="fkd-cal-title">Event Calendar</h2>
      </header>

      <div className="fkd-cal__nav">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <strong aria-live="polite">{monthTitle(month)}</strong>
        <button type="button" onClick={() => shift(1)} aria-label="Next month">
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="fkd-cal__grid" role="grid" aria-label={monthTitle(month)}>
        {WEEKDAYS.map((day) => (
          <span key={day} className="fkd-cal__weekday" role="columnheader">
            {day}
          </span>
        ))}

        {cells.map((cell) => {
          const count = eventDays.get(cell.key) ?? 0;
          const isSelected = selected === cell.key;

          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              className={[
                "fkd-cal__day",
                cell.inMonth ? "" : "is-outside",
                cell.isToday ? "is-today" : "",
                isSelected ? "is-selected" : "",
                count ? "has-events" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-selected={isSelected}
              aria-label={`${longDayLabel(cell.key)}${count ? `, ${count} ${count === 1 ? "event" : "events"}` : ", no events"}`}
              onClick={() => onSelect(isSelected ? "" : cell.key)}
            >
              <span>{cell.day}</span>
              {count > 0 && <i className="fkd-cal__dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
