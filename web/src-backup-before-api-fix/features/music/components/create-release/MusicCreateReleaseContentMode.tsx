import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseContentMode() {
  const {
    creationMode,
    setCreationMode,
    saving,
  } = useMusicCreateRelease();

  return (
    <section className="music-create-card music-create-mode">
      <div className="music-create-card-header music-create-mode__header">
        <div className="music-create-mode__heading">
          <span className="music-create-step">
            CREATE MODE
          </span>

          <h2 className="music-create-mode__title">
            Single or Series?
          </h2>

          <p className="music-create-mode__description">
            Publish one piece of content or build a complete
            multi-episode release.
          </p>
        </div>
      </div>

      <div className="music-create-mode__grid">
        {/* SINGLE */}
        <button
          type="button"
          className={[
            'music-create-mode__option',
            creationMode === 'single'
              ? 'music-create-mode__option--active'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setCreationMode('single')}
          disabled={saving}
          aria-pressed={creationMode === 'single'}
        >
          <span
            className="music-create-mode__icon"
            aria-hidden="true"
          >
            🎵
          </span>

          <span className="music-create-mode__content">
            <span className="music-create-mode__title-row">
              <strong className="music-create-mode__option-title">
                Single Content
              </strong>

              {creationMode === 'single' && (
                <span className="music-create-mode__selected">
                  Selected
                </span>
              )}
            </span>

            <span className="music-create-mode__option-description">
              Publish one song, video, movie or creator release.
            </span>
          </span>

          <span
            className="music-create-mode__radio"
            aria-hidden="true"
          >
            <span
              className={
                creationMode === 'single'
                  ? 'music-create-mode__radio-dot'
                  : ''
              }
            />
          </span>
        </button>

        {/* SERIES */}
        <button
          type="button"
          className={[
            'music-create-mode__option',
            creationMode === 'series'
              ? 'music-create-mode__option--active'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => setCreationMode('series')}
          disabled={saving}
          aria-pressed={creationMode === 'series'}
        >
          <span
            className="music-create-mode__icon"
            aria-hidden="true"
          >
            📺
          </span>

          <span className="music-create-mode__content">
            <span className="music-create-mode__title-row">
              <strong className="music-create-mode__option-title">
                Series
              </strong>

              {creationMode === 'series' && (
                <span className="music-create-mode__selected">
                  Selected
                </span>
              )}
            </span>

            <span className="music-create-mode__option-description">
              Upload up to 25 episodes and release them gradually
              or on custom dates.
            </span>
          </span>

          <span
            className="music-create-mode__radio"
            aria-hidden="true"
          >
            <span
              className={
                creationMode === 'series'
                  ? 'music-create-mode__radio-dot'
                  : ''
              }
            />
          </span>
        </button>
      </div>

      {creationMode === 'series' && (
        <div className="music-create-mode__series-info">
          <span
            className="music-create-mode__series-icon"
            aria-hidden="true"
          >
            📺
          </span>

          <div className="music-create-mode__series-content">
            <strong className="music-create-mode__series-title">
              Series publishing
            </strong>

            <p className="music-create-mode__series-description">
              Add up to <strong>25 episodes</strong>. You decide
              how many episodes are released at a time.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}