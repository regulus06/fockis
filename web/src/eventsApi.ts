import React from "react";

interface Props {
  startDate: string;
  endDate: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

export default function EventDateTimeFields({ startDate, endDate, onStartChange, onEndChange }: Props) {
  return (
    <div className="fk-event-date-grid">
      <div className="fk-event-field">
        <label htmlFor="fk-event-start">Begin date &amp; time <span aria-hidden="true">*</span></label>
        <input id="fk-event-start" type="datetime-local" value={startDate}
          onChange={(e) => onStartChange(e.target.value)} required />
      </div>
      <div className="fk-event-field">
        <label htmlFor="fk-event-end">End date &amp; time <span aria-hidden="true">*</span></label>
        <input id="fk-event-end" type="datetime-local" value={endDate}
          min={startDate || undefined} onChange={(e) => onEndChange(e.target.value)} required />
      </div>
    </div>
  );
}
