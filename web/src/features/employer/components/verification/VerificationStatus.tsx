
import EmployerStatusBadge from './EmployerStatusBadge';
import type { EmployerVerificationStatus } from './VerificationResult';
import '../styles/VerificationStatus.scss';

export interface VerificationStatusProps {
  status: EmployerVerificationStatus;
  submittedAt?: string;
  reviewedAt?: string;
  expiresAt?: string;
  referenceNumber?: string;
  message?: string;
  compact?: boolean;
  showDates?: boolean;
  showReference?: boolean;
  showDescription?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onViewDetails?: () => void;
  onRefresh?: () => void;
  actionLabel?: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  EmployerVerificationStatus,
  {
    label: string;
    tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
    description: string;
  }
> = {
  not_submitted: {
    label: 'Not submitted',
    tone: 'neutral',
    description: 'Business verification has not been submitted.',
  },
  pending: {
    label: 'Pending',
    tone: 'warning',
    description: 'Your submission is waiting for review.',
  },
  under_review: {
    label: 'Under review',
    tone: 'info',
    description: 'The verification team is reviewing your information.',
  },
  verified: {
    label: 'Verified',
    tone: 'success',
    description: 'Your business verification has been approved.',
  },
  rejected: {
    label: 'Rejected',
    tone: 'danger',
    description: 'Your verification submission was not approved.',
  },
  changes_requested: {
    label: 'Changes requested',
    tone: 'warning',
    description: 'Additional information or documents are required.',
  },
  expired: {
    label: 'Expired',
    tone: 'danger',
    description: 'Your business verification needs to be renewed.',
  },
};

function formatDate(value?: string): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function VerificationStatus({
  status,
  submittedAt,
  reviewedAt,
  expiresAt,
  referenceNumber,
  message,
  compact = false,
  showDates = true,
  showReference = false,
  showDescription = true,
  loading = false,
  disabled = false,
  onViewDetails,
  onRefresh,
  actionLabel = 'View verification',
  className = '',
}: VerificationStatusProps) {
  const config = STATUS_CONFIG[status];

  if (loading) {
    return (
      <section
        className={`verification-status verification-status--loading${compact ? ' verification-status--compact' : ''}`}
        aria-label="Verification status"
        aria-busy="true"
      >
        <div className="verification-status__skeleton verification-status__skeleton--badge" />
        {!compact && (
          <div className="verification-status__skeleton verification-status__skeleton--text" />
        )}
        <span className="verification-status__sr-only">
          Loading verification status
        </span>
      </section>
    );
  }

  return (
    <section
      className={[
        'verification-status',
        compact ? 'verification-status--compact' : '',
        `verification-status--${config.tone}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Business verification status"
    >
      <div className="verification-status__top">
        <div className="verification-status__identity">
          <span className="verification-status__label">
            Business verification
          </span>
          <EmployerStatusBadge
            status={status}
            label={config.label}
            tone={config.tone}
          />
        </div>

        {(onViewDetails || onRefresh) && (
          <div className="verification-status__actions">
            {onRefresh && (
              <button
                type="button"
                className="verification-status__refresh"
                onClick={onRefresh}
                disabled={disabled}
                aria-label="Refresh verification status"
                title="Refresh status"
              >
                ↻
              </button>
            )}

            {onViewDetails && (
              <button
                type="button"
                className="verification-status__view"
                onClick={onViewDetails}
                disabled={disabled}
              >
                {actionLabel}
              </button>
            )}
          </div>
        )}
      </div>

      {showDescription && (
        <p className="verification-status__description">
          {message || config.description}
        </p>
      )}

      {!compact && showDates && (
        <div className="verification-status__dates">
          {submittedAt && (
            <div>
              <span>Submitted</span>
              <strong>{formatDate(submittedAt)}</strong>
            </div>
          )}

          {reviewedAt && (
            <div>
              <span>Last reviewed</span>
              <strong>{formatDate(reviewedAt)}</strong>
            </div>
          )}

          {expiresAt && (
            <div>
              <span>Expires</span>
              <strong>{formatDate(expiresAt)}</strong>
            </div>
          )}
        </div>
      )}

      {!compact && showReference && referenceNumber && (
        <div className="verification-status__reference">
          <span>Reference number</span>
          <strong>{referenceNumber}</strong>
        </div>
      )}
    </section>
  );
}

export default VerificationStatus;
