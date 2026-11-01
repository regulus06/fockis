
import { useState } from 'react';
import '../styles/EmployerJobStatus.scss';

export type EmployerJobStatusValue =
  | 'draft'
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected';

export type EmployerJobStatusProps = {
  jobId: string;
  status: EmployerJobStatusValue;
  isActive?: boolean;
  isApproved?: boolean;
  onStatusChange?: (
    jobId: string,
    nextStatus: EmployerJobStatusValue,
  ) => void | Promise<void>;
  loading?: boolean;
  saving?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  successMessage?: string | null;
  showDescription?: boolean;
  showHistoryHint?: boolean;
  compact?: boolean;
  allowedStatuses?: EmployerJobStatusValue[];
};

const STATUS_DETAILS: Record<
  EmployerJobStatusValue,
  { label: string; description: string; icon: string }
> = {
  draft: {
    label: 'Draft',
    description: 'This job has been saved but is not submitted for approval.',
    icon: '✎',
  },
  pending: {
    label: 'Pending approval',
    description: 'This job is awaiting platform review before publication.',
    icon: '◷',
  },
  active: {
    label: 'Active',
    description: 'This job is approved and currently available to candidates.',
    icon: '✓',
  },
  closed: {
    label: 'Closed',
    description: 'This job is no longer accepting applications.',
    icon: '■',
  },
  rejected: {
    label: 'Rejected',
    description: 'This job was not approved for publication.',
    icon: '!',
  },
};

const ALL_STATUSES: EmployerJobStatusValue[] = [
  'draft',
  'pending',
  'active',
  'closed',
  'rejected',
];

function normalizeStatus(
  status: EmployerJobStatusValue,
  isActive?: boolean,
  isApproved?: boolean,
): EmployerJobStatusValue {
  if (status === 'rejected') return 'rejected';
  if (status === 'draft') return 'draft';

  if (isActive === false || status === 'closed') return 'closed';

  if (isApproved === false || status === 'pending') return 'pending';

  if (isActive === true && isApproved === true) return 'active';

  return status;
}

function StatusSkeleton() {
  return (
    <div
      className="employer-job-status employer-job-status--skeleton"
      aria-label="Loading job status"
      aria-busy="true"
    >
      <span />
      <div>
        <span />
        <span />
      </div>
    </div>
  );
}

export function EmployerJobStatus({
  jobId,
  status,
  isActive,
  isApproved,
  onStatusChange,
  loading = false,
  saving = false,
  disabled = false,
  readOnly = false,
  error = null,
  successMessage = null,
  showDescription = true,
  showHistoryHint = true,
  compact = false,
  allowedStatuses = ALL_STATUSES,
}: EmployerJobStatusProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<EmployerJobStatusValue | ''>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) return <StatusSkeleton />;

  const currentStatus = normalizeStatus(status, isActive, isApproved);
  const details = STATUS_DETAILS[currentStatus];

  const canChange =
    Boolean(onStatusChange) &&
    !disabled &&
    !readOnly &&
    !saving;

  const availableStatuses = allowedStatuses.filter(
    (option) => option !== currentStatus,
  );

  const handleSelect = (value: string) => {
    if (!ALL_STATUSES.includes(value as EmployerJobStatusValue)) {
      setSelectedStatus('');
      return;
    }

    setSelectedStatus(value as EmployerJobStatusValue);
    setActionError(null);
    setConfirmOpen(false);
  };

  const handleConfirm = async () => {
    if (
      !selectedStatus ||
      !onStatusChange ||
      !canChange ||
      !availableStatuses.includes(selectedStatus)
    ) {
      return;
    }

    setActionError(null);

    try {
      await onStatusChange(jobId, selectedStatus);
      setSelectedStatus('');
      setConfirmOpen(false);
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update this job status. Please try again.',
      );
    }
  };

  return (
    <section
      className={[
        'employer-job-status',
        compact && 'employer-job-status--compact',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Job status"
      aria-busy={saving}
    >
      <div className="employer-job-status__main">
        <div className="employer-job-status__heading">
          <span className="employer-job-status__label">
            JOB STATUS
          </span>

          <span
            className={`employer-job-status__badge employer-job-status__badge--${currentStatus}`}
            role="status"
          >
            <span aria-hidden="true">{details.icon}</span>
            {details.label}
          </span>
        </div>

        {showDescription && (
          <p className="employer-job-status__description">
            {details.description}
          </p>
        )}
      </div>

      {onStatusChange && !readOnly && (
        <div className="employer-job-status__controls">
          <label htmlFor={`employer-job-status-${jobId}`}>
            Change job status
          </label>

          <select
            id={`employer-job-status-${jobId}`}
            value={selectedStatus}
            onChange={(event) => handleSelect(event.target.value)}
            disabled={!canChange || availableStatuses.length === 0}
          >
            <option value="">Select a status</option>
            {availableStatuses.map((option) => (
              <option key={option} value={option}>
                {STATUS_DETAILS[option].label}
              </option>
            ))}
          </select>

          {selectedStatus && (
            <div className="employer-job-status__confirmation">
              <p>
                Change job status to{' '}
                <strong>{STATUS_DETAILS[selectedStatus].label}</strong>?
              </p>

              <div>
                <button
                  type="button"
                  className="employer-job-status__cancel"
                  onClick={() => {
                    setSelectedStatus('');
                    setConfirmOpen(false);
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="employer-job-status__confirm"
                  onClick={() => setConfirmOpen(true)}
                  disabled={!canChange}
                >
                  Review change
                </button>
              </div>
            </div>
          )}

          {confirmOpen && selectedStatus && (
            <div
              className="employer-job-status__dialog-backdrop"
              role="presentation"
            >
              <div
                className="employer-job-status__dialog"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="employer-job-status-dialog-title"
                aria-describedby="employer-job-status-dialog-description"
              >
                <h3 id="employer-job-status-dialog-title">
                  Confirm job status change
                </h3>
                <p id="employer-job-status-dialog-description">
                  Change this job from {details.label} to{' '}
                  {STATUS_DETAILS[selectedStatus].label}?
                  The platform will enforce its approval and publication rules.
                </p>

                <div>
                  <button
                    type="button"
                    className="employer-job-status__cancel"
                    onClick={() => setConfirmOpen(false)}
                    disabled={saving}
                  >
                    Go back
                  </button>
                  <button
                    type="button"
                    className="employer-job-status__confirm"
                    onClick={handleConfirm}
                    disabled={!canChange}
                  >
                    {saving ? 'Updating…' : 'Confirm change'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {readOnly && (
        <span className="employer-job-status__readonly">
          Read-only
        </span>
      )}

      {error && (
        <div className="employer-job-status__error" role="alert">
          {error}
        </div>
      )}

      {actionError && (
        <div className="employer-job-status__error" role="alert">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="employer-job-status__success" role="status">
          {successMessage}
        </div>
      )}

      {showHistoryHint && (
        <p className="employer-job-status__history-hint">
          Status changes should be recorded in the job activity history.
        </p>
      )}
    </section>
  );
}

export default EmployerJobStatus;
