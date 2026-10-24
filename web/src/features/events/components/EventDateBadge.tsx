import { dateBadgeParts } from "../utils/eventTime";

interface Props {
  date: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/** Navy tile with a gold month strip, in the viewer's time zone. */
export default function EventDateBadge({ date, size = "md", className = "" }: Props) {
  const { month, day, weekday } = dateBadgeParts(date);

  if (!day) return null;

  return (
    <span className={`fke-date-badge fke-date-badge--${size} ${className}`} aria-hidden="true">
      <span className="fke-date-badge__month">{month}</span>
      <span className="fke-date-badge__day">{day}</span>
      {size !== "sm" && <span className="fke-date-badge__weekday">{weekday}</span>}
    </span>
  );
}
