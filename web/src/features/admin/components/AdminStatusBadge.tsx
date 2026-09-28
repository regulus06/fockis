import type { UserAccountStatus, AdminAccountStatus } from '../types/admin.types';

type Variant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const STATUS_VARIANT: Record<string, Variant> = {
  ACTIVE: 'success',
  INACTIVE: 'neutral',
  SUSPENDED: 'warning',
  DEACTIVATED: 'neutral',
  BLOCKED: 'danger',
  PENDING_REVIEW: 'info',
  PENDING_DELETION: 'warning',
  PERMANENTLY_DELETED: 'danger',
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  DEACTIVATED: 'Deactivated',
  BLOCKED: 'Blocked',
  PENDING_REVIEW: 'Pending Review',
  PENDING_DELETION: 'Pending Deletion',
  PERMANENTLY_DELETED: 'Permanently Deleted',
};

export function AdminStatusBadge({ status }: { status: UserAccountStatus | AdminAccountStatus }) {
  const variant = STATUS_VARIANT[status] ?? 'neutral';
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span className={`fk-badge fk-badge--${variant}`}>
      <span className="fk-badge__dot" />
      {label}
    </span>
  );
}

// spec-compatible alias used on the user table
export const UserStatusBadge = AdminStatusBadge;
