import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/** Breadcrumb + title used by every /help sub-page. */
export default function HelpPageHeader({
  title,
  description,
  crumbs = [],
  icon,
  tone = "blue",
  actions,
}: {
  title: string;
  description?: string;
  crumbs?: { label: string; to: string }[];
  icon?: ReactNode;
  tone?: "blue" | "green" | "red" | "purple" | "amber";
  actions?: ReactNode;
}) {
  return (
    <div className="fk-help-subhead">
      <nav className="fk-help-crumbs" aria-label="Breadcrumb">
        <Link to="/help">Help &amp; Support</Link>
        {crumbs.map((crumb) => (
          <span key={crumb.to}>
            <ChevronRight size={14} aria-hidden="true" />
            <Link to={crumb.to}>{crumb.label}</Link>
          </span>
        ))}
        <span>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="page">{title}</span>
        </span>
      </nav>
      <div className="fk-help-subhead__row">
        {icon && <span className={`fk-help-icon fk-help-icon--${tone} fk-help-icon--lg`}>{icon}</span>}
        <div className="fk-help-subhead__text">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {actions && <div className="fk-help-subhead__actions">{actions}</div>}
      </div>
    </div>
  );
}
