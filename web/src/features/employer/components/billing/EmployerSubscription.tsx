
import '../styles/EmployerSubscription.scss';

export type EmployerSubscriptionStatus =
  | 'active'
  | 'trialing'
  | 'past_due'
  | 'unpaid'
  | 'cancelled'
  | 'incomplete'
  | 'paused';

export type EmployerSubscriptionData = {
  id: string;
  planName: string;
  status: EmployerSubscriptionStatus;
  billingInterval: 'month' | 'year' | 'week' | 'day' | 'custom';
  amount: number;
  currency: string;
  startDate?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
  paymentMethod?: {
    brand?: string | null;
    last4?: string | null;
    expiryMonth?: number | null;
    expiryYear?: number | null;
  } | null;
};

export type EmployerSubscriptionProps = {
  subscription: EmployerSubscriptionData | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onManagePaymentMethod?: () => void;
  onChangePlan?: () => void;
  onCancelSubscription?: () => void;
  onReactivateSubscription?: () => void;
  onViewBillingHistory?: () => void;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

const STATUS_LABELS: Record<EmployerSubscriptionStatus, string> = {
  active: 'Active',
  trialing: 'Trial',
  past_due: 'Past due',
  unpaid: 'Unpaid',
  cancelled: 'Cancelled',
  incomplete: 'Incomplete',
  paused: 'Paused',
};

function formatAmount(amount: number, currency: string): string {
  if (!Number.isFinite(amount) || amount < 0) {
    return 'Price unavailable';
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

function formatDate(value?: string | null): string {
  if (!value) return '—';

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

function getPaymentMethodLabel(
  paymentMethod?: EmployerSubscriptionData['paymentMethod'],
): string {
  if (!paymentMethod) return 'No payment method available';

  const brand = paymentMethod.brand
    ? paymentMethod.brand.charAt(0).toUpperCase() +
      paymentMethod.brand.slice(1)
    : 'Card';

  if (!paymentMethod.last4) return brand;

  return `${brand} ending in ${paymentMethod.last4}`;
}

export function EmployerSubscription({
  subscription,
  loading = false,
  error = null,
  onRetry,
  onManagePaymentMethod,
  onChangePlan,
  onCancelSubscription,
  onReactivateSubscription,
  onViewBillingHistory,
  actionLoading = false,
  disabled = false,
  readOnly = false,
}: EmployerSubscriptionProps) {
  const isDisabled = disabled || loading || actionLoading;

  if (loading) {
    return (
      <section
        className="employer-subscription employer-subscription--loading"
        aria-label="Employer subscription"
        aria-busy="true"
      >
        <div className="employer-subscription__skeleton employer-subscription__skeleton--title" />
        <div className="employer-subscription__skeleton employer-subscription__skeleton--large" />
        <div className="employer-subscription__skeleton" />
        <div className="employer-subscription__skeleton" />
      </section>
    );
  }

  if (error) {
    return (
      <section
        className="employer-subscription employer-subscription--message"
        aria-label="Employer subscription"
        role="alert"
      >
        <h2>Unable to load subscription</h2>
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

  if (!subscription) {
    return (
      <section
        className="employer-subscription employer-subscription--empty"
        aria-label="Employer subscription"
      >
        <span className="employer-subscription__empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M7 15h3" />
          </svg>
        </span>

        <h2>No subscription found</h2>
        <p>
          Subscription information will appear here when your
          employer account has an active subscription.
        </p>

        {onChangePlan && !readOnly && (
          <button
            type="button"
            className="employer-subscription__primary-button"
            onClick={onChangePlan}
            disabled={disabled}
          >
            Explore plans
          </button>
        )}
      </section>
    );
  }

  const {
    status,
    planName,
    amount,
    currency,
    billingInterval,
    currentPeriodEnd,
    trialEndsAt,
    cancelAtPeriodEnd,
    cancelledAt,
    paymentMethod,
  } = subscription;

  const isCancelled = status === 'cancelled';
  const isPaymentIssue =
    status === 'past_due' ||
    status === 'unpaid' ||
    status === 'incomplete';

  const statusClass = `employer-subscription__status--${status}`;

  return (
    <section
      className="employer-subscription"
      aria-label="Employer subscription"
      aria-busy={actionLoading}
    >
      <header className="employer-subscription__header">
        <div>
          <span className="employer-subscription__eyebrow">
            SUBSCRIPTION MANAGEMENT
          </span>
          <h2>Your subscription</h2>
          <p>Manage your employer account subscription.</p>
        </div>

        <span
          className={`employer-subscription__status ${statusClass}`}
        >
          <span />
          {STATUS_LABELS[status]}
        </span>
      </header>

      <div className="employer-subscription__plan">
        <div className="employer-subscription__plan-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M3 7h18l-2 13H5L3 7Z" />
            <path d="M8 7a4 4 0 0 1 8 0" />
            <path d="M8 12h8" />
          </svg>
        </div>

        <div className="employer-subscription__plan-info">
          <span>Current plan</span>
          <h3>{planName}</h3>
          <strong>
            {formatAmount(amount, currency)}
            <small> / {billingInterval}</small>
          </strong>
        </div>
      </div>

      {cancelAtPeriodEnd && (
        <div className="employer-subscription__notice employer-subscription__notice--warning">
          <strong>Cancellation scheduled</strong>
          <p>
            Your subscription is scheduled to end on{' '}
            {formatDate(currentPeriodEnd)}. Your access may continue
            until that date.
          </p>
        </div>
      )}

      {isPaymentIssue && (
        <div className="employer-subscription__notice employer-subscription__notice--danger">
          <strong>Payment action required</strong>
          <p>
            There is a payment issue with your subscription. Review
            your payment method and billing details.
          </p>
        </div>
      )}

      {status === 'trialing' && (
        <div className="employer-subscription__notice employer-subscription__notice--info">
          <strong>Trial subscription</strong>
          <p>
            {trialEndsAt
              ? `Your trial is scheduled to end on ${formatDate(trialEndsAt)}.`
              : 'Your account is currently in a trial period.'}
          </p>
        </div>
      )}

      <div className="employer-subscription__details">
        <div className="employer-subscription__detail">
          <span>Subscription ID</span>
          <strong title={subscription.id}>{subscription.id}</strong>
        </div>

        <div className="employer-subscription__detail">
          <span>Billing frequency</span>
          <strong>
            {billingInterval.charAt(0).toUpperCase() +
              billingInterval.slice(1)}
          </strong>
        </div>

        <div className="employer-subscription__detail">
          <span>
            {cancelAtPeriodEnd ? 'Access ends' : 'Next billing date'}
          </span>
          <strong>{formatDate(currentPeriodEnd)}</strong>
        </div>

        <div className="employer-subscription__detail">
          <span>Started</span>
          <strong>{formatDate(subscription.startDate)}</strong>
        </div>

        {cancelledAt && (
          <div className="employer-subscription__detail">
            <span>Cancelled on</span>
            <strong>{formatDate(cancelledAt)}</strong>
          </div>
        )}
      </div>

      <div className="employer-subscription__payment">
        <div className="employer-subscription__payment-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <path d="M2 10h20M6 15h4" />
          </svg>
        </div>

        <div className="employer-subscription__payment-info">
          <span>Payment method</span>
          <strong>{getPaymentMethodLabel(paymentMethod)}</strong>

          {paymentMethod?.expiryMonth &&
            paymentMethod?.expiryYear && (
              <small>
                Expires {String(paymentMethod.expiryMonth).padStart(2, '0')}
                /{paymentMethod.expiryYear}
              </small>
            )}
        </div>

        {!readOnly && onManagePaymentMethod && (
          <button
            type="button"
            onClick={onManagePaymentMethod}
            disabled={isDisabled}
          >
            Update
          </button>
        )}
      </div>

      {!readOnly && (
        <div className="employer-subscription__actions">
          {onChangePlan && !isCancelled && (
            <button
              type="button"
              className="employer-subscription__secondary-button"
              onClick={onChangePlan}
              disabled={isDisabled}
            >
              Change plan
            </button>
          )}

          {onReactivateSubscription &&
            (isCancelled || cancelAtPeriodEnd) && (
              <button
                type="button"
                className="employer-subscription__primary-button"
                onClick={onReactivateSubscription}
                disabled={isDisabled}
              >
                Reactivate subscription
              </button>
            )}

          {onCancelSubscription &&
            !isCancelled &&
            !cancelAtPeriodEnd && (
              <button
                type="button"
                className="employer-subscription__cancel-button"
                onClick={onCancelSubscription}
                disabled={isDisabled}
              >
                Cancel subscription
              </button>
            )}

          {onViewBillingHistory && (
            <button
              type="button"
              className="employer-subscription__history-button"
              onClick={onViewBillingHistory}
              disabled={isDisabled}
            >
              View billing history
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      )}

      {actionLoading && (
        <p className="employer-subscription__saving" role="status">
          Updating subscription...
        </p>
      )}

      <p className="employer-subscription__disclaimer">
        Subscription information is provided by your billing
        provider. The backend is responsible for confirming all
        subscription changes.
      </p>
    </section>
  );
}

export default EmployerSubscription;
