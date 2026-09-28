import type { OrderShippingAddress } from '../../types/order.types';
import type { CountryConfig } from '../../types/checkout.types';

import {
  COUNTRY_CONFIGS,
} from '../../utils/checkout';

type Props = {
  address: OrderShippingAddress;
  countryConfig: CountryConfig;
  isHaiti: boolean;
  onAddressChange: (
    address: OrderShippingAddress,
  ) => void;
  onCountryChange: (
    country: string,
  ) => void;
};

export function ShippingAddressForm({
  address,
  countryConfig,
  isHaiti,
  onAddressChange,
  onCountryChange,
}: Props) {
  return (
    <section className="checkout-form-section">
      <h3>1. Shipping address</h3>

      <div className="form-grid">
        <label className="form-field span-2">
          <span>Full name</span>

          <input
            type="text"
            required
            value={address.fullName}
            onChange={(event) =>
              onAddressChange({
                ...address,
                fullName:
                  event.target.value,
              })
            }
            autoComplete="name"
          />
        </label>

        <label className="form-field span-2">
          <span>Address line 1</span>

          <input
            type="text"
            required
            value={address.line1}
            onChange={(event) =>
              onAddressChange({
                ...address,
                line1:
                  event.target.value,
              })
            }
            autoComplete="street-address"
            placeholder={
              address.countryCode ===
              'HT'
                ? 'Street / House number'
                : '123 Main Street'
            }
          />
        </label>

        <label className="form-field span-2">
          <span>
            Address line 2 (optional)
          </span>

          <input
            type="text"
            value={
              address.line2 ?? ''
            }
            onChange={(event) =>
              onAddressChange({
                ...address,
                line2:
                  event.target.value,
              })
            }
            autoComplete="address-line2"
            placeholder={
              address.countryCode ===
              'HT'
                ? 'Neighborhood / landmark'
                : 'Apartment, suite, unit'
            }
          />
        </label>

        <label className="form-field">
          <span>
            {countryConfig.cityLabel}
          </span>

          <input
            type="text"
            required
            value={address.city}
            onChange={(event) =>
              onAddressChange({
                ...address,
                city:
                  event.target.value,
              })
            }
            autoComplete="address-level2"
          />
        </label>

        <label className="form-field">
          <span>
            {
              countryConfig.addressStateLabel
            }
          </span>

          <input
            type="text"
            value={
              address.state ?? ''
            }
            onChange={(event) =>
              onAddressChange({
                ...address,
                state:
                  event.target.value,
              })
            }
            autoComplete="address-level1"
          />
        </label>

        <label className="form-field">
          <span>
            {countryConfig.postalLabel}

            {!countryConfig.postalRequired && (
              <small
                style={{
                  marginLeft: 5,
                  color:
                    'var(--slate)',
                }}
              >
                (optional)
              </small>
            )}
          </span>

          <input
            type="text"
            required={
              countryConfig.postalRequired
            }
            value={
              address.postalCode
            }
            onChange={(event) =>
              onAddressChange({
                ...address,
                postalCode:
                  event.target.value,
              })
            }
            autoComplete="postal-code"
          />
        </label>

        <label className="form-field">
          <span>Country</span>

          <select
            className="shop-select"
            value={address.country}
            onChange={(event) =>
              onCountryChange(
                event.target.value,
              )
            }
          >
            {COUNTRY_CONFIGS.map(
              (config) => (
                <option
                  key={config.code}
                  value={config.name}
                >
                  {config.name} —{' '}
                  {config.currency}
                </option>
              ),
            )}

            <option value="Other">
              Other / International
            </option>
          </select>
        </label>

        <div className="form-field">
          <span>Currency</span>

          <div
            style={{
              minHeight: 44,
              display: 'flex',
              alignItems:
                'center',
              padding: '0 12px',
              border:
                '1px solid var(--line)',
              borderRadius: 5,
              background:
                'var(--paper)',
              fontWeight: 700,
            }}
          >
            {countryConfig.currency}{' '}
            (
            {
              countryConfig.currencySymbol
            }
            )
          </div>
        </div>

        <label className="form-field span-2">
          <span>
            Phone

            {countryConfig.phoneRequired ? (
              <strong
                style={{
                  color: '#dc2626',
                  marginLeft: 4,
                }}
              >
                *
              </strong>
            ) : (
              <small
                style={{
                  marginLeft: 5,
                  color:
                    'var(--slate)',
                }}
              >
                (optional)
              </small>
            )}
          </span>

          <input
            type="tel"
            required={
              countryConfig.phoneRequired
            }
            value={
              address.phone ?? ''
            }
            onChange={(event) =>
              onAddressChange({
                ...address,
                phone:
                  event.target.value,
              })
            }
            autoComplete="tel"
            placeholder={
              isHaiti
                ? '+509 XX XX XXXX'
                : ''
            }
          />
        </label>
      </div>

      {isHaiti && (
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 6,
            border:
              '1px solid var(--line)',
            background:
              'var(--paper)',
          }}
        >
          <strong>
            🇭🇹 Haiti delivery
          </strong>

          <p
            style={{
              margin: '7px 0 0',
              fontSize: 12,
              lineHeight: 1.5,
              color:
                'var(--slate)',
            }}
          >
            Enter your department,
            commune/city, street
            address, and a reachable
            Haitian phone number.
            Postal code is optional
            when your delivery
            location does not use one.
          </p>

          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Currency: HTG — Haitian
            Gourde
          </div>
        </div>
      )}
    </section>
  );
}