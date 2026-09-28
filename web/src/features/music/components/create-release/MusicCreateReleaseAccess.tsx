import {
  ACCESS_OPTIONS,
  COUNTRIES,
} from '../../constants/musicCreateRelease.constants';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseAccess() {
  const {
    form,
    saving,
    requiresPrice,
    showPreviewDuration,
    selectedCountry,
    formattedPrice,
    updateField,
  } = useMusicCreateRelease();

  return (
    <section className="music-create-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            STEP 4
          </span>

          <h2>
            Access & monetization
          </h2>

          <p>
            Choose who can access your
            content and where you are
            selling it.
          </p>
        </div>
      </div>

      <div className="music-access-grid">
        {ACCESS_OPTIONS.map(
          (option) => (
            <button
              type="button"
              key={option.value}
              className={`music-access-option ${
                form.accessType ===
                option.value
                  ? 'music-access-option--active'
                  : ''
              }`}
              onClick={() => {
                updateField(
                  'accessType',
                  option.value,
                );

                if (
                  option.value ===
                    'free' ||
                  option.value ===
                    'premium' ||
                  option.value ===
                    'exclusive'
                ) {
                  updateField(
                    'price',
                    '0',
                  );
                }
              }}
              disabled={saving}
            >
              <strong>
                {option.label}
              </strong>

              <span>
                {option.description}
              </span>
            </button>
          ),
        )}
      </div>

      <div className="music-country-currency-section">
        <div className="music-country-currency-header">
          <div>
            <strong>
              🌎 Selling country
            </strong>

            <small>
              Choose the creator's selling
              country. Fockis automatically
              selects its currency.
            </small>
          </div>
        </div>

        <div className="music-form-grid music-form-grid--pricing">
          <label className="music-form-field">
            <span>
              Country <b>*</b>
            </span>

            <select
              value={
                form.countryCode
              }
              onChange={(event) =>
                updateField(
                  'countryCode',
                  event.target.value,
                )
              }
              disabled={saving}
            >
              {COUNTRIES.map(
                (country) => (
                  <option
                    key={country.code}
                    value={
                      country.code
                    }
                  >
                    {country.flag}{' '}
                    {country.name}
                  </option>
                ),
              )}
            </select>

            <small>
              Currency changes
              automatically.
            </small>
          </label>

          <div className="music-form-field">
            <span>
              Currency
            </span>

            <div className="music-auto-currency">
              <strong>
                {selectedCountry.symbol}
              </strong>

              <div>
                <strong>
                  {
                    selectedCountry.currency
                  }
                </strong>

                <small>
                  {
                    selectedCountry.currencyName
                  }
                </small>
              </div>

              <span className="music-auto-currency-lock">
                AUTO
              </span>
            </div>

            <small>
              Determined automatically from
              the selected country.
            </small>
          </div>
        </div>
      </div>

      {requiresPrice && (
        <div className="music-form-grid music-form-grid--pricing">
          <label className="music-form-field">
            <span>
              Price (
              {
                selectedCountry.currency
              }) <b>*</b>
            </span>

            <div className="music-price-input">
              <span>
                {
                  selectedCountry.symbol
                }
              </span>

              <input
                type="number"
                min="0.01"
                max="999999"
                step={
                  selectedCountry.decimals ===
                  0
                    ? '1'
                    : '0.01'
                }
                value={
                  form.price
                }
                onChange={(event) =>
                  updateField(
                    'price',
                    event.target.value,
                  )
                }
                disabled={saving}
              />
            </div>

            <small>
              Customers pay{' '}
              <strong>
                {formattedPrice}
              </strong>
              .
            </small>
          </label>

          {showPreviewDuration && (
            <label className="music-form-field">
              <span>
                Preview duration
              </span>

              <div className="music-price-input">
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={
                    form.previewDurationSeconds
                  }
                  onChange={(event) =>
                    updateField(
                      'previewDurationSeconds',
                      event.target.value,
                    )
                  }
                  disabled={saving}
                />

                <span>
                  sec
                </span>
              </div>

              <small>
                Viewers can preview this
                amount before purchasing.
              </small>
            </label>
          )}
        </div>
      )}

      <div className="music-option-toggles">
        <label className="music-toggle">
          <input
            type="checkbox"
            checked={
              form.isFeatured
            }
            onChange={(event) =>
              updateField(
                'isFeatured',
                event.target.checked,
              )
            }
            disabled={saving}
          />

          <span>
            <strong>
              Request featured placement
            </strong>

            <small>
              Request potential featured
              placement across Fockis.
            </small>
          </span>
        </label>

        <label className="music-toggle">
          <input
            type="checkbox"
            checked={
              form.isExclusive
            }
            onChange={(event) =>
              updateField(
                'isExclusive',
                event.target.checked,
              )
            }
            disabled={saving}
          />

          <span>
            <strong>
              Make content exclusive
            </strong>

            <small>
              Position this content as
              premium creator content.
            </small>
          </span>
        </label>
      </div>
    </section>
  );
}