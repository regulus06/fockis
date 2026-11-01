
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import '../styles/ApplicantStatus.scss';

export type ApplicantStatusValue =
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

export type ApplicantStatusProps = {
  applicantId: string;
  status: ApplicantStatusValue;
  onStatusChange: (
    applicantId: string,
    nextStatus: ApplicantStatusValue,
  ) => void | Promise<void>;
  loading?: boolean;
  saving?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string | null;
  showDescription?: boolean;
};

const STATUS_OPTIONS: {
  value: ApplicantStatusValue;
  label: string;
  description: string;
}[] = [
  {
    value: 'applied',
    label: 'Applied',
    description: 'Application received and awaiting review.',
  },
  {
    value: 'viewed',
    label: 'Viewed',
    description: 'The application has been reviewed.',
  },
  {
    value: 'shortlisted',
    label: 'Shortlisted',
    description: 'Candidate selected for further consideration.',
  },
  {
    value: 'interview',
    label: 'Interview',
    description: 'Candidate is in the interview stage.',
  },
  {
    value: 'offer',
    label: 'Offer',
    description: 'An employment offer has been made.',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    description: 'Candidate is no longer being considered.',
  },
];

export function ApplicantStatus({
  applicantId,
  status,
  onStatusChange,
  loading = false,
  saving = false,
  disabled = false,
  readOnly = false,
  error = null,
  showDescription = true,
}: ApplicantStatusProps) {
  const [pendingStatus, setPendingStatus] =
    useState<ApplicantStatusValue | null>(null);

  const currentStatus = STATUS_OPTIONS.find(
    (option) => option.value === status,
  );

  const selectedStatus = STATUS_OPTIONS.find(
    (option) => option.value === (pendingStatus ?? status),
  );

  const isDisabled = disabled || loading || saving || readOnly;

  const handleChange = async (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextStatus = event.target.value as ApplicantStatusValue;

    if (
      !STATUS_OPTIONS.some((option) => option.value === nextStatus) ||
      nextStatus === status
    ) {
      return;
    }

    setPendingStatus(nextStatus);

    try {
      await onStatusChange(applicantId, nextStatus);
    } catch {
      // The parent owns API error reporting and displays it through `error`.
    } finally {
      setPendingStatus(null);
    }
  };

  if (loading) {
    return (
      <section
        className="applicant-status"
        aria-label="Applicant status"
        aria-busy="true"
      >
        <div className="applicant-status__skeleton" />
      </section>
    );
  }

  if (!currentStatus) {
    return (
      <section
        className="applicant-status applicant-status--error"
        aria-label="Applicant status"
      >
        <p>Unknown applicant status. Refresh the application to continue.</p>
      </section>
    );
  }

  return (
    <section
      className="applicant-status"
      aria-label="Applicant status"
      aria-busy={saving}
    >
      <div className="applicant-status__header">
        <div>
          <h2>Application status</h2>
          <p>Track this candidate's recruitment progress.</p>
        </div>

        <span className="applicant-status__current-label">
          Current status
        </span>
      </div>

      <div className="applicant-status__current">
        <span
          className={`applicant-status__badge applicant-status__badge--${status}`}
        >
          <span className="applicant-status__indicator" />
          {currentStatus.label}
        </span>

        {showDescription && (
          <p className="applicant-status__description">
            {currentStatus.description}
          </p>
        )}
      </div>

      {!readOnly && (
        <div className="applicant-status__editor">
          <label htmlFor={`applicant-status-${applicantId}`}>
            Update status
          </label>

          <div className="applicant-status__select-wrap">
            <select
              id={`applicant-status-${applicantId}`}
              value={pendingStatus ?? status}
              onChange={handleChange}
              disabled={isDisabled}
              aria-describedby={`applicant-status-help-${applicantId}`}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {saving && (
              <span className="applicant-status__saving">
                Saving...
              </span>
            )}
          </div>

          <p
            id={`applicant-status-help-${applicantId}`}
            className="applicant-status__help"
          >
            Changes are saved through the employer application workflow.
          </p>
        </div>
      )}

      {selectedStatus && pendingStatus && saving && (
        <p className="applicant-status__pending" role="status">
          Updating status to {selectedStatus.label}...
        </p>
      )}

      {error && (
        <p className="applicant-status__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}

export default ApplicantStatus;
