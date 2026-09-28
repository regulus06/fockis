import React, {
  useEffect,
  useState,
} from 'react';

import type {
  FockisIdPricing,
} from '../types/messageAdmin.types';

interface FockisIdPricingFormProps {
  value: FockisIdPricing;
  onSave: (
    value: FockisIdPricing,
  ) => Promise<FockisIdPricing> | void;
  saving?: boolean;
}

export default function FockisIdPricingForm({
  value,
  saving = false,
  onSave,
}: FockisIdPricingFormProps): React.ReactElement {
  const [price, setPrice] = useState<string>('');
  const [currency, setCurrency] =
    useState<string>('USD');

  const [oneTime, setOneTime] =
    useState<boolean>(true);

  const [recurring, setRecurring] =
    useState<boolean>(false);

  const [requirePayment, setRequirePayment] =
    useState<boolean>(true);

  const [saved, setSaved] =
    useState<boolean>(false);

  const [error, setError] =
    useState<string | null>(null);

  // ==========================================================================
  // LOAD CURRENT SETTINGS
  // ==========================================================================

  useEffect(() => {
    if (
      value.price !== null &&
      value.price !== undefined &&
      Number.isFinite(Number(value.price))
    ) {
      setPrice(String(value.price));
    } else {
      setPrice('');
    }

    setCurrency(
      value.currency?.trim().toUpperCase() ||
        'USD',
    );

    setOneTime(value.oneTime ?? true);

    setRecurring(value.recurring ?? false);

    setRequirePayment(
      value.requirePayment ?? true,
    );

    setSaved(false);
    setError(null);
  }, [value]);

  // ==========================================================================
  // NORMALIZED PRICE
  // ==========================================================================

  const numericPrice =
    price.trim() === ''
      ? null
      : Number(price);

  const isFree =
    numericPrice !== null &&
    Number.isFinite(numericPrice) &&
    numericPrice === 0;

  // ==========================================================================
  // PRICE INPUT
  // ==========================================================================

  function handlePriceChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ): void {
    const nextValue =
      event.target.value;

    if (nextValue === '') {
      setPrice('');
      setSaved(false);
      setError(null);
      return;
    }

    // Allow:
    // 0
    // 5
    // 5.
    // 5.9
    // 5.99
    //
    // Maximum two decimal places.
    if (
      !/^\d*(\.\d{0,2})?$/.test(
        nextValue,
      )
    ) {
      return;
    }

    setPrice(nextValue);
    setSaved(false);
    setError(null);
  }

  // ==========================================================================
  // SAVE
  // ==========================================================================

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError(null);
    setSaved(false);

    if (
      numericPrice === null ||
      !Number.isFinite(numericPrice)
    ) {
      setError(
        'Please enter a Fockis ID price.',
      );
      return;
    }

    if (numericPrice < 0) {
      setError(
        'Fockis ID price cannot be negative.',
      );
      return;
    }

    const normalizedCurrency =
      currency.trim().toUpperCase();

    if (
      !/^[A-Z]{3}$/.test(
        normalizedCurrency,
      )
    ) {
      setError(
        'Currency must be a valid 3-letter currency code, such as USD.',
      );
      return;
    }

    if (!oneTime && !recurring) {
      setError(
        'Select either one-time pricing or recurring pricing.',
      );
      return;
    }

    const normalizedPrice =
      Math.round(
        numericPrice * 100,
      ) / 100;

    const pricing: FockisIdPricing = {
      price: normalizedPrice,
      currency: normalizedCurrency,
      oneTime,
      recurring,

      // A zero-price Fockis ID is always free.
      requirePayment:
        normalizedPrice === 0
          ? false
          : requirePayment,
    };

    try {
      await onSave(pricing);

      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save Fockis ID pricing.',
      );
    }
  }

  // ==========================================================================
  // MAKE FREE
  // ==========================================================================

  function makeFree(): void {
    setPrice('0');

    setRequirePayment(false);

    setOneTime(true);

    setRecurring(false);

    setSaved(false);

    setError(null);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <form
      className="fockis-id-pricing-form"
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
    >
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__header">
        <div>
          <h2 className="fockis-id-pricing-form__title">
            Fockis ID Pricing
          </h2>

          <p className="fockis-id-pricing-form__description">
            Set the price users must pay to
            activate access to their Fockis ID.
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ADMIN CONTROLLED NOTICE */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__free-banner">
        <div className="fockis-id-pricing-form__free-icon">
          $
        </div>

        <div>
          <strong>
            Admin-controlled pricing
          </strong>

          <p>
            The price entered here is stored in
            the Fockis ID settings and is used
            by the application when Fockis ID
            access is purchased.
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* PRICE */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__section">
        <h3>
          Fockis ID price
        </h3>

        <div className="fockis-id-pricing-form__field">
          <label htmlFor="fockis-id-price">
            Price
          </label>

          <div className="fockis-id-pricing-form__money">
            <span>
              {currency || 'USD'}
            </span>

            <input
              id="fockis-id-price"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={price}
              onChange={handlePriceChange}
              disabled={saving}
              placeholder="Enter price"
            />
          </div>

          <small>
            Enter the amount users must pay for
            Fockis ID access. Set to 0 to make
            it free.
          </small>
        </div>
      </div>

      {/* ================================================================== */}
      {/* CURRENCY */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__section">
        <h3>
          Currency
        </h3>

        <div className="fockis-id-pricing-form__field">
          <label htmlFor="fockis-id-currency">
            Currency code
          </label>

          <input
            id="fockis-id-currency"
            type="text"
            value={currency}
            onChange={(event) => {
              setCurrency(
                event.target.value
                  .toUpperCase()
                  .replace(/[^A-Z]/g, '')
                  .slice(0, 3),
              );

              setSaved(false);
              setError(null);
            }}
            maxLength={3}
            placeholder="USD"
            disabled={saving}
          />

          <small>
            Use a 3-letter currency code,
            such as USD.
          </small>
        </div>
      </div>

      {/* ================================================================== */}
      {/* BILLING */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__section">
        <h3>
          Billing
        </h3>

        <label className="fockis-id-pricing-form__toggle">
          <input
            type="checkbox"
            checked={oneTime}
            onChange={(event) => {
              setOneTime(
                event.target.checked,
              );

              setSaved(false);
              setError(null);
            }}
            disabled={saving}
          />

          <span>
            One-time payment
          </span>
        </label>

        <label className="fockis-id-pricing-form__toggle">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(event) => {
              setRecurring(
                event.target.checked,
              );

              setSaved(false);
              setError(null);
            }}
            disabled={saving}
          />

          <span>
            Recurring payment
          </span>
        </label>

        <label
          className={`fockis-id-pricing-form__toggle ${
            isFree
              ? 'fockis-id-pricing-form__toggle--disabled'
              : ''
          }`}
        >
          <input
            type="checkbox"
            checked={
              isFree
                ? false
                : requirePayment
            }
            onChange={(event) => {
              setRequirePayment(
                event.target.checked,
              );

              setSaved(false);
              setError(null);
            }}
            disabled={
              saving ||
              isFree
            }
          />

          <span>
            Require payment
          </span>
        </label>

        {isFree && (
          <p className="fockis-id-pricing-form__notice">
            Payment is automatically disabled
            because the Fockis ID price is
            $0.00.
          </p>
        )}

        {recurring && (
          <p className="fockis-id-pricing-form__notice">
            Recurring billing requires
            subscription and webhook handling
            on the backend. The pricing setting
            can be configured here, but access
            renewal must also be implemented
            server-side.
          </p>
        )}
      </div>

      {/* ================================================================== */}
      {/* SUMMARY */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__summary">
        <div>
          <span>
            Fockis ID price
          </span>

          <strong>
            {currency || 'USD'}{' '}

            {numericPrice !== null &&
            Number.isFinite(numericPrice)
              ? numericPrice.toFixed(2)
              : '—'}
          </strong>
        </div>

        <div>
          <span>
            Billing
          </span>

          <strong>
            {recurring
              ? 'Recurring'
              : 'One-time'}
          </strong>
        </div>

        <div>
          <span>
            Payment required
          </span>

          <strong>
            {isFree
              ? 'No'
              : requirePayment
                ? 'Yes'
                : 'No'}
          </strong>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ERROR */}
      {/* ================================================================== */}

      {error && (
        <div
          className="fockis-id-pricing-form__message fockis-id-pricing-form__message--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ================================================================== */}
      {/* SUCCESS */}
      {/* ================================================================== */}

      {saved && (
        <div
          className="fockis-id-pricing-form__message fockis-id-pricing-form__message--success"
          role="status"
        >
          Fockis ID pricing has been saved
          successfully.
        </div>
      )}

      {/* ================================================================== */}
      {/* ACTIONS */}
      {/* ================================================================== */}

      <div className="fockis-id-pricing-form__actions">
        <button
          type="button"
          className="fockis-id-pricing-form__free-button"
          onClick={makeFree}
          disabled={
            saving ||
            isFree
          }
        >
          Make Fockis ID Free
        </button>

        <button
          type="submit"
          className="fockis-id-pricing-form__save"
          disabled={saving}
        >
          {saving
            ? 'Saving...'
            : 'Save Pricing'}
        </button>
      </div>
    </form>
  );
}