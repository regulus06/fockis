
import '../styles/EmployerPlanCard.scss';

export type EmployerPlanStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | 'paused';

export type EmployerPlanUsage = {
  id: string;
  label: string;
  used: number;
  limit: number | null;
  unit?: string;
};

export type EmployerPlan = {
  id: string;
  name: string;
  description?: string | null;
  status: EmployerPlanStatus;
  price: number;
  currency: string;
  billingInterval: 'month' | 'year' | 'week' | 'day' | 'custom';
  billingIntervalCount?: number;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  features: string[];
  usage?: EmployerPlanUsage[];
};

export type EmployerPlanCardProps = {
  plan: EmployerPlan | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onUpgrade?: () => void;
  onManageBilling?: () => void;
  onCancelPlan?: () => void;
  onReactivatePlan?: () => void;
  actionLoading?: boolean;
  disabled?: boolean;
  showCancelAction?: boolean;
};

const STATUS_LABELS: Record<EmployerPlanStatus, string> = {
  active: 'Active',
  trialing: 'Free trial',
  past_due: 'Payment overdue',
  cancelled: 'Cancelled',
  incomplete: 'Payment incomplete',
  paused: 'Paused',
};

function formatPrice(
  price: number,
  currency: string,
  interval: EmployerPlan['billingInterval'],
  intervalCount = 1,
): string {
  if (!Number.isFinite(price) || price < 0) {
    return 'Price unavailable';
  }

  let formatted: string;

  try {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(price);
  } catch {
    formatted = `${price.toFixed(2)} ${currency.toUpperCase()}`;
  }

  const intervalLabel =
    intervalCount > 1
      ? `every ${intervalCount} ${interval}s`
      : `/${interval}`;

  return `${formatted}${intervalLabel}`;
}

function formatDate(value?: string | null): string {
  if (!value) return 'Not available';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getUsagePercentage(usage: EmployerPlanUsage): number | null {
  if (
    usage.limit === null ||
    !Number.isFinite(usage.limit) ||
    usage.limit <= 0 ||
    !Number.isFinite(usage.used)
  ) {
    return null;
  }

  return Math.min(100, Math.max(0, (usage.used / usage.limit) * 100));
}

function formatUsageValue(value: number): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  }).format(value);
}

