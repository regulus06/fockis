import React from 'react';

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export default function EventDateTimeFields({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: Props) {
  return (
    <div className="fk-event-date-grid">
      <div className="fk-event-field">
        <label>
          Begin date & time
          <span>*</span>
        </label>

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) =>
            onStartChange(e.target.value)
          }
          required
        />
      </div>

      <div className="fk-event-field">
        <label>
          End / expiration date & time
          <span>*</span>
        </label>

        <input
          type="datetime-local"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) =>
            onEndChange(e.target.value)
          }
          required
        />
      </div>
    </div>
  );
}