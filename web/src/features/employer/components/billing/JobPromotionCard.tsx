
import '../styles/JobPromotionCard.scss';

export type JobPromotionStatus =
  | 'not_promoted'
  | 'draft'
  | 'pending'
  | 'active'
  | 'paused'
  | 'completed'
  | 'rejected';

export type JobPromotionMetric = {
  id: string;
  label: string;
  value: number;
};

export type JobPromotionData = {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  status: JobPromotionStatus;
  promotionName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
  currency?: string | null;
  spent?: number | null;
  metrics?: JobPromotionMetric[];
  rejectionReason?: string | null;
};

export type JobPromotionCardProps = {
  promotion: JobPromotionData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPromote?: (jobId: string) => void;
  onViewCampaign?: (promotion: JobPromotionData) => void;
  onPause?: (promotion: JobPromotionData) => void;
  onResume?: (promotion: JobPromotionData) => void;
  onEdit?: (promotion: JobPromotionData) => void;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

const STATUS_LABELS: Record<JobPromotionStatus, string> = {
  not_promoted: 'Not promoted',
  draft: 'Draft',
  pending: 'Pending review',
  active: 'Promoted',
  paused: 'Paused',
  completed: 'Completed',
  rejected: 'Rejected',
};

function formatDate(value?: string | null): string {
  if (!value) return 'Not scheduled';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatMoney(
  amount: number | null | undefined,
  currency?: string | null,
): string {
  if (amount === null || amount === undefined) {
    return 'Not available';
  }

  if (!Number.isFinite(amount) || amount < 0) {
    return 'Invalid amount';
  }

  if (!currency) {
    return amount.toFixed(2);
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

function formatMetric(value: number): string {
  if (!Number.isFinite(value)) return '—';

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getBudgetPercentage(
  spent?: number | null,
  budget?: number | null,
): number | null {
  if (
    spent === null ||
    spent === undefined ||
    budget === null ||
    budget === undefined ||
    !Number.isFinite(spent) ||
    !Number.isFinite(budget) ||
    budget <= 0
  ) {
    return null;
  }

  return Math.min(100, Math.max(0, (spent / budget) * 100));
}

function PromotionIcon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };

  switch (name) {
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );

    case 'click':
      return (
        <svg {...common}>
          <path d="m5 3 13 10-6 1-3 6L5 3Z" />
          <path d="m13 14 5 6" />
        </svg>
      );

    case 'users':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case 'pause':
      return (
        <svg {...common}>
          <path d="M9 5v14M15 5v14" />
        </svg>
      );

    case 'play':
      return (
        <svg {...common}>
          <path d="m8 5 12 7-12 7V5Z" />
        </svg>
      );

    case 'edit':
      return (
        <svg {...common}>
          <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <path d="M12 3v18M3 12h18" />
        </svg>
      );
  }
}

function getMetricIcon(label: string): string {
  const normalized = label.toLowerCase();

  if (normalized.includes('view') || normalized.includes('impression')) {
    return 'eye';
  }

  if (normalized.includes('click')) {
    return 'click';
  }

  if (
    normalized.includes('applicant') ||
    normalized.includes('application')
  ) {
    return 'users';
  }

  return 'calendar';
}

export function JobPromotionCard({
  promotion,
  loading = false,
  error = null,
  onRetry,
  onPromote,
  onViewCampaign,
  onPause,
  onResume,
  onEdit,
  actionLoading = false,
  disabled = false,
  readOnly = false,
}: JobPromotionCardProps) {
  const isDisabled = disabled || loading || actionLoading;

  if (loading) {
    return (
      <section
        className="job-promotion-card job-promotion-card--loading"
        aria-label="Job promotion"
        aria-busy="true"
      >
        <div className="job-promotion-card__skeleton job-promotion-card__skeleton--title" />
        <div className="job-promotion-card__skeleton job-promotion-card__skeleton--large" />
        <div className="job-promotion-card__skeleton" />
        <div className="job-promotion-card__skeleton" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="job-promotion-card job-promotion-card--message"
        aria-label="Job promotion"
        role="alert"
      >
        <h2>Unable to load promotion</h2>
        <p>{error}</p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={disabled}
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!promotion) {
    return (
      <section
        className="job-promotion-card job-promotion-card--empty"
        aria-label="Job promotion"
      >
        <span className="job-promotion-card__empty-icon">
          <PromotionIcon name="play" />
        </span>

        <h2>Promote your job</h2>
        <p>
          Increase your job's visibility and help more qualified
          candidates discover your opportunity.
        </p>

        {!readOnly && onPromote && (
          <button
            type="button"
            className="job-promotion-card__primary-button"
            onClick={() => onPromote('')}
            disabled={disabled}
          >
            Explore promotion options
            <span aria-hidden="true">→</span>
          </button>
        )}
      </section>
    );
  }

  const percentage = getBudgetPercentage(
    promotion.spent,
    promotion.budget,
  );

  const isActive = promotion.status === 'active';
  const isPaused = promotion.status === 'paused';
  const isNotPromoted = promotion.status === 'not_promoted';
  const isRejected = promotion.status === 'rejected';

  const canPromote =
    !readOnly &&
    (isNotPromoted ||
      promotion.status === 'completed' ||
      isRejected);

  return (
    <section
      className="job-promotion-card"
      aria-label="Job promotion"
      aria-busy={actionLoading}
    >
      <header className="job-promotion-card__header">
        <div>
          <span className="job-promotion-card__eyebrow">
            JOB ADVERTISING
          </span>

          <h2>Job promotion</h2>

          <p>Manage visibility and campaign performance.</p>
        </div>

        <span
          className={`job-promotion-card__status job-promotion-card__status--${promotion.status}`}
        >
          <span />
          {STATUS_LABELS[promotion.status]}
        </span>
      </header>

      <div className="job-promotion-card__job">
        <div className="job-promotion-card__job-icon">
          <PromotionIcon name="users" />
        </div>

        <div className="job-promotion-card__job-info">
          <span>{promotion.companyName}</span>
          <h3>{promotion.jobTitle}</h3>

          {promotion.promotionName && (
            <small>{promotion.promotionName}</small>
          )}
        </div>
      </div>

      {isRejected && promotion.rejectionReason && (
        <div className="job-promotion-card__notice job-promotion-card__notice--danger">
          <strong>Promotion not approved</strong>
          <p>{promotion.rejectionReason}</p>
        </div>
      )}

      {promotion.status === 'pending' && (
        <div className="job-promotion-card__notice job-promotion-card__notice--info">
          <strong>Under review</strong>
          <p>
            Your promotion is awaiting review. Its campaign will
            become active only after approval.
          </p>
        </div>
      )}

      {isPaused && (
        <div className="job-promotion-card__notice job-promotion-card__notice--warning">
          <strong>Campaign paused</strong>
          <p>
            This promotion is currently paused. Resume it when you
            are ready to continue.
          </p>
        </div>
      )}

      {(isActive || isPaused || promotion.status === 'completed') && (
        <>
          <div className="job-promotion-card__campaign-dates">
            <div>
              <span>Campaign starts</span>
              <strong>{formatDate(promotion.startDate)}</strong>
            </div>

            <div>
              <span>Campaign ends</span>
              <strong>{formatDate(promotion.endDate)}</strong>
            </div>
          </div>

          <div className="job-promotion-card__budget">
            <div className="job-promotion-card__section-heading">
              <h3>Campaign budget</h3>

              <strong>
                {formatMoney(promotion.budget, promotion.currency)}
              </strong>
            </div>

            {promotion.spent !== null &&
              promotion.spent !== undefined && (
                <>
                  <div className="job-promotion-card__budget-details">
                    <span>Amount spent</span>
                    <strong>
                      {formatMoney(promotion.spent, promotion.currency)}
                    </strong>
                  </div>

                  {percentage !== null && (
                    <div
                      className="job-promotion-card__progress"
                      role="progressbar"
                      aria-label="Campaign budget used"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(percentage)}
                    >
                      <span
                        className={
                          percentage >= 90
                            ? 'job-promotion-card__progress-fill job-promotion-card__progress-fill--high'
                            : 'job-promotion-card__progress-fill'
                        }
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </>
              )}
          </div>
        </>
      )}

      {promotion.metrics && promotion.metrics.length > 0 && (
        <div className="job-promotion-card__metrics">
          <h3>Campaign performance</h3>

          <div className="job-promotion-card__metrics-grid">
            {promotion.metrics.map((metric) => (
              <article
                className="job-promotion-card__metric"
                key={metric.id}
              >
                <span className="job-promotion-card__metric-icon">
                  <PromotionIcon name={getMetricIcon(metric.label)} />
                </span>

                <div>
                  <strong>{formatMetric(metric.value)}</strong>
                  <span>{metric.label}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="job-promotion-card__actions">
        {canPromote && onPromote && (
          <button
            type="button"
            className="job-promotion-card__primary-button"
            onClick={() => onPromote(promotion.jobId)}
            disabled={isDisabled}
          >
            Promote job
            <span aria-hidden="true">→</span>
          </button>
        )}

        {isActive && onPause && !readOnly && (
          <button
            type="button"
            className="job-promotion-card__secondary-button"
            onClick={() => onPause(promotion)}
            disabled={isDisabled}
          >
            <PromotionIcon name="pause" />
            Pause campaign
          </button>
        )}

        {isPaused && onResume && !readOnly && (
          <button
            type="button"
            className="job-promotion-card__primary-button"
            onClick={() => onResume(promotion)}
            disabled={isDisabled}
          >
            <PromotionIcon name="play" />
            Resume campaign
          </button>
        )}

        {onViewCampaign && (
          <button
            type="button"
            className="job-promotion-card__secondary-button"
            onClick={() => onViewCampaign(promotion)}
            disabled={isDisabled}
          >
            View campaign
          </button>
        )}

        {onEdit && !readOnly && (
          <button
            type="button"
            className="job-promotion-card__edit-button"
            onClick={() => onEdit(promotion)}
            disabled={isDisabled}
          >
            <PromotionIcon name="edit" />
            Edit
          </button>
        )}
      </div>

      {actionLoading && (
        <p className="job-promotion-card__saving" role="status">
          Updating campaign...
        </p>
      )}

      <p className="job-promotion-card__disclaimer">
        Campaign status, budget, spending, and performance are
        supplied by the advertising service. Billing and promotion
        changes must be confirmed by the backend.
      </p>
    </section>
  );
}

export default JobPromotionCard;
