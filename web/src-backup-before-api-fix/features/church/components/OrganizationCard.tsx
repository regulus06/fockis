import React, { useState } from "react";
import { Link } from "react-router-dom";

import OrganizationTypeBadge from "./OrganizationTypeBadge";

import {
  MembershipStatus,
  type OrganizationSummary,
} from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

/* ============================================================================
   PROPS
========================================================================== */

export interface OrganizationCardProps {
  organization: OrganizationSummary;

  onJoin?: (organizationId: string) => Promise<void> | void;

  className?: string;
}

/* ============================================================================
   HELPERS
========================================================================== */

function isValidOrganizationId(
  value: string | undefined | null,
): value is string {
  const id = value?.trim();

  if (!id) {
    return false;
  }

  if (id === "YOUR_ORG_ID" || id === "undefined" || id === "null") {
    return false;
  }

  return /^[a-fA-F0-9]{24}$/.test(id);
}

/* ============================================================================
   LOCATION ICON
========================================================================== */

function LocationPinIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden="true">
      <path
        d="M10 1.5c-3.04 0-5.5 2.46-5.5 5.5 0 4.13 5.5 11.5 5.5 11.5s5.5-7.37 5.5-11.5c0-3.04-2.46-5.5-5.5-5.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
      />

      <circle cx="10" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

/* ============================================================================
   BUILDING PLACEHOLDER
========================================================================== */

function BuildingPlaceholderIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="46"
        height="46"
        rx="10"
        fill="var(--church-surface-muted, #eef1f6)"
      />

      <path
        d="M14 34V16l10-6 10 6v18"
        stroke="var(--church-primary, #163a5f)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path d="M14 34h20" stroke="var(--church-primary, #163a5f)" strokeWidth="2" />

      <path
        d="M20 34v-8h8v8"
        stroke="var(--church-primary, #163a5f)"
        strokeWidth="2"
      />
    </svg>
  );
}

/* ============================================================================
   COMPONENT
========================================================================== */

export default function OrganizationCard({
  organization,
  onJoin,
  className,
}: OrganizationCardProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  const [isJoining, setIsJoining] = useState(false);

  /* ==========================================================================
     ORGANIZATION ID
  ========================================================================== */

  const organizationId =
    typeof organization.id === "string" ? organization.id.trim() : "";

  const hasValidOrganizationId = isValidOrganizationId(organizationId);

  /* ==========================================================================
     ORGANIZATION URL
  ========================================================================== */

  const organizationUrl = hasValidOrganizationId
    ? "/church/organizations/" + encodeURIComponent(organizationId)
    : "#";

  /* ==========================================================================
     LOCATION
  ========================================================================== */

  const locationLabel = organization.mainLocation
    ? [
        organization.mainLocation.city,
        organization.mainLocation.state,
        organization.mainLocation.country,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        )
        .join(", ")
    : undefined;

  /* ==========================================================================
     MEMBERSHIP STATUS
  ========================================================================== */

  const isMember =
    organization.currentUserMembershipStatus === MembershipStatus.Active;

  const isPending =
    organization.currentUserMembershipStatus === MembershipStatus.Pending;

  const isInactive =
    organization.currentUserMembershipStatus === MembershipStatus.Inactive;

  /* ==========================================================================
     MEMBERSHIP ACTION LABEL
  ========================================================================== */

  const membershipActionLabel = isMember
    ? t("church.organizationCard.view")
    : isPending
      ? t("church.organizationCard.pending")
      : isInactive
        ? t("church.organizationCard.rejoin")
        : t("church.organizationCard.requestJoin");

  /* ==========================================================================
     MEMBER COUNT
  ========================================================================== */

  const memberCountLabel =
    typeof organization.memberCount === "number"
      ? organization.memberCount === 1
        ? t("church.organizationCard.oneMember", {
            count: organization.memberCount,
          })
        : t("church.organizationCard.manyMembers", {
            count: organization.memberCount,
          })
      : null;

  /* ==========================================================================
     JOIN ORGANIZATION
  ========================================================================== */

  const handleJoinClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ): Promise<void> => {
    event.preventDefault();

    if (!hasValidOrganizationId) {
      console.error(
        "[Church] Cannot join organization: invalid organization ID.",
        {
          organization,
          organizationId,
        },
      );

      return;
    }

    if (!onJoin || isPending || isJoining) {
      return;
    }

    try {
      setIsJoining(true);

      await onJoin(organizationId);
    } finally {
      setIsJoining(false);
    }
  };

  /* ==========================================================================
     INVALID ORGANIZATION
  ========================================================================== */

  if (!hasValidOrganizationId) {
    return (
      <article
        className={["church-org-card", className ?? ""].filter(Boolean).join(" ")}
      >
        <div className="church-org-card__media">
          <BuildingPlaceholderIcon />
        </div>

        <div className="church-org-card__body">
          <div className="church-org-card__heading">
            <span className="church-org-card__name">{organization.name}</span>

            <OrganizationTypeBadge
              organizationType={organization.organizationType}
              size="sm"
            />
          </div>

          <div className="church-alert church-alert--error" role="alert">
            {t("church.organization.invalidId")}
          </div>
        </div>
      </article>
    );
  }

  /* ==========================================================================
     NORMAL ORGANIZATION CARD
  ========================================================================== */

  return (
    <article
      className={["church-org-card", className ?? ""].filter(Boolean).join(" ")}
    >
      <Link
        to={organizationUrl}
        className="church-org-card__media-link"
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="church-org-card__media">
          {organization.logoUrl ? (
            <img
              src={organization.logoUrl}
              alt=""
              className="church-org-card__logo"
              loading="lazy"
            />
          ) : (
            <BuildingPlaceholderIcon />
          )}
        </div>
      </Link>

      <div className="church-org-card__body">
        <div className="church-org-card__heading">
          <Link to={organizationUrl} className="church-org-card__name">
            {organization.name}
          </Link>

          <OrganizationTypeBadge
            organizationType={organization.organizationType}
            size="sm"
          />
        </div>

        {locationLabel && (
          <p className="church-org-card__location">
            <LocationPinIcon />

            <span>{locationLabel}</span>
          </p>
        )}

        {organization.description && (
          <p className="church-org-card__description">
            {organization.description}
          </p>
        )}

        <div className="church-org-card__footer">
          {memberCountLabel && (
            <span className="church-org-card__member-count">
              {memberCountLabel}
            </span>
          )}

          {isMember ? (
            <Link
              to={organizationUrl}
              className="church-btn church-btn--primary church-btn--sm"
            >
              {membershipActionLabel}
            </Link>
          ) : (
            <button
              type="button"
              className="church-btn church-btn--secondary church-btn--sm"
              onClick={handleJoinClick}
              disabled={isPending || isJoining}
            >
              {isJoining
                ? t("church.organizationCard.sending")
                : membershipActionLabel}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}