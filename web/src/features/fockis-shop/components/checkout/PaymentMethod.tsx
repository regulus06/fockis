import {
  CardElement,
} from '@stripe/react-stripe-js';

import type {
  CountryConfig,
  PaymentMethod as PaymentMethodType,
  TipOption,
} from '../../types/checkout.types';

type Props = {
  paymentMethod: PaymentMethodType;
  supportedPaymentMethods: PaymentMethodType[];
  countryConfig: CountryConfig;
  isHaiti: boolean;
  orderTotal: number;
  tipAmount: number;
  stripeReady: boolean;
  elementsReady: boolean;
  cardComplete: boolean;
  formatPrice: (amount: number) => string;
  onPaymentMethodChange: (
    method: PaymentMethodType,
  ) => void;
  onCardComplete: (
    complete: boolean,
  ) => void;
  onError: (
    error: string | null,
  ) => void;
  tipOption: TipOption;
  customTip: string;
  onTipOptionChange: (
    value: TipOption,
  ) => void;
  onCustomTipChange: (
    value: string,
  ) => void;
};

export function PaymentMethod({
  paymentMethod,
  countryConfig,
  orderTotal,
  tipAmount,
  formatPrice,
  onCardComplete,
  onError,
  tipOption,
  customTip,
  onTipOptionChange,
  onCustomTipChange,
  stripeReady,
  elementsReady,
  cardComplete,
}: Props) {
  const isCardPayment = paymentMethod === 'card';

  return (
    <section className="checkout-form-section">
      <h3>3. Payment</h3>

      <div
        style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: 14,
          color: '#334155',
        }}
      >
        <strong>
          Payment currency:
        </strong>{' '}
        {countryConfig.currency}{' '}
        ({countryConfig.currencySymbol})
      </div>

      {isCardPayment && (
        <div
          style={{
            border: '1px solid #dbe3ec',
            borderRadius: 10,
            padding: 18,
            background: '#ffffff',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <h4
                style={{
                  margin: 0,
                  fontSize: 17,
                  fontWeight: 700,
                  color: '#163a5f',
                }}
              >
                💳 Credit / Debit Card
              </h4>

              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: 13,
                  color: '#64748b',
                }}
              >
                Pay securely with Stripe.
              </p>
            </div>

            <div
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                background: '#f1f5f9',
                color: '#475569',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Stripe
            </div>
          </div>

          <label
            className="form-field"
            htmlFor="fockis-stripe-card"
            style={{
              display: 'block',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                display: 'block',
                marginBottom: 7,
                fontSize: 14,
                fontWeight: 600,
                color: '#334155',
              }}
            >
              Card information
            </span>
          </label>

          <div
            id="fockis-stripe-card"
            style={{
              minHeight: 52,
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px 12px',
              border: cardComplete
                ? '1px solid #16a34a'
                : '1px solid #cbd5e1',
              borderRadius: 8,
              background: '#ffffff',
            }}
          >
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    fontSize: '16px',
                    lineHeight: '24px',
                    color: '#1f2937',
                    fontFamily:
                      '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
                    fontSmoothing: 'antialiased',
                    '::placeholder': {
                      color: '#94a3b8',
                    },
                  },
                  invalid: {
                    color: '#dc2626',
                  },
                },
              }}
              onReady={() => {
                console.info(
                  '[FOCKIS STRIPE] CardElement mounted successfully.',
                );

                console.info(
                  '[FOCKIS STRIPE] CardElement ready state:',
                  {
                    stripeReady,
                    elementsReady,
                    cardComplete,
                  },
                );
              }}
              onChange={(event) => {
                console.info(
                  '[FOCKIS STRIPE] CardElement change:',
                  {
                    complete: event.complete,
                    empty: event.empty,
                    brand: event.brand,
                    error:
                      event.error?.message ?? null,
                  },
                );

                onCardComplete(
                  Boolean(event.complete),
                );

                onError(
                  event.error?.message ?? null,
                );
              }}
              onBlur={() => {
                console.info(
                  '[FOCKIS STRIPE] CardElement blur.',
                );
              }}
              onFocus={() => {
                console.info(
                  '[FOCKIS STRIPE] CardElement focus.',
                );
              }}
            />
          </div>

          <div
            style={{
              marginTop: 8,
              minHeight: 20,
              fontSize: 12,
            }}
          >
            {!stripeReady && (
              <span style={{ color: '#b45309' }}>
                Stripe is still loading...
              </span>
            )}

            {stripeReady &&
              !elementsReady && (
                <span style={{ color: '#b45309' }}>
                  Payment fields are still loading...
                </span>
              )}

            {stripeReady &&
              elementsReady &&
              !cardComplete && (
                <span style={{ color: '#64748b' }}>
                  Enter your card number, expiration date,
                  and security code.
                </span>
              )}

            {stripeReady &&
              elementsReady &&
              cardComplete && (
                <span style={{ color: '#15803d' }}>
                  ✓ Card information is complete.
                </span>
              )}
          </div>

          <p
            style={{
              margin: '10px 0 0',
              fontSize: 12,
              lineHeight: 1.5,
              color: '#64748b',
            }}
          >
            🔒 Your card information is securely
            processed by Stripe. Fockis does not
            store your full card number.
          </p>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
        }}
      >
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#334155',
          }}
        >
          Tip
        </label>

        <select
          value={tipOption}
          onChange={(event) =>
            onTipOptionChange(
              event.target.value as TipOption,
            )
          }
          style={{
            width: '100%',
            minHeight: 44,
            padding: '0 12px',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            background: '#ffffff',
            fontSize: 14,
          }}
        >
          <option value="none">
            No tip
          </option>

          <option value="5">
            5% tip
          </option>

          <option value="10">
            10% tip
          </option>

          <option value="15">
            15% tip
          </option>

          <option value="custom">
            Custom tip
          </option>
        </select>

        {tipOption === 'custom' && (
          <input
            type="number"
            min="0"
            step="0.01"
            value={customTip}
            onChange={(event) =>
              onCustomTipChange(
                event.target.value,
              )
            }
            placeholder="Enter tip amount"
            style={{
              width: '100%',
              minHeight: 44,
              marginTop: 8,
              padding: '0 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              boxSizing: 'border-box',
              fontSize: 14,
            }}
          />
        )}

        {tipAmount > 0 && (
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 13,
              color: '#475569',
            }}
          >
            Tip:{' '}
            {formatPrice(tipAmount)}
          </p>
        )}
      </div>

      <div
        className="payment-information"
        style={{
          marginTop: 20,
          padding: 14,
          borderRadius: 8,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          fontSize: 13,
          lineHeight: 1.7,
          color: '#475569',
        }}
      >
        <div>
          <strong>
            Payment:
          </strong>{' '}
          Credit / Debit Card
        </div>

        <div>
          <strong>
            Processor:
          </strong>{' '}
          Stripe
        </div>

        <div>
          <strong>
            Currency:
          </strong>{' '}
          {countryConfig.currency}{' '}
          ({countryConfig.currencySymbol})
        </div>

        <div>
          <strong>
            Order total:
          </strong>{' '}
          {formatPrice(
            orderTotal + tipAmount,
          )}
        </div>
      </div>
    </section>
  );
}