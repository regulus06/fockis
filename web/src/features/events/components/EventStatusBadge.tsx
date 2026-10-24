import type { FockisEvent } from "../types/event.types";
import { getEventStatus, relativeDay } from "../utils/eventTime";

interface Props {
  event: Pick<FockisEvent, "startDate" | "endDate" | "isCancelled" | "isFull">;
  now?: number;
  /** Show "Today"/"Tomorrow" for upcoming events instead of "Upcoming". */
  relative?: boolean;
}

export default function EventStatusBadge({ event, now = Date.now(), relative = true }: Props) {
  const status = getEventStatus(event, now);

  if (status === "live") {
    return (
      <span className="fke-status fke-status--live">
        <span className="fke-status__pulse" aria-hidden="true" />
        Happening now
      </span>
    );
  }

  if (status === "cancelled") return <span className="fke-status fke-status--cancelled">Cancelled</span>;
  if (status === "ended") return <span className="fke-status fke-status--ended">Ended</span>;
  if (event.isFull) return <span className="fke-status fke-status--full">Full</span>;

  const day = relative ? relativeDay(event.startDate, now) : "";

  if (day === "Today" || day === "Tomorrow") {
    return <span className="fke-status fke-status--soon">{day}</span>;
  }

  return <span className="fke-status fke-status--upcoming">Upcoming</span>;
}
