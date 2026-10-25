import { NavLink } from "react-router-dom";

import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminAccess } from "../../permissions/adminAccess";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  type AppealStatus,
  type CasePriority,
  type CaseStatus,
  type StaffPerson,
} from "../moderationTypes";

import "../styles/Moderation.scss";

const STATUS_TONE: Record<CaseStatus, string> = {
  pending: "info",
  under_review: "navy",
  action_required: "warning",
  escalated: "danger",
  resolved: "success",
  dismissed: "neutral",
};

const PRIORITY_TONE: Record<CasePriority, string> = {
  low: "neutral",
  normal: "info",
  high: "warning",
  urgent: "danger",
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span className={`fk-badge fk-badge--${STATUS_TONE[status] ?? "neutral"}`}>
      <span className="fk-badge__dot" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: CasePriority }) {
  return <span className={`fkmod-priority fkmod-priority--${PRIORITY_TONE[priority] ?? "neutral"}`}>{PRIORITY_LABELS[priority] ?? priority}</span>;
}

export function AppealBadge({ status }: { status: AppealStatus }) {
  if (status === "none") return null;

  const map: Record<Exclude<AppealStatus, "none">, [string, string]> = {
    pending: ["Appeal pending", "warning"],
    upheld: ["Appeal upheld", "neutral"],
    overturned: ["Appeal accepted", "success"],
  };
  const [label, tone] = map[status];

  return <span className={`fk-badge fk-badge--${tone}`}>{label}</span>;
}

export function PersonCell({ person, fallback = "—" }: { person: StaffPerson | null | undefined; fallback?: string }) {
  if (!person) return <span className="fk-muted">{fallback}</span>;

  const initial = (person.name || person.username || "?").trim().charAt(0).toUpperCase();

  return (
    <span className="fk-person fkmod-person">
      {person.avatar ? (
        <img className="fkmod-avatar" src={person.avatar} alt="" loading="lazy" />
      ) : (
        <span className="fkmod-avatar fkmod-avatar--initial" aria-hidden="true">
          {initial}
        </span>
      )}
      <span>
        <strong>{person.name || person.username || "Unknown"}</strong>
        {person.username && <small>@{person.username}</small>}
      </span>
    </span>
  );
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatRelative(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const minutes = Math.round((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;
  if (minutes < 60 * 24 * 30) return `${Math.round(minutes / 1440)}d ago`;

  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

/** Sub-navigation shown on every moderation screen. */
export function ModerationTabs() {
  const { can } = useAdminAccess();
  const P = PERMISSIONS;

  const tabs = [
    { to: "/admin/moderation", label: "Overview", end: true, show: true },
    { to: "/admin/moderation/cases", label: "Queue", end: false, show: true },
    { to: "/admin/moderation/appeals", label: "Appeals", end: false, show: can([P.MODERATION_APPEALS]) },
    { to: "/admin/moderation/settings", label: "Settings", end: false, show: true },
  ];

  return (
    <nav className="fk-tabs" aria-label="Moderation sections">
      {tabs
        .filter((tab) => tab.show)
        .map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className={({ isActive }) => `fk-tab${isActive ? " is-active" : ""}`}>
            {tab.label}
          </NavLink>
        ))}
    </nav>
  );
}
