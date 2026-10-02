import React from 'react';

import type {
  FockisIdPricing,
  FockisIdSettings,
} from '../types/messageAdmin.types';

interface FockisIdManagerProps {
  pricing: FockisIdPricing;
  settings: FockisIdSettings;
  onPricingChange: (value: FockisIdPricing) => void;
  onSettingsChange: (value: FockisIdSettings) => void;
  onSave?: () => void;
  saving?: boolean;
}

export default function FockisIdManager({
  pricing,
  settings,
  onPricingChange,
  onSettingsChange,
  onSave,
  saving = false,
}: FockisIdManagerProps): React.ReactElement {
  const priceDisplay =
    pricing.price === null ||
    pricing.price === undefined ||
    !Number.isFinite(Number(pricing.price))
      ? ''
      : String(pricing.price);

  const isFree =
    pricing.price !== null &&
    pricing.price !== undefined &&
    Number(pricing.price) === 0;

  return (
    <section className="fockis-id-manager">
      <div className="fockis-id-manager__header">
        <div>
          <span className="fockis-id-manager__eyebrow">
            FOCKIS ID
          </span>

          <h2>Fockis ID Management</h2>

          <p>
            Control Fockis ID registration, validation,
            and administrator-managed pricing.
          </p>
        </div>
      </div>

      <div className="fockis-id-manager__grid">
        <div className="fockis-id-manager__card">
          <h3>Registration</h3>

          <label className="admin-form-toggle">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  enabled: event.target.checked,
                })
              }
              disabled={saving}
            />

            <span>
              Allow Fockis ID registration
            </span>
          </label>

          <label>
            Minimum length

            <input
              type="number"
              min={1}
              value={settings.minLength}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  minLength: Number(
                    event.target.value,
                  ),
                })
              }
              disabled={saving}
            />
          </label>

          <label>
            Maximum length

            <input
              type="number"
              min={1}
              value={settings.maxLength}
              onChange={(event) =>
                onSettingsChange({
                  ...settings,
                  maxLength: Number(
                    event.target.value,
                  ),
                })
              }
              disabled={saving}
            />
          </label>
        </div>

        <div className="fockis-id-manager__card">
          <h3>Allowed Characters</h3>

          {[
            ['allowLetters', 'Letters'],
            ['allowNumbers', 'Numbers'],
            ['allowUnderscore', 'Underscore (_)'],
            ['allowHyphen', 'Hyphen (-)'],
          ].map(([key, label]) => (
            <label
              className="admin-form-toggle"
              key={key}
            >
              <input
                type="checkbox"
                checked={
                  settings[
                    key as keyof FockisIdSettings
                  ] as boolean
                }
                onChange={(event) =>
                  onSettingsChange({
                    ...settings,
                    [key]: event.target.checked,
                  })
                }
                disabled={saving}
              />

              <span>{label}</span>
            </label>
          ))}
        </div>

        <div className="fockis-id-manager__card">
          <h3>Pricing</h3>

          <p className="fockis-id-manager__pricing-description">
            The price configured here is stored in the
            Fockis ID settings and is used by the backend
            when determining the cost of Fockis ID access.
          </p>

          <label>
            Fockis ID price

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>
                {pricing.currency || 'USD'}
              </span>

              <input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="Enter price"
                value={priceDisplay}
                onChange={(event) => {
                  const raw =
                    event.target.value;

                  onPricingChange({
                    ...pricing,
                    price:
                      raw.trim() === ''
                        ? null
                        : Number(raw),
                  });
                }}
                disabled={saving}
              />
            </div>
          </label>

          <label>
            Currency

            <input
              type="text"
              maxLength={3}
              value={
                pricing.currency || 'USD'
              }
              onChange={(event) =>
                onPricingChange({
                  ...pricing,
                  currency:
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-Z]/g,
                        '',
                      )
                      .slice(0, 3),
                })
              }
              disabled={saving}
              placeholder="USD"
            />
          </label>

          <label className="admin-form-toggle">
            <input
              type="checkbox"
              checked={
                pricing.oneTime
              }
              onChange={(event) =>
                onPricingChange({
                  ...pricing,
                  oneTime:
                    event.target.checked,
                })
              }
              disabled={saving}
            />

            <span>
              One-time payment
            </span>
          </label>

          <label className="admin-form-toggle">
            <input
              type="checkbox"
              checked={
                pricing.recurring
              }
              onChange={(event) =>
                onPricingChange({
                  ...pricing,
                  recurring:
                    event.target.checked,
                })
              }
              disabled={saving}
            />

            <span>
              Recurring payment
            </span>
          </label>

          <label
            className={`admin-form-toggle ${
              isFree
                ? 'admin-form-toggle--disabled'
                : ''
            }`}
          >
            <input
              type="checkbox"
              checked={
                isFree
                  ? false
                  : pricing.requirePayment
              }
              onChange={(event) =>
                onPricingChange({
                  ...pricing,
                  requirePayment:
                    event.target.checked,
                })
              }
              disabled={
                saving || isFree
              }
            />

            <span>
              Require payment
            </span>
          </label>

          {isFree && (
            <p className="fockis-id-manager__notice">
              Fockis ID is currently free.
              Payment is automatically disabled
              when the price is 0.
            </p>
          )}

          {pricing.price === null && (
            <p className="fockis-id-manager__notice">
              No price has been configured yet.
              Enter a price and save the settings
              before requiring payment.
            </p>
          )}

          {pricing.recurring && (
            <p className="fockis-id-manager__notice">
              Recurring pricing is configured here,
              but recurring subscriptions also require
              backend subscription and webhook handling.
            </p>
          )}
        </div>
      </div>

      <div className="fockis-id-manager__summary">
        <div>
          <span>
            Current price
          </span>

          <strong>
            {pricing.price === null ||
            pricing.price === undefined ||
            !Number.isFinite(
              Number(pricing.price),
            )
              ? 'Not configured'
              : `${pricing.currency || 'USD'} ${Number(
                  pricing.price,
                ).toFixed(2)}`}
          </strong>
        </div>

        <div>
          <span>
            Billing
          </span>

          <strong>
            {pricing.recurring
              ? 'Recurring'
              : pricing.oneTime
                ? 'One-time'
                : 'Not configured'}
          </strong>
        </div>

        <div>
          <span>
            Payment required
          </span>

          <strong>
            {isFree
              ? 'No'
              : pricing.requirePayment
                ? 'Yes'
                : 'No'}
          </strong>
        </div>
      </div>

      {onSave && (
        <div className="fockis-id-manager__actions">
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : 'Save Fockis ID Settings'}
          </button>
        </div>
      )}
    </section>
  );
}