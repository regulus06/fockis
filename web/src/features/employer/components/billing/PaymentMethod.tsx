
import { useState } from 'react';
import type { FormEvent } from 'react';
import '../styles/PaymentMethod.scss';

export type EmployerPaymentMethod = {
  id: string;
  provider?: string | null;
  type: 'card' | 'bank_account' | 'other';
  brand?: string | null;
  last4: string;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  cardholderName?: string | null;
  isDefault: boolean;
  createdAt?: string | null;
};

export type PaymentMethodProps = {
  paymentMethods: EmployerPaymentMethod[];
  loading?: boolean;
  error?: string | null;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  onRetry?: () => void;
  onAdd?: () => void;
  onUpdate?: (paymentMethod: EmployerPaymentMethod) => void;
  onRemove?: (paymentMethod: EmployerPaymentMethod) => void;
  onSetDefault?: (paymentMethod: EmployerPaymentMethod) => void;
};

function formatBrand(brand?: string | null): string {
  if (!brand) return 'Payment card';

  const normalized = brand.toLowerCase();

  const brands: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    american_express: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  };

  return brands[normalized] ?? brand;
}

function formatExpiration(
  month?: number | null,
  year?: number | null,
): string {
  if (!month || !year || month < 1 || month > 12) {
    return 'Expiration unavailable';
  }

  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

function isExpired(
  month?: number | null,
  year?: number | null,
): boolean {
  if (!month || !year || month < 1 || month > 12) {
    return false;
  }

  const now = new Date();
  const expiration = new Date(year, month, 1);

  return expiration <= new Date(now.getFullYear(), now.getMonth(), 1);
}

function PaymentIcon({ brand }: { brand?: string | null }) {
  const normalized = brand?.toLowerCase() ?? '';

  return (
    <span
      className={`payment-method__brand-icon payment-method__brand-icon--${normalized.replace(/[^a-z0-9_-]/g, '')}`}
      aria-hidden="true"
    >
      {normalized === 'visa'
        ? 'VISA'
        : normalized === 'mastercard'
          ? '● ●'
          : normalized === 'amex' ||
              normalized === 'american_express'
            ? 'AMEX'
            : normalized === 'discover'
              ? 'DISC'
              : 'CARD'}
    </span>
  );
}

function PaymentMethodSkeleton() {
  return (
    <div
      className="payment-method__skeleton"
      aria-busy="true"
      aria-label="Loading payment methods"
    >
      <span />
      <span />
      <span />
    </div>
  );
}

export function PaymentMethod({
  paymentMethods,
  loading = false,
  error = null,
  actionLoading = false,
  disabled = false,
  readOnly = false,
  onRetry,
  onAdd,
  onUpdate,
  onRemove,
  onSetDefault,
}: PaymentMethodProps) {
  const [confirmRemove, setConfirmRemove] =
    useState<EmployerPaymentMethod | null>(null);

  const isDisabled = disabled || loading || actionLoading;

  const handleRemove = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!confirmRemove || !onRemove || isDisabled) return;

    onRemove(confirmRemove);
    setConfirmRemove(null);
  };

  return (
    <section
      className="payment-method"
      aria-label="Payment methods"
      aria-busy={loading || actionLoading}
    >
      <header className="payment-method__header">
        <div>
          <span className="payment-method__eyebrow">
            BILLING SETTINGS
          </span>
          <h2>Payment methods</h2>
          <p>
            Manage the payment methods used for your employer account.
          </p>
        </div>

        {!readOnly && onAdd && (
          <button
            type="button"
            className="payment-method__add-button"
            onClick={onAdd}
            disabled={isDisabled}
          >
            <span aria-hidden="true">+</span>
            Add payment method
          </button>
        )}
      </header>

      <div className="payment-method__security-note">
        <span aria-hidden="true">⌑</span>
        <p>
          Your payment details are securely handled by the payment
          provider. Fockis does not display or store your full card
          number or security code in this component.
        </p>
      </div>

      {loading ? (
        <PaymentMethodSkeleton />
      ) : error ? (
        <div className="payment-method__message payment-method__message--error" role="alert">
          <h3>Unable to load payment methods</h3>
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
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="payment-method__empty">
          <span className="payment-method__empty-icon" aria-hidden="true">
            +
          </span>
          <h3>No payment methods added</h3>
          <p>
            Add a payment method to manage future employer account
            purchases and subscriptions.
          </p>

          {!readOnly && onAdd && (
            <button
              type="button"
              className="payment-method__add-button"
              onClick={onAdd}
              disabled={isDisabled}
            >
              Add your first payment method
            </button>
          )}
        </div>
      ) : (
        <div className="payment-method__list">
          {paymentMethods.map((method) => {
            const expired =
              method.type === 'card' &&
              isExpired(method.expiryMonth, method.expiryYear);

            return (
              <article
                className={`payment-method__item${expired ? ' payment-method__item--expired' : ''}`}
                key={method.id}
              >
                <div className="payment-method__item-main">
                  <div className="payment-method__card">
                    <PaymentIcon brand={method.brand} />
                  </div>

                  <div className="payment-method__details">
                    <div className="payment-method__name">
                      <h3>
                        {method.type === 'card'
                          ? formatBrand(method.brand)
                          : method.type === 'bank_account'
                            ? 'Bank account'
                            : 'Payment method'}
                      </h3>

                      {method.isDefault && (
                        <span className="payment-method__default-badge">
                          Default
                        </span>
                      )}
                    </div>

                    <p>
                      {method.type === 'bank_account'
                        ? `Account ending in ${method.last4}`
                        : `Ending in ${method.last4}`}
                    </p>

                    {method.cardholderName && (
                      <span className="payment-method__cardholder">
                        {method.cardholderName}
                      </span>
                    )}

                    {method.type === 'card' && (
                      <span
                        className={
                          expired
                            ? 'payment-method__expiration payment-method__expiration--expired'
                            : 'payment-method__expiration'
                        }
                      >
                        {expired ? 'Expired · ' : 'Expires '}
                        {formatExpiration(
                          method.expiryMonth,
                          method.expiryYear,
                        )}
                      </span>
                    )}

                    {method.provider && (
                      <span className="payment-method__provider">
                        Managed by {method.provider}
                      </span>
                    )}
                  </div>
                </div>

                {!readOnly && (
                  <div className="payment-method__actions">
                    {!method.isDefault && onSetDefault && (
                      <button
                        type="button"
                        className="payment-method__text-button"
                        onClick={() => onSetDefault(method)}
                        disabled={isDisabled}
                      >
                        Set as default
                      </button>
                    )}

                    {onUpdate && (
                      <button
                        type="button"
                        className="payment-method__text-button"
                        onClick={() => onUpdate(method)}
                        disabled={isDisabled}
                      >
                        Update
                      </button>
                    )}

                    {onRemove && (
                      <button
                        type="button"
                        className="payment-method__remove-button"
                        onClick={() => setConfirmRemove(method)}
                        disabled={isDisabled}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {actionLoading && (
        <p className="payment-method__status-message" role="status">
          Updating payment method...
        </p>
      )}

      {confirmRemove && (
        <div
          className="payment-method__dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmRemove(null);
            }
          }}
        >
          <form
            className="payment-method__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-remove-title"
            onSubmit={handleRemove}
          >
            <span className="payment-method__dialog-icon" aria-hidden="true">
              !
            </span>

            <h3 id="payment-remove-title">
              Remove payment method?
            </h3>

            <p>
              Remove the payment method ending in{' '}
              <strong>{confirmRemove.last4}</strong>?
              {confirmRemove.isDefault
                ? ' You may need to select another default payment method.'
                : ''}
            </p>

            <div className="payment-method__dialog-actions">
              <button
                type="button"
                className="payment-method__cancel-button"
                onClick={() => setConfirmRemove(null)}
                disabled={isDisabled}
              >
                Keep payment method
              </button>

              <button
                type="submit"
                className="payment-method__confirm-remove"
                disabled={isDisabled}
              >
                {actionLoading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

export default PaymentMethod;
