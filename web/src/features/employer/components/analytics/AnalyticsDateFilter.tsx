
import { useEffect, useState } from 'react';

export type AnalyticsDateRange = {
  startDate: string;
  endDate: string;
};

export type AnalyticsDateFilterProps = {
  value: AnalyticsDateRange;
  onChange: (range: AnalyticsDateRange) => void;
  onApply?: (range: AnalyticsDateRange) => void;
  disabled?: boolean;
};

type Preset = '7days' | '30days' | '90days' | 'custom';

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Last 90 days', value: '90days' },
  { label: 'Custom range', value: 'custom' },
];

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getPresetRange(days: number): AnalyticsDateRange {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - (days - 1));

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

export function AnalyticsDateFilter({
  value,
  onChange,
  onApply,
  disabled = false,
}: AnalyticsDateFilterProps) {
  const [preset, setPreset] = useState<Preset>('30days');
  const [draft, setDraft] = useState<AnalyticsDateRange>(value);

  useEffect(() => {
    setDraft(value);
  }, [value.startDate, value.endDate]);

  const handlePresetChange = (nextPreset: Preset) => {
    setPreset(nextPreset);

    if (nextPreset === 'custom') return;

    const days =
      nextPreset === '7days'
        ? 7
        : nextPreset === '90days'
          ? 90
          : 30;

    const nextRange = getPresetRange(days);

    setDraft(nextRange);
    onChange(nextRange);
  };

  const handleDateChange = (
    field: keyof AnalyticsDateRange,
    date: string,
  ) => {
    const nextRange = {
      ...draft,
      [field]: date,
    };

    setDraft(nextRange);
    setPreset('custom');
    onChange(nextRange);
  };

  const isValidRange =
    Boolean(draft.startDate) &&
    Boolean(draft.endDate) &&
    draft.startDate <= draft.endDate;

  const handleApply = () => {
    if (!isValidRange || disabled) return;

    onApply?.(draft);
  };

  return (
    <section
      className="analytics-date-filter"
      aria-label="Analytics date filter"
    >
      <div className="analytics-date-filter__heading">
        <div>
          <h2>Analytics period</h2>
          <p>Select the date range for your hiring analytics.</p>
        </div>

        <span className="analytics-date-filter__icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
        </span>
      </div>

      <div className="analytics-date-filter__presets">
        {PRESETS.map((item) => (
          <button
            key={item.value}
            type="button"
            className={
              preset === item.value
                ? 'analytics-date-filter__preset is-active'
                : 'analytics-date-filter__preset'
            }
            onClick={() => handlePresetChange(item.value)}
            disabled={disabled}
            aria-pressed={preset === item.value}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="analytics-date-filter__fields">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={draft.startDate}
            max={draft.endDate || undefined}
            disabled={disabled}
            onChange={(event) =>
              handleDateChange('startDate', event.target.value)
            }
          />
        </label>

        <span className="analytics-date-filter__separator">to</span>

        <label>
          <span>End date</span>
          <input
            type="date"
            value={draft.endDate}
            min={draft.startDate || undefined}
            max={formatDate(new Date())}
            disabled={disabled}
            onChange={(event) =>
              handleDateChange('endDate', event.target.value)
            }
          />
        </label>

        {onApply && (
          <button
            type="button"
            className="analytics-date-filter__apply"
            onClick={handleApply}
            disabled={disabled || !isValidRange}
          >
            Apply filter
          </button>
        )}
      </div>

      {!isValidRange && (
        <p className="analytics-date-filter__error" role="alert">
          Select a valid date range. The end date must not be before the start
          date.
        </p>
      )}
    </section>
  );
}

export default AnalyticsDateFilter;
