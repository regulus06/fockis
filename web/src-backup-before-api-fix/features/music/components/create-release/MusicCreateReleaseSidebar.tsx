import {
  ACCESS_OPTIONS,
  GENRES,
} from '../../constants/musicCreateRelease.constants';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseSidebar() {
  const {
    form,
    creationMode,
    seriesEpisodes,
    seriesReleaseMode,
    episodesPerRelease,
    selectedCountry,
    selectedContentType,
    contentLabel,
    requiresPrice,
    formattedPrice,
    coverPreviewError,
    setCoverPreviewError,
    publishMode,
  } = useMusicCreateRelease();

  const allEpisodeMediaComplete =
    seriesEpisodes.every(
      (episode) =>
        episode.mediaUrl.trim(),
    );

  const pricingComplete =
    !requiresPrice ||
    Number(form.price) > 0;

  const publishingComplete =
    creationMode === 'series' ||
    publishMode !== 'schedule' ||
    Boolean(form.releaseDate);

  return (
    <aside className="music-create-sidebar">
      <div className="music-release-preview-card">
        <div className="music-release-preview-art">
          {form.coverImageUrl &&
          !coverPreviewError ? (
            <img
              src={
                form.coverImageUrl
              }
              alt=""
              onError={() =>
                setCoverPreviewError(
                  true,
                )
              }
            />
          ) : (
            <span>
              {creationMode ===
              'series'
                ? '📺'
                : selectedContentType?.icon ||
                  '✨'}
            </span>
          )}
        </div>

        <div className="music-release-preview-body">
          <span className="music-release-preview-label">
            {creationMode ===
            'series'
              ? 'SERIES PREVIEW'
              : 'CONTENT PREVIEW'}
          </span>

          <h3>
            {form.title.trim() ||
              'Your content title'}
          </h3>

          <p>
            {creationMode ===
            'series'
              ? `${seriesEpisodes.length} episodes`
              : contentLabel}
          </p>

          <div className="music-release-preview-meta">
            <span>
              {form.genre
                ? GENRES.find(
                    (genre) =>
                      genre.value ===
                      form.genre,
                  )?.label
                : 'Genre not selected'}
            </span>

            <span>
              {form.accessType ===
              'free'
                ? 'Free'
                : requiresPrice
                  ? formattedPrice
                  : ACCESS_OPTIONS.find(
                      (option) =>
                        option.value ===
                        form.accessType,
                    )?.label}
            </span>
          </div>

          {requiresPrice && (
            <div className="music-release-preview-currency">
              <span>
                {
                  selectedCountry.flag
                }
              </span>

              <strong>
                {
                  selectedCountry.currency
                }
              </strong>

              <small>
                {
                  selectedCountry.name
                }
              </small>
            </div>
          )}
        </div>
      </div>

      {creationMode ===
        'series' && (
        <div className="music-create-country-summary">
          <div>
            <span>📺</span>

            <div>
              <strong>
                {
                  seriesEpisodes.length
                }{' '}
                Episodes
              </strong>

              <small>
                {seriesReleaseMode ===
                'all_now'
                  ? 'Release all now'
                  : seriesReleaseMode ===
                      'drip'
                    ? `Release ${episodesPerRelease} at a time`
                    : 'Custom episode schedule'}
              </small>
            </div>
          </div>

          <span className="music-create-country-badge">
            SERIES
          </span>
        </div>
      )}

      <div className="music-create-country-summary">
        <div>
          <span>
            {
              selectedCountry.flag
            }
          </span>

          <div>
            <strong>
              {
                selectedCountry.name
              }
            </strong>

            <small>
              Selling in{' '}
              {
                selectedCountry.currency
              }
            </small>
          </div>
        </div>

        <span className="music-create-country-badge">
          {
            selectedCountry.currency
          }
        </span>
      </div>

      <div className="music-create-checklist">
        <h3>
          Content checklist
        </h3>

        <div
          className={
            form.title.trim()
              ? 'is-complete'
              : ''
          }
        >
          <span>
            {form.title.trim()
              ? '✓'
              : '1'}
          </span>

          <p>
            {creationMode ===
            'series'
              ? 'Series title'
              : 'Content title'}
          </p>
        </div>

        <div
          className={
            creationMode ===
            'series'
              ? allEpisodeMediaComplete
                ? 'is-complete'
                : ''
              : form.mediaUrl.trim()
                ? 'is-complete'
                : ''
          }
        >
          <span>
            {creationMode ===
            'series'
              ? allEpisodeMediaComplete
                ? '✓'
                : '2'
              : form.mediaUrl.trim()
                ? '✓'
                : '2'}
          </span>

          <p>
            {creationMode ===
            'series'
              ? 'All episode media'
              : 'Media'}
          </p>
        </div>

        <div
          className={
            form.genre
              ? 'is-complete'
              : ''
          }
        >
          <span>
            {form.genre
              ? '✓'
              : '3'}
          </span>

          <p>
            Category / genre
          </p>
        </div>

        <div
          className={
            pricingComplete
              ? 'is-complete'
              : ''
          }
        >
          <span>
            {pricingComplete
              ? '✓'
              : '4'}
          </span>

          <p>
            Access & pricing
          </p>
        </div>

        <div className="is-complete">
          <span>✓</span>

          <p>
            {
              selectedCountry.name
            }{' '}
            ·{' '}
            {
              selectedCountry.currency
            }
          </p>
        </div>

        <div
          className={
            publishingComplete
              ? 'is-complete'
              : ''
          }
        >
          <span>
            {publishingComplete
              ? '✓'
              : '6'}
          </span>

          <p>
            Publishing
          </p>
        </div>
      </div>

      <div className="music-create-help">
        <span>💡</span>

        <div>
          <strong>
            Creator tip
          </strong>

          <p>
            A strong series title,
            consistent thumbnails,
            episode titles and a
            predictable release schedule
            make it easier for your
            audience to follow your
            content.
          </p>
        </div>
      </div>

      {creationMode ===
        'series' && (
        <div className="music-create-help">
          <span>📅</span>

          <div>
            <strong>
              Your release plan
            </strong>

            <p>
              {seriesReleaseMode ===
              'all_now'
                ? `All ${seriesEpisodes.length} episodes publish immediately.`
                : seriesReleaseMode ===
                    'drip'
                  ? `Release ${episodesPerRelease} episode${
                      episodesPerRelease ===
                      1
                        ? ''
                        : 's'
                    } at a time.`
                  : 'Each episode has its own scheduled release date.'}
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}