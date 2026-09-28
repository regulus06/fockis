import React from "react";
import { Link } from "react-router-dom";

import { type Department } from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

export interface DepartmentCardProps {
  organizationId: string;
  department: Department;
  onJoin?: (departmentId: string) => Promise<void> | void;
  onLeave?: (departmentId: string) => Promise<void> | void;
  className?: string;
}

function GroupIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.3" />

      <circle cx="14" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />

      <path
        d="M2.5 16c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M11.8 12.3c1.7.2 3 1.5 3.5 3.7"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export default function DepartmentCard({
  organizationId,
  department,
  onJoin,
  onLeave,
  className,
}: DepartmentCardProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  const departmentTypeLabel = t(
    "church.department.types." + department.departmentType,
  );

  const memberCountLabel =
    department.memberCount === 1
      ? t("church.members.one", { count: department.memberCount })
      : t("church.members.many", { count: department.memberCount });

  const departmentUrl =
    "/church/organizations/" +
    encodeURIComponent(organizationId) +
    "/departments#" +
    encodeURIComponent(department.id);

  return (
    <article
      className={["church-panel-card", className ?? ""].filter(Boolean).join(" ")}
    >
      <div className="church-panel-card__media">
        {department.photoUrl ? (
          <img src={department.photoUrl} alt={department.name} loading="lazy" />
        ) : (
          <div className="church-panel-card__media-fallback" aria-hidden="true">
            {department.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      <div className="church-panel-card__body">
        <span className="church-eyebrow">{departmentTypeLabel}</span>

        <h3 className="church-panel-card__title">
          <Link to={departmentUrl}>{department.name}</Link>
        </h3>

        {department.description && (
          <p className="church-panel-card__description">
            {department.description}
          </p>
        )}

        <div className="church-panel-card__meta">
          <span className="church-panel-card__meta-item">
            <GroupIcon />
            {memberCountLabel}
          </span>

          {department.leaders && department.leaders.length > 0 && (
            <span className="church-panel-card__meta-item">
              {t("church.department.ledBy")}{" "}
              {department.leaders.map((leader) => leader.displayName).join(", ")}
            </span>
          )}
        </div>

        <div className="church-panel-card__footer">
          {department.isCurrentUserMember ? (
            <button
              type="button"
              className="church-btn church-btn--ghost church-btn--sm"
              onClick={() => onLeave?.(department.id)}
            >
              {t("church.department.leave")}
            </button>
          ) : (
            <button
              type="button"
              className="church-btn church-btn--secondary church-btn--sm"
              onClick={() => onJoin?.(department.id)}
            >
              {t("church.department.join")}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}