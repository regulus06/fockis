import { toLocalInputValue } from "../utils/eventTime";

interface Props {
  /** ISO instant or datetime-local value. */
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  errors?: { startDate?: string; endDate?: string };
  timeZoneLabel?: string;
}

/**
 * Start/end pickers in the organizer's local time. Values are
 * datetime-local strings; the form converts them to UTC instants.
 */
export default function EventDateTimeFields({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  errors = {},
  timeZoneLabel,
}: Props) {
  const startValue = startDate.includes("Z") || /[+-]\d\d:\d\d$/.test(startDate) ? toLocalInputValue(startDate) : startDate;
  const endValue = endDate.includes("Z") || /[+-]\d\d:\d\d$/.test(endDate) ? toLocalInputValue(endDate) : endDate;

  return (
    <fieldset className="fke-fieldset">
      <legend>
        When
        {timeZoneLabel && <small> · times in {timeZoneLabel}</small>}
      </legend>
      <div className="fke-form-grid">
        <label className="fke-field">
          <span>Starts</span>
          <input
            type="datetime-local"
            required
            value={startValue}
            onChange={(changeEvent) => onStartChange(changeEvent.target.value)}
            aria-invalid={Boolean(errors.startDate) || undefined}
            aria-describedby={errors.startDate ? "fke-start-error" : undefined}
          />
          {errors.startDate && <small id="fke-start-error" className="fke-error-text">{errors.startDate}</small>}
        </label>
        <label className="fke-field">
          <span>Ends</span>
          <input
            type="datetime-local"
            required
            min={startValue || undefined}
            value={endValue}
            onChange={(changeEvent) => onEndChange(changeEvent.target.value)}
            aria-invalid={Boolean(errors.endDate) || undefined}
            aria-describedby={errors.endDate ? "fke-end-error" : undefined}
          />
          {errors.endDate && <small id="fke-end-error" className="fke-error-text">{errors.endDate}</small>}
        </label>
      </div>
    </fieldset>
  );
}
