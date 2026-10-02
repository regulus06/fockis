import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleasePublishing() {
  const {
    creationMode,
    publishMode,
    setPublishMode,
    saving,
    form,
    updateField,
    seriesReleaseMode,
    episodesPerRelease,
    seriesInterval,
    seriesFrequency,
    getMinimumDateTime,
  } = useMusicCreateRelease();

  const options = [
    {
      mode: 'draft' as const,
      icon: '📝',
      title: 'Save as draft',
      description:
        'Continue editing later.',
    },
    {
      mode: 'publish' as const,
      icon: '🚀',
      title: 'Publish now',
      description:
        'Make the content available immediately.',
    },
    {
      mode: 'schedule' as const,
      icon: '📅',
      title: 'Schedule',
      description:
        'Publish automatically according to your release plan.',
    },
  ];

  return (
    <section className="music-create-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            PUBLISHING
          </span>

          <h2>
            Publishing
          </h2>

          <p>
            Publish now, save as a draft,
            or schedule your content.
          </p>
        </div>
      </div>

      <div className="music-publishing-options">
        {options.map(
          (option) => (
            <button
              key={option.mode}
              type="button"
              className={`music-publishing-option ${
                publishMode ===
                option.mode
                  ? 'music-publishing-option--active'
                  : ''
              }`}
              onClick={() =>
                setPublishMode(
                  option.mode,
                )
              }
              disabled={saving}
            >
              <span>
                {option.icon}
              </span>

              <div>
                <strong>
                  {option.title}
                </strong>

                <small>
                  {
                    option.description
                  }
                </small>
              </div>
            </button>
          ),
        )}
      </div>

      {creationMode ===
        'single' &&
        publishMode ===
          'schedule' && (
          <label className="music-form-field music-schedule-field">
            <span>
              Publish date & time{' '}
              <b>*</b>
            </span>

            <input
              type="datetime-local"
              value={
                form.releaseDate
              }
              min={
                getMinimumDateTime()
              }
              onChange={(event) =>
                updateField(
                  'releaseDate',
                  event.target.value,
                )
              }
              disabled={saving}
            />

            <small>
              Fockis will publish this
              content at the scheduled time.
            </small>
          </label>
        )}

      {creationMode ===
        'series' &&
        publishMode ===
          'schedule' && (
          <div className="music-series-publishing-summary">
            <strong>
              Series scheduling is
              controlled above.
            </strong>

            <p>
              {seriesReleaseMode ===
              'all_now'
                ? 'All episodes will publish immediately when the series is submitted.'
                : seriesReleaseMode ===
                    'drip'
                  ? `${episodesPerRelease} episode${
                      episodesPerRelease ===
                      1
                        ? ''
                        : 's'
                    } will be released every ${
                      seriesInterval
                    } ${
                      seriesFrequency ===
                      'daily'
                        ? 'day'
                        : 'week'
                    }.`
                  : 'Every episode will use its individual scheduled date.'}
            </p>
          </div>
        )}
    </section>
  );
}