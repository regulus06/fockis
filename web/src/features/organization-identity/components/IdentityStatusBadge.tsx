import type {
  OrganizationIdentityStatus,
} from "../types/organizationIdentity.types";

interface Props {
  status: OrganizationIdentityStatus;
}

const labels: Record<
  OrganizationIdentityStatus,
  string
> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  disabled: "Disabled",
};

export default function IdentityStatusBadge({
  status,
}: Props) {
  return (
    <span
      className={`identity-status identity-status--${status}`}
    >
      {labels[status]}
    </span>
  );
}