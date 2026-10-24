import type { FockisEvent } from "../types/event.types";

interface Props {
  event: Pick<FockisEvent, "attendeeCount" | "interestedCount" | "spotsLeft" | "capacity">;
  className?: string;
}

const plural = (count: number, one: string, many: string) => `${count.toLocaleString()} ${count === 1 ? one : many}`;

export default function EventSocialProof({ event, className = "" }: Props) {
  const parts = [plural(event.attendeeCount, "going", "going")];

  if (event.interestedCount > 0) parts.push(plural(event.interestedCount, "interested", "interested"));

  return (
    <span className={`fke-proof ${className}`}>
      {parts.join(" · ")}
      {event.capacity !== null && event.spotsLeft !== null && event.spotsLeft > 0 && event.spotsLeft <= 20 && (
        <span className="fke-proof__spots"> · {plural(event.spotsLeft, "spot left", "spots left")}</span>
      )}
    </span>
  );
}