export function EmployerPlanCard({
  plan,
  loading = false,
  error = null,
  onRetry,
  onUpgrade,
  onManageBilling,
  onCancelPlan,
  onReactivatePlan,
  actionLoading = false,
  disabled = false,
  showCancelAction = true,
}: EmployerPlanCardProps) {
  const isDisabled = disabled || loading || actionLoading;

  if (loading) {
    return (
      <section
        className="employer-plan-card employer-plan-card--loading"
        aria-label="Employer subscription plan"
        aria-busy="true"
      >
        <div className="employer-plan-card__skeleton employer-plan-card__skeleton--title" />
        <div className="employer-plan-card__skeleton employer-plan-card__skeleton--price" />
        <div className="employer-plan-card__skeleton" />
        <div className="employer-plan-card__skeleton" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="employer-plan-card employer-plan-card--message"
        aria-label="Employer subscription plan"
        role="alert"
      >
        <h2>Unable to load your plan</h2>
        <p>{error}</p>

        {onRetry && (
          <button
            type="button"
            className="employer-plan-card__secondary-button"
            onClick={onRetry}
            disabled={disabled}
          >
            Try again
          </button>
        )}
      </section>
    );
  }

  if (!plan) {
    return (
      <section
        className="employer-plan-card employer-plan-card--empty"
        aria-label="Employer subscription plan"
      >
        <div className="employer-plan-card__empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M3 7h18l-2 13H5L3 7Z" />
            <path d="M8 7a4 4 0 0 1 8 0M8 12h8" />
          </svg>
        </div>

        <h2>No active employer plan</h2>
        <p>
          Your subscription information will appear here once a plan
          has been assigned to your employer account.
        </p>

        {onUpgrade && (
          <button
            type="button"
            className="employer-plan-card__primary-button"
            onClick={onUpgrade}
            disabled={disabled}
          >
            Explore plans
          </button>
        )}
      </section>
    );
  }

  const statusLabel = STATUS_LABELS[plan.status];
  const isCancelled = plan.status === 'cancelled';
  const isPastDue = plan.status === 'past_due';
  const isIncomplete = plan.status === 'incomplete';
  const isPaused = plan.status === 'paused';

  return (
    <section
      className="employer-plan-card"
      aria-label="Employer subscription plan"
      aria-busy={actionLoading}
    >
      <div className="employer-plan-card__top">
        <div>
          <span className="employer-plan-card__eyebrow">
            CURRENT SUBSCRIPTION
          </span>

          <h2>{plan.name}</h2>

          {plan.description && (
            <p className="employer-plan-card__description">
              {plan.description}
            </p>
          )}
        </div>

        <span
          className={`employer-plan-card__status employer-plan-card__status--${plan.status}`}
        >
          <span />
          {statusLabel}
        </span>
      </div>

      <div className="employer-plan-card__price">
        <strong>
          {formatPrice(
            plan.price,
            plan.currency,
            plan.billingInterval,
            plan.billingIntervalCount,
          )}
        </strong>

        <span>Subscription billing</span>
      </div>

      <div className="employer-plan-card__dates">
        <div>
          <span>Current billing period</span>
          <strong>
            {formatDate(plan.currentPeriodStart)} –{' '}
            {formatDate(plan.currentPeriodEnd)}
          </strong>
        </div>

        <div>
          <span>
            {plan.cancelAtPeriodEnd ? 'Access ends' : 'Next renewal'}
          </span>
          <strong>
            {formatDate(plan.currentPeriodEnd)}
          </strong>
        </div>
      </div>

      {plan.cancelAtPeriodEnd && (
        <div className="employer-plan-card__notice employer-plan-card__notice--warning">
          <strong>Cancellation scheduled</strong>
          <p>
            Your plan is scheduled to end at the close of the current
            billing period. Your access may continue until then.
          </p>
        </div>
      )}

      {(isPastDue || isIncomplete) && (
        <div className="employer-plan-card__notice employer-plan-card__notice--danger">
          <strong>Payment requires attention</strong>
          <p>
            Your subscription has a payment issue. Review your billing
            information to avoid interruption of service.
          </p>
        </div>
      )}

      {isPaused && (
        <div className="employer-plan-card__notice employer-plan-card__notice--warning">
          <strong>Subscription paused</strong>
          <p>
            Your subscription is currently paused. Contact billing
            support or use the available subscription controls.
          </p>
        </div>
      )}

      {plan.usage && plan.usage.length > 0 && (
        <div className="employer-plan-card__usage">
          <h3>Plan usage</h3>

          <div className="employer-plan-card__usage-list">
            {plan.usage.map((item) => {
              const percentage = getUsagePercentage(item);

              return (
                <div
                  className="employer-plan-card__usage-item"
                  key={item.id}
                >
                  <div className="employer-plan-card__usage-heading">
                    <span>{item.label}</span>

                    <strong>
                      {formatUsageValue(item.used)}
                      {item.unit ? ` ${item.unit}` : ''}

                      {item.limit !== null &&
                        ` / ${formatUsageValue(item.limit)}${
                          item.unit ? ` ${item.unit}` : ''
                        }`}
                    </strong>
                  </div>

                  {percentage !== null && (
                    <div
                      className="employer-plan-card__progress"
                      role="progressbar"
                      aria-label={`${item.label} usage`}
                      aria-valuenow={Math.round(percentage)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <span
                        className={
                          percentage >= 90
                            ? 'employer-plan-card__progress-fill employer-plan-card__progress-fill--high'
                            : 'employer-plan-card__progress-fill'
                        }
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}

                  {item.limit === null && (
                    <span className="employer-plan-card__unlimited">
                      No usage limit
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="employer-plan-card__features">
        <h3>Included features</h3>

        {plan.features.length > 0 ? (
          <ul>
            {plan.features.map((feature, index) => (
              <li key={`${plan.id}-feature-${index}`}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="m5 12 4 4L19 6" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        ) : (
          <p className="employer-plan-card__no-features">
            No feature details are currently available.
          </p>
        )}
      </div>

      <div className="employer-plan-card__actions">
        {onManageBilling && (
          <button
            type="button"
            className="employer-plan-card__primary-button"
            onClick={onManageBilling}
            disabled={isDisabled}
          >
            {actionLoading ? 'Please wait...' : 'Manage billing'}
          </button>
        )}

        {onUpgrade && !isCancelled && (
          <button
            type="button"
            className="employer-plan-card__secondary-button"
            onClick={onUpgrade}
            disabled={isDisabled}
          >
            Change plan
          </button>
        )}

        {isCancelled && onReactivatePlan && (
          <button
            type="button"
            className="employer-plan-card__primary-button"
            onClick={onReactivatePlan}
            disabled={isDisabled}
          >
            Reactivate plan
          </button>
        )}

        {showCancelAction &&
          !isCancelled &&
          !plan.cancelAtPeriodEnd &&
          onCancelPlan && (
            <button
              type="button"
              className="employer-plan-card__cancel-button"
              onClick={onCancelPlan}
              disabled={isDisabled}
            >
              Cancel subscription
            </button>
          )}
      </div>

      <p className="employer-plan-card__disclaimer">
        Subscription details are provided by your billing account.
        Changes take effect according to your subscription terms.
      </p>
    </section>
  );
}

export default EmployerPlanCard;
