
import EmployerStatusBadge from './EmployerStatusBadge';
import '../styles/VerificationResult.scss';

export type EmployerVerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'changes_requested'
  | 'expired';

export interface VerificationResultEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  actor?: string;
}

export interface VerificationResultData {
  status: EmployerVerificationStatus;
  businessName?: string;
  referenceNumber?: string;
  submittedAt?: string;
  reviewedAt?: string;
  expiresAt?: string;
  reviewerMessage?: string;
  requiredActions?: string[];
  events?: VerificationResultEvent[];
}

export interface VerificationResultProps {
  result: VerificationResultData;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onResubmit?: () => void;
  onUploadDocuments?: () => void;
  onContactSupport?: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
  showTimeline?: boolean;
  showReferenceNumber?: boolean;
  title?: string;
}

const STATUS_CONFIG: Record<
  EmployerVerificationStatus,
  {
    label: string;
    tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger';
    heading: string;
    description: string;
    icon: string;
  }
> = {
  not_submitted: {
    label: 'Not submitted',
    tone: 'neutral',
    heading: 'Verification has not been submitted',
    description: 'Complete your business verification form and provide the required documents.',
    icon: '○',
  },
  pending: {
    label: 'Pending',
    tone: 'warning',
    heading: 'Your verification is awaiting review',
    description: 'Your submission has been received and is waiting for the verification team.',
    icon: '◷',
  },
  under_review: {
    label: 'Under review',
    tone: 'info',
    heading: 'Your business is under review',
    description: 'The verification team is currently reviewing your business information and documents.',
    icon: '⌕',
  },
  verified: {
    label: 'Verified',
    tone: 'success',
    heading: 'Your business is verified',
    description: 'Your employer verification has been approved.',
    icon: '✓',
  },
  rejected: {
    label: 'Rejected',
    tone: 'danger',
    heading: 'Your verification was not approved',
    description: 'Review the feedback below to understand the decision and available next steps.',
    icon: '!',
  },
  changes_requested: {
    label: 'Changes requested',
    tone: 'warning',
    heading: 'Additional information is required',
    description: 'Please review the requested changes and update your submission.',
    icon: '↻',
  },
  expired: {
    label: 'Expired',
    tone: 'danger',
    heading: 'Your verification has expired',
    description: 'Your business verification needs to be renewed.',
    icon: '!',
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
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function VerificationResult({
  result,
  loading = false,
  error = null,
  onRetry,
  onResubmit,
  onUploadDocuments,
  onContactSupport,
  onRefresh,
  disabled = false,
  showTimeline = true,
  showReferenceNumber = true,
  title = 'Verification result',
}: VerificationResultProps) {
  const config = STATUS_CONFIG[result.status];
  const isVerified = result.status === 'verified';
  const needsAction =
    result.status === 'changes_requested' ||
    result.status === 'rejected' ||
    result.status === 'expired' ||
    result.status === 'not_submitted';

  if (loading) {
    return (
      <section
        className="verification-result verification-result--loading"
        aria-label={title}
        aria-busy="true"
      >
        <div className="verification-result__skeleton verification-result__skeleton--heading" />
        <div className="verification-result__skeleton verification-result__skeleton--status" />
        <div className="verification-result__skeleton verification-result__skeleton--line" />
        <div className="verification-result__skeleton verification-result__skeleton--line" />
        <span className="verification-result__sr-only">
          Loading verification result
        </span>
      </section>
    );
  }

  return (
    <section className="verification-result" aria-label={title}>
      <header className="verification-result__header">
        <div>
          <h2>{title}</h2>
          {result.businessName && (
            <p>{result.businessName}</p>
          )}
        </div>

        <EmployerStatusBadge
          status={result.status}
          label={config.label}
          tone={config.tone}
        />
      </header>

      {error && (
        <div className="verification-result__error" role="alert">
          <span>{error}</span>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={disabled}>
              Try again
            </button>
          )}
        </div>
      )}

      <div
        className={`verification-result__hero verification-result__hero--${config.tone}`}
      >
        <div className="verification-result__hero-icon" aria-hidden="true">
          {config.icon}
        </div>

        <div className="verification-result__hero-copy">
          <h3>{config.heading}</h3>
          <p>{config.description}</p>
        </div>
      </div>

      {showReferenceNumber && result.referenceNumber && (
        <div className="verification-result__reference">
          <span>Verification reference</span>
          <strong>{result.referenceNumber}</strong>
        </div>
      )}

      <div className="verification-result__dates">
        <div>
          <span>Submitted</span>
          <strong>{formatDate(result.submittedAt)}</strong>
        </div>

        <div>
          <span>Last reviewed</span>
          <strong>{formatDate(result.reviewedAt)}</strong>
        </div>

        {result.expiresAt && (
          <div>
            <span>Verification expires</span>
            <strong>{formatDate(result.expiresAt)}</strong>
          </div>
        )}
      </div>

      {result.reviewerMessage && (
        <div className="verification-result__review">
          <h4>Review feedback</h4>
          <p>{result.reviewerMessage}</p>
        </div>
      )}

      {result.requiredActions && result.requiredActions.length > 0 && (
        <div className="verification-result__actions-needed">
          <h4>Required next steps</h4>
          <ul>
            {result.requiredActions.map((action, index) => (
              <li key={`${index}-${action}`}>
                <span aria-hidden="true">•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showTimeline && result.events && result.events.length > 0 && (
        <div className="verification-result__timeline">
          <h4>Verification history</h4>

          <ol>
            {result.events.map((event) => (
              <li key={event.id}>
                <span
                  className="verification-result__timeline-marker"
                  aria-hidden="true"
                />
                <div>
                  <strong>{event.title}</strong>
                  {event.description && <p>{event.description}</p>}
                  <small>
                    {formatDate(event.date)}
                    {event.actor ? ` · ${event.actor}` : ''}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isVerified && (
        <div className="verification-result__verified-note">
          <span aria-hidden="true">✓</span>
          <p>
            Your verification status is confirmed by the latest result
            supplied to this component.
          </p>
        </div>
      )}

      <footer className="verification-result__footer">
        {needsAction && onResubmit && (
          <button
            type="button"
            className="verification-result__primary"
            onClick={onResubmit}
            disabled={disabled}
          >
            {result.status === 'not_submitted'
              ? 'Start verification'
              : 'Update submission'}
          </button>
        )}

        {(result.status === 'changes_requested' ||
          result.status === 'rejected' ||
          result.status === 'expired') &&
          onUploadDocuments && (
            <button
              type="button"
              className="verification-result__secondary"
              onClick={onUploadDocuments}
              disabled={disabled}
            >
              Upload documents
            </button>
          )}

        {onRefresh && (
          <button
            type="button"
            className="verification-result__text-button"
            onClick={onRefresh}
            disabled={disabled}
          >
            Refresh status
          </button>
        )}

        {onContactSupport && (
          <button
            type="button"
            className="verification-result__text-button"
            onClick={onContactSupport}
            disabled={disabled}
          >
            Contact support
          </button>
        )}
      </footer>
    </section>
  );
}

export default VerificationResult;
