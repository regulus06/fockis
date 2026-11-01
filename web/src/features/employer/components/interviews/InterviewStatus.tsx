
import { useState } from 'react';
import '../styles/InterviewStatus.scss';

export type InterviewStatusValue =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type InterviewStatusProps = {
  interviewId: string;
  status: InterviewStatusValue;
  onStatusChange?: (
    interviewId: string,
    nextStatus: InterviewStatusValue,
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
};

const STATUS_OPTIONS: {
  value: InterviewStatusValue;
  label: string;
  description: string;
}[] = [
  {
    value: 'scheduled',
    label: 'Scheduled',
    description: 'The interview has been scheduled but is not yet confirmed.',
  },
  {
    value: 'confirmed',
    label: 'Confirmed',
    description: 'The interview arrangements have been confirmed.',
  },
  {
    value: 'completed',
    label: 'Completed',
    description: 'The interview has taken place.',
  },
  {
    value: 'rescheduled',
    label: 'Rescheduled',
    description: 'The interview has been moved to another date or time.',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    description: 'The interview will no longer take place as scheduled.',
  },
];

const STATUS_ICONS: Record<InterviewStatusValue, string> = {
  scheduled: '◷',
  confirmed: '✓',
  completed: '✓',
  cancelled: '×',
  rescheduled: '↻',
};

function getStatusDescription(status: InterviewStatusValue): string {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)?.description ??
    'Interview status.'
  );
}

function isValidStatus(value: string): value is InterviewStatusValue {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

function InterviewStatusSkeleton() {
  return (
    <div
      className="interview-status interview-status--skeleton"
      aria-label="Loading interview status"
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

export function InterviewStatus({
  interviewId,
  status,
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
}: InterviewStatusProps) {
  const [pendingStatus, setPendingStatus] =
    useState<InterviewStatusValue | ''>('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading) {
    return <InterviewStatusSkeleton />;
  }

  const currentStatus = isValidStatus(status) ? status : 'scheduled';
  const currentDescription = getStatusDescription(currentStatus);
  const canChange =
    Boolean(onStatusChange) && !disabled && !readOnly && !saving;

  const handleStatusChange = async () => {
    if (
      !pendingStatus ||
      pendingStatus === currentStatus ||
      !onStatusChange ||
      !canChange
    ) {
      return;
    }

    setActionError(null);

    try {
      await onStatusChange(interviewId, pendingStatus);
      setPendingStatus('');
    } catch (updateError) {
      setActionError(
        updateError instanceof Error
          ? updateError.message
          : 'Unable to update interview status. Please try again.',
      );
    }
  };

  const handleSelection = (value: string) => {
    setActionError(null);
    setPendingStatus(isValidStatus(value) ? value : '');
  };

  return (
    <section
      className={[
        'interview-status',
        compact && 'interview-status--compact',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Interview status"
      aria-busy={saving}
    >
      <div className="interview-status__main">
        <div className="interview-status__heading">
          <span className="interview-status__label">
            INTERVIEW STATUS
          </span>

          <span
            className={`interview-status__badge interview-status__badge--${currentStatus}`}
            role="status"
          >
            <span aria-hidden="true">
              {STATUS_ICONS[currentStatus]}
            </span>
            {STATUS_OPTIONS.find(
              (option) => option.value === currentStatus,
            )?.label}
          </span>
        </div>

        {showDescription && (
          <p className="interview-status__description">
            {currentDescription}
          </p>
        )}
      </div>

      {onStatusChange && !readOnly && (
        <div className="interview-status__controls">
          <label htmlFor={`interview-status-${interviewId}`}>
            Change status
          </label>

          <select
            id={`interview-status-${interviewId}`}
            value={pendingStatus}
            onChange={(event) => handleSelection(event.target.value)}
            disabled={!canChange}
          >
            <option value="">Select a new status</option>
            {STATUS_OPTIONS.filter(
              (option) => option.value !== currentStatus,
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {pendingStatus && (
            <div className="interview-status__confirmation">
              <p>
                Change status to{' '}
                <strong>
                  {STATUS_OPTIONS.find(
                    (option) => option.value === pendingStatus,
                  )?.label}
                </strong>
                ?
              </p>

              <div>
                <button
                  type="button"
                  className="interview-status__cancel"
                  onClick={() => setPendingStatus('')}
                  disabled={saving}
                >
                  Keep current
                </button>

                <button
                  type="button"
                  className="interview-status__save"
                  onClick={handleStatusChange}
                  disabled={!canChange}
                >
                  {saving ? 'Updating…' : 'Confirm change'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {readOnly && (
        <span className="interview-status__readonly">
          Read-only
        </span>
      )}

      {error && (
        <div className="interview-status__error" role="alert">
          {error}
        </div>
      )}

      {actionError && (
        <div className="interview-status__error" role="alert">
          {actionError}
        </div>
      )}

      {successMessage && (
        <div className="interview-status__success" role="status">
          {successMessage}
        </div>
      )}

      {showHistoryHint && (
        <p className="interview-status__history-hint">
          Status changes should be recorded in the interview activity history.
        </p>
      )}
    </section>
  );
}

export default InterviewStatus;
