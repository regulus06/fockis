import React from "react";
import { Link } from "react-router-dom";

import { GROUP_TYPE_LABELS, type ChurchGroup } from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

/* ============================================================================
   PROPS
========================================================================== */

export interface ChurchGroupCardProps {
  organizationId: string;
  group: ChurchGroup;

  onJoin?: (groupId: string) => Promise<void> | void;

  onLeave?: (groupId: string) => Promise<void> | void;

  className?: string;
}

/* ============================================================================
   ICONS
========================================================================== */

function ClockIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="10"
        cy="10"
        r="7.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M10 6v4.2l3 1.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PinIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M10 1.5c-3.04 0-5.5 2.46-5.5 5.5 0 4.13 5.5 11.5 5.5 11.5s5.5-7.37 5.5-11.5c0-3.04-2.46-5.5-5.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function UsersIcon(): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 20 20"
      width="14"
      height="14"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="7.5"
        cy="7"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <path
        d="M2.8 16c.45-2.45 2.1-3.8 4.7-3.8s4.25 1.35 4.7 3.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />

      <path
        d="M13 5.2a2.3 2.3 0 0 1 0 4.5M14.2 12.4c1.65.4 2.65 1.55 3 3.1"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================================
   HELPERS
========================================================================== */

function getGroupTypeTranslationKey(groupType: string): string | null {
  switch (groupType) {
    case "bible_study":
      return "church.group.types.bible_study";

    case "small_group":
      return "church.group.types.small_group";

    case "prayer_group":
      return "church.group.types.prayer_group";

    case "custom":
      return "church.group.types.custom";

    default:
      return null;
  }
}

function getFallbackGroupTypeLabel(groupType: string): string {
  const label =
    GROUP_TYPE_LABELS[groupType as keyof typeof GROUP_TYPE_LABELS];

  if (typeof label === "string" && label.trim()) {
    return label;
  }

  switch (groupType) {
    case "bible_study":
      return "Bible Study";

    case "small_group":
      return "Small Group";

    case "prayer_group":
      return "Prayer Group";

    case "custom":
      return "Custom";

    default:
      return "Group";
  }
}

function getTranslatedLabel(
  translated: string,
  key: string,
  fallback: string,
): string {
  if (translated && translated.trim() && translated !== key) {
    return translated;
  }

  return fallback;
}

/* ============================================================================
   COMPONENT
========================================================================== */

export default function ChurchGroupCard({
  organizationId,
  group,
  onJoin,
  onLeave,
  className,
}: ChurchGroupCardProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  /* ==========================================================================
     GROUP STATE
  ========================================================================== */

  const isFull =
    typeof group.capacity === "number" &&
    group.capacity > 0 &&
    group.memberCount >= group.capacity;

  /* ==========================================================================
     GROUP URL
  ========================================================================== */

  const groupUrl =
    "/church/organizations/" +
    encodeURIComponent(organizationId) +
    "/groups#" +
    encodeURIComponent(group.id);

  /* ==========================================================================
     CARD CLASS
  ========================================================================== */

  const cardClassName = ["church-panel-card", "church-group-card", className ?? ""]
    .filter(Boolean)
    .join(" ");

  /* ==========================================================================
     GROUP TYPE TRANSLATION
  ========================================================================== */

  const groupTypeKey = getGroupTypeTranslationKey(group.groupType);

  const fallbackGroupTypeLabel = getFallbackGroupTypeLabel(group.groupType);

  const groupTypeLabel = groupTypeKey
    ? getTranslatedLabel(t(groupTypeKey), groupTypeKey, fallbackGroupTypeLabel)
    : fallbackGroupTypeLabel;

  /* ==========================================================================
     MEMBER COUNT
  ========================================================================== */

  const memberCountKey =
    group.memberCount === 1 ? "church.members.one" : "church.members.many";

  const memberLabel = t(memberCountKey, { count: group.memberCount });

  const safeMemberLabel =
    memberLabel && memberLabel !== memberCountKey
      ? memberLabel
      : group.memberCount === 1
        ? "member"
        : "members";

  const memberCount = (
    <>
      {group.memberCount}

      {typeof group.capacity === "number" && group.capacity > 0
        ? " / " + group.capacity
        : ""}{" "}

      {safeMemberLabel}
    </>
  );

  /* ==========================================================================
     RENDER
  ========================================================================== */

  return (
    <article className={cardClassName}>
      {/* ====================================================================
          MEDIA
      ===================================================================== */}

      <div className="church-panel-card__media church-group-card__media">
        {group.photoUrl ? (
          <img src={group.photoUrl} alt="" loading="lazy" />
        ) : (
          <div
            className="church-panel-card__media-fallback church-group-card__fallback"
            aria-hidden="true"
          >
            {group.name.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>

      {/* ====================================================================
          BODY
      ===================================================================== */}

      <div className="church-panel-card__body church-group-card__body">
        {/* ==================================================================
            TOP ROW
        =================================================================== */}

        <div className="church-group-card__top">
          <span className="church-eyebrow church-group-card__type">
            {groupTypeLabel}
          </span>

          <span className="church-group-card__member-badge">
            <UsersIcon />

            <span>{memberCount}</span>
          </span>
        </div>

        {/* ==================================================================
            TITLE
        =================================================================== */}

        <h3 className="church-panel-card__title church-group-card__title">
          <Link to={groupUrl}>{group.name}</Link>
        </h3>

        {/* ==================================================================
            DESCRIPTION
        =================================================================== */}

        {group.description && (
          <p className="church-panel-card__description church-group-card__description">
            {group.description}
          </p>
        )}

        {/* ==================================================================
            META
        =================================================================== */}

        {(group.meetingSchedule || group.location) && (
          <div className="church-panel-card__meta church-group-card__meta">
            {group.meetingSchedule && (
              <div className="church-panel-card__meta-item church-group-card__meta-item">
                <span className="church-group-card__meta-icon">
                  <ClockIcon />
                </span>

                <span className="church-group-card__meta-text">
                  {group.meetingSchedule}
                </span>
              </div>
            )}

            {group.location && (
              <div className="church-panel-card__meta-item church-group-card__meta-item">
                <span className="church-group-card__meta-icon">
                  <PinIcon />
                </span>

                <span className="church-group-card__meta-text">
                  {group.location}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================
            FOOTER
        =================================================================== */}

        <div className="church-panel-card__footer church-group-card__footer">
          <div className="church-group-card__capacity">
            <UsersIcon />

            <span>{memberCount}</span>
          </div>

          <div className="church-group-card__actions">
            <Link
              to={groupUrl}
              className="church-btn church-btn--ghost church-btn--sm church-group-card__details-btn"
            >
              {t("church.group.view")}
            </Link>

            {group.isCurrentUserMember ? (
              <button
                type="button"
                className="church-btn church-btn--ghost church-btn--sm church-group-card__action-btn"
                onClick={() => onLeave?.(group.id)}
              >
                {t("church.group.leave")}
              </button>
            ) : (
              <button
                type="button"
                className="church-btn church-btn--secondary church-btn--sm church-group-card__action-btn"
                onClick={() => onJoin?.(group.id)}
                disabled={isFull}
              >
                {isFull ? t("church.group.full") : t("church.group.join")}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}