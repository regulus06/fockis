import React from "react";

import { OrganizationType } from "../types/church.types";

import { useFockisTranslation } from "../../../i18n/useFockisTranslation";

import "../styles/ChurchComponents.scss";

export interface OrganizationTypeBadgeProps {
  organizationType: OrganizationType;
  size?: "sm" | "md";
  className?: string;
}

const TYPE_ACCENT_CLASS: Partial<Record<OrganizationType, string>> = {
  [OrganizationType.Church]: "church-badge--church",
};

function getOrganizationTypeTranslationKey(
  organizationType: OrganizationType,
): string {
  return "church.organizationTypes." + organizationType;
}

function getOrganizationTypeFallback(
  organizationType: OrganizationType,
): string {
  switch (organizationType) {
    case OrganizationType.Church:
      return "Church";

    case OrganizationType.ChristianMinistry:
      return "Christian Ministry";

    case OrganizationType.ChristianFellowship:
      return "Christian Fellowship";

    case OrganizationType.Mission:
      return "Mission";

    case OrganizationType.PrayerOrganization:
      return "Prayer Organization";

    case OrganizationType.ChristianNetwork:
      return "Christian Network";

    case OrganizationType.ChristianNonprofit:
      return "Christian Nonprofit";

    case OrganizationType.BibleStudyOrganization:
      return "Bible Study Organization";

    case OrganizationType.Other:
      return "Other";

    default:
      return "Organization";
  }
}

export default function OrganizationTypeBadge({
  organizationType,
  size = "md",
  className,
}: OrganizationTypeBadgeProps): React.JSX.Element {
  const { t } = useFockisTranslation();

  const accentClass =
    TYPE_ACCENT_CLASS[organizationType] ?? "church-badge--other";

  const translationKey = getOrganizationTypeTranslationKey(organizationType);

  const translatedLabel = t(translationKey);

  const fallbackLabel = getOrganizationTypeFallback(organizationType);

  const label =
    translatedLabel && translatedLabel !== translationKey
      ? translatedLabel
      : fallbackLabel;

  const organizationTypeLabel = t(
    "church.organizationTypes.organizationType",
  );

  const safeOrganizationTypeLabel =
    organizationTypeLabel &&
    organizationTypeLabel !== "church.organizationTypes.organizationType"
      ? organizationTypeLabel
      : "Organization Type";

  return (
    <span
      className={[
        "church-badge",
        accentClass,
        size === "sm" ? "church-badge--sm" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label={safeOrganizationTypeLabel + ": " + label}
    >
      <span className="church-badge__dot" aria-hidden="true" />

      {label}
    </span>
  );
}