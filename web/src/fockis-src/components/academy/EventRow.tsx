import { CampusEvent } from '../../types/academy';

export default function EventRow({ event }: { event: CampusEvent }) {
  return (
    <div className="event-row">
      <div className="event-date">
        <span>{event.d}</span>
        <small>{event.m}</small>
      </div>
      <div>
        <strong style={{ display: 'block', fontSize: 15 }}>{event.title}</strong>
        <small style={{ color: 'var(--ink-soft)' }}>{event.loc}</small>
      </div>
    </div>
  );
}
