import React from "react";

import { MembershipStatus, type Member } from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

export interface MemberCardProps {
  member: Member;

  /** Render compact (directory grid) vs. full (profile detail) layout. */
  variant?: "compact" | "full";

  className?: string;
}

function statusClass(status: MembershipStatus): string {
  switch (status) {
    case MembershipStatus.Active:
      return "church-status--active";

    case MembershipStatus.Pending:
      return "church-status--pending";

    case MembershipStatus.Inactive:
      return "church-status--inactive";

    case MembershipStatus.Archived:
      return "church-status--archived";

    default:
      return "";
  }
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function formatMemberSince(joinedAt: string, language?: string): string {
  const date = new Date(joinedAt);

  if (Number.isNaN(date.getTime())) {
    return joinedAt;
  }

  try {
    return date.toLocaleDateString(language || undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date.toLocaleDateString();
  }
}

export default function MemberCard({
  member,
  variant = "compact",
  className,
}: MemberCardProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  const { profile, privateProfile, canViewPrivateProfile } = member;

  const statusLabel = t("church.members.status." + member.status);

  const roleLabel = t("church.members.roles." + member.role);

  const hasDepartments =
    Array.isArray(profile.departmentNames) &&
    profile.departmentNames.length > 0;

  const hasGroups =
    Array.isArray(profile.groupNames) && profile.groupNames.length > 0;

  const hasAffiliations = hasDepartments || hasGroups;

  return (
    <article
      className={[
        "church-member-card",
        "church-member-card--" + variant,
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="church-member-card__avatar"
        aria-hidden={profile.avatarUrl ? true : undefined}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            loading="lazy"
          />
        ) : (
          <span className="church-member-card__initials">
            {initialsFor(profile.displayName)}
          </span>
        )}
      </div>

      <div className="church-member-card__info">
        <div className="church-member-card__heading">
          <h3 className="church-member-card__name">
            {profile.displayName}

            {member.isCurrentUser && (
              <span className="church-member-card__you">
                {" "}
                ({t("church.members.you")})
              </span>
            )}
          </h3>

          <span
            className={["church-status-pill", statusClass(member.status)]
              .filter(Boolean)
              .join(" ")}
          >
            {statusLabel}
          </span>
        </div>

        <p className="church-member-card__role">{roleLabel}</p>

        {hasAffiliations && (
          <div className="church-member-card__affiliations">
            {hasDepartments &&
              profile.departmentNames?.map((name) => (
                <span key={"dept-" + name} className="church-chip">
                  {name}
                </span>
              ))}

            {hasGroups &&
              profile.groupNames?.map((name) => (
                <span
                  key={"group-" + name}
                  className="church-chip church-chip--outline"
                >
                  {name}
                </span>
              ))}
          </div>
        )}

        {variant === "full" && canViewPrivateProfile && privateProfile && (
          <dl className="church-member-card__private-details">
            {privateProfile.email && (
              <div>
                <dt>{t("church.members.email")}</dt>

                <dd>
                  <a href={"mailto:" + privateProfile.email}>
                    {privateProfile.email}
                  </a>
                </dd>
              </div>
            )}

            {privateProfile.phone && (
              <div>
                <dt>{t("church.members.phone")}</dt>

                <dd>
                  <a href={"tel:" + privateProfile.phone}>
                    {privateProfile.phone}
                  </a>
                </dd>
              </div>
            )}

            {privateProfile.joinedAt && (
              <div>
                <dt>{t("church.members.memberSince")}</dt>

                <dd>{formatMemberSince(privateProfile.joinedAt)}</dd>
              </div>
            )}
          </dl>
        )}

        {variant === "full" && !canViewPrivateProfile && (
          <p className="church-member-card__restricted">
            {t("church.members.privateDetails")}
          </p>
        )}
      </div>
    </article>
  );
}