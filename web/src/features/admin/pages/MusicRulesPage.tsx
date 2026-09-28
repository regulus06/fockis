import {
  useMusicRulesAdmin,
} from '../hooks/useMusicRulesAdmin';

import '../styles/MusicRulesAdmin.scss';

function NumberField({
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="music-rules-field">
      <span className="music-rules-field__label">
        {label}
      </span>

      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(
            event.target.value,
          );

          onChange(
            Number.isFinite(next)
              ? next
              : min,
          );
        }}
      />
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="music-rules-toggle">
      <span className="music-rules-toggle__content">
        <strong>{label}</strong>

        {description && (
          <small>
            {description}
          </small>
        )}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(event.target.checked)
        }
      />

      <span className="music-rules-toggle__switch" />
    </label>
  );
}

export default function MusicRulesPage() {
  const {
    rules,
    loading,
    saving,
    saved,
    error,

    updateReleaseRule,
    updatePreview,
    updatePricing,
    updatePublishing,
    updateVideo,

    saveRules,
    resetRules,
  } = useMusicRulesAdmin();

  if (loading) {
    return (
      <div className="music-rules-page">
        <div className="music-rules-loading">
          <div className="music-rules-spinner" />

          <p>
            Loading music platform rules...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="music-rules-page">
      <div className="music-rules-shell">

        {/* HEADER */}

        <header className="music-rules-header">
          <div>
            <span className="music-rules-eyebrow">
              SUPER ADMIN
            </span>

            <h1>
              Music Rules
            </h1>

            <p>
              Control the platform-wide rules
              for music, albums, videos and
              creator releases.
            </p>
          </div>

          <div className="music-rules-header__actions">
            <button
              type="button"
              className="music-rules-button music-rules-button--secondary"
              onClick={() => void resetRules()}
              disabled={saving}
            >
              Reset Defaults
            </button>

            <button
              type="button"
              className="music-rules-button music-rules-button--primary"
              onClick={() => void saveRules()}
              disabled={saving}
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>
          </div>
        </header>

        {/* STATUS */}

        {error && (
          <div className="music-rules-alert music-rules-alert--error">
            <strong>
              Could not complete the request
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}

        {saved && (
          <div className="music-rules-alert music-rules-alert--success">
            <strong>
              Changes saved
            </strong>

            <span>
              The music platform rules have
              been updated.
            </span>
          </div>
        )}

        {/* RELEASE RULES */}

        <section className="music-rules-card">
          <div className="music-rules-card__header">
            <div>
              <span className="music-rules-card__eyebrow">
                RELEASE STRUCTURE
              </span>

              <h2>
                Music & Content Limits
              </h2>

              <p>
                Decide how many tracks or
                episodes creators can include
                in each release type.
              </p>
            </div>
          </div>

          <div className="music-rules-release-grid">
            {rules.releaseRules.map(
              (rule) => (
                <article
                  key={rule.id}
                  className={`music-rules-release-card ${
                    rule.enabled
                      ? ''
                      : 'music-rules-release-card--disabled'
                  }`}
                >
                  <div className="music-rules-release-card__top">
                    <div>
                      <h3>
                        {rule.label}
                      </h3>

                      <p>
                        {rule.description}
                      </p>
                    </div>

                    <Toggle
                      label=""
                      checked={rule.enabled}
                      onChange={(value) =>
                        updateReleaseRule(
                          rule.id,
                          {
                            enabled: value,
                          },
                        )
                      }
                    />
                  </div>

                  <div className="music-rules-release-card__fields">
                    <NumberField
                      label="Minimum"
                      value={rule.minItems}
                      min={1}
                      onChange={(value) =>
                        updateReleaseRule(
                          rule.id,
                          {
                            minItems:
                              Math.max(
                                1,
                                Math.floor(
                                  value,
                                ),
                              ),
                          },
                        )
                      }
                    />

                    <NumberField
                      label="Maximum"
                      value={rule.maxItems}
                      min={1}
                      onChange={(value) =>
                        updateReleaseRule(
                          rule.id,
                          {
                            maxItems:
                              Math.max(
                                1,
                                Math.floor(
                                  value,
                                ),
                              ),
                          },
                        )
                      }
                    />
                  </div>
                </article>
              ),
            )}
          </div>
        </section>

        {/* PREVIEW */}

        <section className="music-rules-card">
          <div className="music-rules-card__header">
            <div>
              <span className="music-rules-card__eyebrow">
                PREVIEW
              </span>

              <h2>
                Preview Settings
              </h2>

              <p>
                Control preview lengths for
                paid-preview content.
              </p>
            </div>
          </div>

          <div className="music-rules-section-grid">
            <Toggle
              label="Allow previews"
              description="Allow creators to provide preview clips."
              checked={
                rules.preview.enabled
              }
              onChange={(value) =>
                updatePreview({
                  enabled: value,
                })
              }
            />

            <NumberField
              label="Minimum preview seconds"
              value={
                rules.preview.minSeconds
              }
              min={1}
              onChange={(value) =>
                updatePreview({
                  minSeconds:
                    Math.max(
                      1,
                      Math.floor(value),
                    ),
                })
              }
            />

            <NumberField
              label="Maximum preview seconds"
              value={
                rules.preview.maxSeconds
              }
              min={1}
              onChange={(value) =>
                updatePreview({
                  maxSeconds:
                    Math.max(
                      1,
                      Math.floor(value),
                    ),
                })
              }
            />

            <NumberField
              label="Default preview seconds"
              value={
                rules.preview.defaultSeconds
              }
              min={1}
              onChange={(value) =>
                updatePreview({
                  defaultSeconds:
                    Math.max(
                      1,
                      Math.floor(value),
                    ),
                })
              }
            />
          </div>
        </section>

        {/* PRICING */}

        <section className="music-rules-card">
          <div className="music-rules-card__header">
            <div>
              <span className="music-rules-card__eyebrow">
                MONETIZATION
              </span>

              <h2>
                Pricing Rules
              </h2>

              <p>
                Control the pricing options
                available to creators.
              </p>
            </div>
          </div>

          <div className="music-rules-section-grid">
            <NumberField
              label="Minimum price"
              value={
                rules.pricing.minimumPrice
              }
              min={0}
              onChange={(value) =>
                updatePricing({
                  minimumPrice:
                    Math.max(
                      0,
                      value,
                    ),
                })
              }
            />

            <NumberField
              label="Maximum price"
              value={
                rules.pricing.maximumPrice
              }
              min={0}
              onChange={(value) =>
                updatePricing({
                  maximumPrice:
                    Math.max(
                      0,
                      value,
                    ),
                })
              }
            />

            <NumberField
              label="Default price"
              value={
                rules.pricing.defaultPrice
              }
              min={0}
              onChange={(value) =>
                updatePricing({
                  defaultPrice:
                    Math.max(
                      0,
                      value,
                    ),
                })
              }
            />
          </div>

          <div className="music-rules-options">
            <Toggle
              label="Free"
              checked={
                rules.pricing.allowFree
              }
              onChange={(value) =>
                updatePricing({
                  allowFree: value,
                })
              }
            />

            <Toggle
              label="Paid"
              checked={
                rules.pricing.allowPaid
              }
              onChange={(value) =>
                updatePricing({
                  allowPaid: value,
                })
              }
            />

            <Toggle
              label="Preview + Paid"
              checked={
                rules.pricing.allowPreviewPaid
              }
              onChange={(value) =>
                updatePricing({
                  allowPreviewPaid:
                    value,
                })
              }
            />

            <Toggle
              label="Premium"
              checked={
                rules.pricing.allowPremium
              }
              onChange={(value) =>
                updatePricing({
                  allowPremium:
                    value,
                })
              }
            />

            <Toggle
              label="Exclusive"
              checked={
                rules.pricing.allowExclusive
              }
              onChange={(value) =>
                updatePricing({
                  allowExclusive:
                    value,
                })
              }
            />
          </div>
        </section>

        {/* PUBLISHING */}

        <section className="music-rules-card">
          <div className="music-rules-card__header">
            <div>
              <span className="music-rules-card__eyebrow">
                PUBLISHING
              </span>

              <h2>
                Creator Publishing Rules
              </h2>

              <p>
                Decide what creators must
                provide before publishing.
              </p>
            </div>
          </div>

          <div className="music-rules-options">
            <Toggle
              label="Allow drafts"
              checked={
                rules.publishing.allowDrafts
              }
              onChange={(value) =>
                updatePublishing({
                  allowDrafts: value,
                })
              }
            />

            <Toggle
              label="Allow scheduled releases"
              checked={
                rules.publishing
                  .allowScheduledReleases
              }
              onChange={(value) =>
                updatePublishing({
                  allowScheduledReleases:
                    value,
                })
              }
            />

            <Toggle
              label="Require artwork"
              checked={
                rules.publishing
                  .requireArtwork
              }
              onChange={(value) =>
                updatePublishing({
                  requireArtwork:
                    value,
                })
              }
            />

            <Toggle
              label="Require description"
              checked={
                rules.publishing
                  .requireDescription
              }
              onChange={(value) =>
                updatePublishing({
                  requireDescription:
                    value,
                })
              }
            />

            <Toggle
              label="Require genre"
              checked={
                rules.publishing.requireGenre
              }
              onChange={(value) =>
                updatePublishing({
                  requireGenre: value,
                })
              }
            />

            <Toggle
              label="Require tags"
              checked={
                rules.publishing.requireTags
              }
              onChange={(value) =>
                updatePublishing({
                  requireTags: value,
                })
              }
            />

            <Toggle
              label="Require creator profile"
              description="Creators must have an active creator profile."
              checked={
                rules.publishing
                  .requireCreatorProfile
              }
              onChange={(value) =>
                updatePublishing({
                  requireCreatorProfile:
                    value,
                })
              }
            />

            <Toggle
              label="Require creator approval"
              description="A platform administrator must approve a creator before publishing."
              checked={
                rules.publishing
                  .requireCreatorApproval
              }
              onChange={(value) =>
                updatePublishing({
                  requireCreatorApproval:
                    value,
                })
              }
            />
          </div>
        </section>

        {/* VIDEO */}

        <section className="music-rules-card">
          <div className="music-rules-card__header">
            <div>
              <span className="music-rules-card__eyebrow">
                VIDEO
              </span>

              <h2>
                Video Rules
              </h2>

              <p>
                Control video release and
                duration limits.
              </p>
            </div>
          </div>

          <div className="music-rules-section-grid">
            <Toggle
              label="Enable video releases"
              checked={
                rules.video.enabled
              }
              onChange={(value) =>
                updateVideo({
                  enabled: value,
                })
              }
            />

            <NumberField
              label="Maximum videos per release"
              value={
                rules.video
                  .maxVideosPerRelease
              }
              min={1}
              onChange={(value) =>
                updateVideo({
                  maxVideosPerRelease:
                    Math.max(
                      1,
                      Math.floor(value),
                    ),
                })
              }
            />

            <NumberField
              label="Maximum duration (minutes)"
              value={
                rules.video
                  .maxDurationMinutes
              }
              min={1}
              onChange={(value) =>
                updateVideo({
                  maxDurationMinutes:
                    Math.max(
                      1,
                      Math.floor(value),
                    ),
                })
              }
            />
          </div>
        </section>

        {/* FOOTER */}

        <footer className="music-rules-footer">
          <div>
            <strong>
              Platform-wide music configuration
            </strong>

            <span>
              These rules apply to creators
              across Fockis.
            </span>
          </div>

          <button
            type="button"
            className="music-rules-button music-rules-button--primary"
            onClick={() => void saveRules()}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : 'Save Music Rules'}
          </button>
        </footer>
      </div>
    </main>
  );
}