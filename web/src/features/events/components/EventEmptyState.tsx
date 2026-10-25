import type { ReactNode } from "react";
import { CalendarDays } from "lucide-react";

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: "default" | "error";
}

export default function EventEmptyState({ title, body, action, tone = "default" }: Props) {
  return (
    <div className={`fke-empty fke-empty--${tone}`} role={tone === "error" ? "alert" : undefined}>
      <span className="fke-empty__icon" aria-hidden="true">
        <CalendarDays size={26} strokeWidth={1.7} />
      </span>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action && <div className="fke-empty__action">{action}</div>}
    </div>
  );
}
