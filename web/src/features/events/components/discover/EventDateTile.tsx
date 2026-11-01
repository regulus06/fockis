import { dateBadgeParts } from "../../utils/eventTime";

interface Props {
  date: string;
  variant?: "card" | "plain";
  className?: string;
}

/** White tile with a gold month label ("OCT" / "15"), viewer's time zone. */
export default function EventDateTile({ date, variant = "card", className = "" }: Props) {
  const { month, day } = dateBadgeParts(date);

  if (!day) return null;

  return (
    <span className={`fkd-date fkd-date--${variant} ${className}`} aria-hidden="true">
      <span className="fkd-date__month">{month}</span>
      <span className="fkd-date__day">{day}</span>
    </span>
  );
}
