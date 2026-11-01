
import '../styles/JobApprovalStatus.scss';

export type JobApprovalStatusValue =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'not_submitted';

export type JobApprovalStatusData = {
  status: JobApprovalStatusValue;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewerName?: string | null;
  feedback?: string | null;
  rejectionReason?: string | null;
};

export type JobApprovalStatusProps = {
  approval: JobApprovalStatusData;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  submitting?: boolean;
  onResubmit?: () => void | Promise<void>;
  onRetry?: () => void;
  showTimeline?: boolean;
  compact?: boolean;
};

const APPROVAL_DETAILS: Record<
  JobApprovalStatusValue,
  {
    label: string;
    title: string;
    description: string;
    icon: string;
  }
> = {
  not_submitted: {
    label: 'Not submitted',
    title: 'Your job has not been submitted',
    description:
      'Submit the job when it is ready for the platform review process.',
    icon: '○',
  },
  pending: {
    label: 'Pending review',
    title: 'Your job is being reviewed',
    description:
      'The platform review team has received this job listing. Publication is subject to approval.',
    icon: '◷',
  },
  approved: {
    label: 'Approved',
    title: 'Your job has been approved',
    description:
      'The platform has approved this job listing. Its publication status is managed separately.',
    icon: '✓',
  },
  rejected: {
    label: 'Rejected',
    title: 'Your job was not approved',
    description:
      'Review the feedback below and contact support if you need clarification.',
    icon: '!',
  },
  changes_requested: {
    label: 'Changes requested',
    title: 'Changes are required before approval',
    description:
      'Update the job listing according to the review feedback before resubmitting.',
    icon: '↻',
  },
};

function formatApprovalDate(value?: string | null): string {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Not available';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function ApprovalSkeleton() {
  return (
    <section
      className="job-approval-status job-approval-status--skeleton"
      aria-label="Loading approval status"
      aria-busy="true"
    >
      <span className="job-approval-status__skeleton-badge" />
      <span className="job-approval-status__skeleton-title" />
      <span className="job-approval-status__skeleton-copy" />
      <span className="job-approval-status__skeleton-copy job-approval-status__skeleton-copy--short" />
    </section>
  );
}

export function JobApprovalStatus({
  approval,
  loading = false,
  error = null,
  disabled = false,
  readOnly = false,
  submitting = false,
  onResubmit,
  onRetry,
  showTimeline = true,
  compact = false,
}: JobApprovalStatusProps) {
  if (loading) return <ApprovalSkeleton />;

  const details = APPROVAL_DETAILS[approval.status];

  const feedback =
    approval.feedback?.trim() || approval.rejectionReason?.trim() || '';

  const canResubmit =
    (approval.status === 'rejected' ||
      approval.status === 'changes_requested') &&
    Boolean(onResubmit) &&
    !disabled &&
    !readOnly &&
    !submitting;

  const handleResubmit = async () => {
    if (!canResubmit || !onResubmit) return;

    await onResubmit();
  };

  return (
    <section
      className={[
        'job-approval-status',
        `job-approval-status--${approval.status}`,
        compact && 'job-approval-status--compact',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Job approval status"
      aria-busy={submitting}
    >
      <div className="job-approval-status__header">
        <div className="job-approval-status__heading">
          <span className="job-approval-status__eyebrow">
            PLATFORM REVIEW
          </span>
          <span
            className={`job-approval-status__badge job-approval-status__badge--${approval.status}`}
            role="status"
          >
            <span aria-hidden="true">{details.icon}</span>
            {details.label}
          </span>
        </div>
      </div>

      <div className="job-approval-status__content">
        <h3>{details.title}</h3>
        <p>{details.description}</p>
      </div>

      {feedback && (
        <div className="job-approval-status__feedback">
          <div className="job-approval-status__feedback-heading">
            <span aria-hidden="true">i</span>
            <strong>Review feedback</strong>
          </div>
          <p>{feedback}</p>
        </div>
      )}

      {showTimeline && (
        <dl className="job-approval-status__metadata">
          {approval.submittedAt && (
            <div>
              <dt>Submitted</dt>
              <dd>{formatApprovalDate(approval.submittedAt)}</dd>
            </div>
          )}

          {approval.reviewedAt && (
            <div>
              <dt>Reviewed</dt>
              <dd>{formatApprovalDate(approval.reviewedAt)}</dd>
            </div>
          )}

          {approval.reviewerName && (
            <div>
              <dt>Reviewed by</dt>
              <dd>{approval.reviewerName}</dd>
            </div>
          )}
        </dl>
      )}

      {error && (
        <div className="job-approval-status__error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={disabled}>
              Retry
            </button>
          )}
        </div>
      )}

      {canResubmit && (
        <div className="job-approval-status__actions">
          <button
            type="button"
            className="job-approval-status__resubmit"
            onClick={handleResubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Resubmit for review'}
          </button>
        </div>
      )}

      {readOnly && (
        <span className="job-approval-status__readonly">
          Read-only
        </span>
      )}
    </section>
  );
}

export default JobApprovalStatus;
