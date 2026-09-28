import type {
  TravelPartnerApplicationStatus,
  TravelPartnerStatus,
} from "../types/travelAdmin.types";

type Status = TravelPartnerApplicationStatus | TravelPartnerStatus;

interface TravelPartnerStatusBadgeProps {
  status: Status;
}

const STATUS_META: Record<
  Status,
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "badge-amber" },
  under_review: { label: "Under review", className: "badge-blue" },
  more_info_requested: {
    label: "More info requested",
    className: "badge-amber",
  },
  approved: { label: "Approved", className: "badge-green" },
  rejected: { label: "Rejected", className: "badge-red" },
  active: { label: "Active", className: "badge-green" },
  suspended: { label: "Suspended", className: "badge-red" },
  deactivated: { label: "Deactivated", className: "badge-gray" },
};

export default function TravelPartnerStatusBadge({
  status,
}: TravelPartnerStatusBadgeProps) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: "badge-gray",
  };

  return (
    <span className={`travel-status-badge ${meta.className}`}>
      {meta.label}
    </span>
  );
}
