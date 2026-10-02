/* ============================================================================
   CAMPAIGN STATUS
============================================================================ */

import type {
  CampaignStatus as CampaignStatusType,
} from "../types/marketingTypes";

interface CampaignStatusProps {
  status?: CampaignStatusType;
}

export default function CampaignStatus({
  status,
}: CampaignStatusProps) {

  const normalizedStatus =
    status ?? "DRAFT";

  const label =
    normalizedStatus
      .replace(/_/g, " ");

  return (
    <span
      className={`marketing-status marketing-status-${normalizedStatus.toLowerCase()}`}
    >
      {label}
    </span>
  );
}