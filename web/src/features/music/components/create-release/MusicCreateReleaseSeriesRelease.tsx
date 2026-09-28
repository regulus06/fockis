import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseSeriesRelease() {
  const {
    creationMode,
    seriesReleaseMode,
    setSeriesReleaseMode,
    saving,
    episodesPerRelease,
    setEpisodesPerRelease,
    seriesEpisodes,
    seriesFrequency,
    setSeriesFrequency,
    seriesInterval,
    setSeriesInterval,
    firstSeriesRelease,
    setFirstSeriesRelease,
    calculateSeriesReleaseDate,
    getMinimumDateTime,
  } = useMusicCreateRelease();

  if (
    creationMode !== 'series'
  ) {
    return null;
  }

  const options = [
    {
      mode: 'all_now' as const,
      icon: '🚀',
      title: 'Publish everything now',
      description:
        'All episodes become available immediately.',
    },
    {
      mode: 'drip' as const,
      icon: '📺',
      title: 'Release gradually',
      description:
        'Choose how many episodes arrive at each release.',
    },
    {
      mode: 'custom' as const,
      icon: '📅',
      title: 'Schedule each episode',
      description:
        'Give every episode its own date and time.',
    },
  ];

  return (
    <section className="music-create-card music-series-publishing-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            SERIES RELEASE
          </span>

          <h2>
            How should your episodes
            be released?
          </h2>

          <p>
            You control exactly how quickly
            your audience receives the series.
          </p>
        </div>
      </div>

      <div className="music-series-release-options">
        {options.map(
          (option) => (
            <button
              key={option.mode}
              type="button"
              className={`music-series-release-option ${
                seriesReleaseMode ===
                option.mode
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setSeriesReleaseMode(
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

      {seriesReleaseMode ===
        'drip' && (
        <div className="music-series-drip-settings">
          <div className="music-form-grid">
            <label className="music-form-field">
              <span>
                Episodes per release
              </span>

              <select
                value={
                  episodesPerRelease
                }
                onChange={(event) =>
                  setEpisodesPerRelease(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                disabled={saving}
              >
                {Array.from(
                  {
                    length:
                      seriesEpisodes.length,
                  },
                  (_, index) =>
                    index + 1,
                ).map(
                  (amount) => (
                    <option
                      key={amount}
                      value={amount}
                    >
                      {amount}{' '}
                      {amount === 1
                        ? 'episode'
                        : 'episodes'}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="music-form-field">
              <span>
                Release frequency
              </span>

              <select
                value={
                  seriesFrequency
                }
                onChange={(event) =>
                  setSeriesFrequency(
                    event.target
                      .value as
                      | 'daily'
                      | 'weekly',
                  )
                }
                disabled={saving}
              >
                <option value="daily">
                  Every day
                </option>

                <option value="weekly">
                  Every week
                </option>
              </select>
            </label>

            <label className="music-form-field">
              <span>
                Interval
              </span>

              <div className="music-price-input">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={
                    seriesInterval
                  }
                  onChange={(event) =>
                    setSeriesInterval(
                      Number(
                        event.target.value,
                      ),
                    )
                  }
                  disabled={saving}
                />

                <span>
                  {seriesFrequency ===
                  'daily'
                    ? 'day(s)'
                    : 'week(s)'}
                </span>
              </div>
            </label>

            <label className="music-form-field">
              <span>
                First release
              </span>

              <input
                type="datetime-local"
                min={
                  getMinimumDateTime()
                }
                value={
                  firstSeriesRelease
                }
                onChange={(event) =>
                  setFirstSeriesRelease(
                    event.target.value,
                  )
                }
                disabled={saving}
              />
            </label>
          </div>

          <div className="music-series-schedule-preview">
            <strong>
              Release plan
            </strong>

            <div>
              {seriesEpisodes.map(
                (
                  episode,
                  index,
                ) => {
                  const date =
                    calculateSeriesReleaseDate(
                      index,
                    );

                  return (
                    <div
                      key={
                        episode.id
                      }
                    >
                      <span>
                        Episode{' '}
                        {index + 1}
                      </span>

                      <small>
                        {date
                          ? new Date(
                              date,
                            ).toLocaleString()
                          : 'Choose first release date'}
                      </small>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </div>
      )}

      {seriesReleaseMode ===
        'all_now' && (
        <div className="music-series-release-notice">
          <span>🚀</span>

          <div>
            <strong>
              All{' '}
              {
                seriesEpisodes.length
              }{' '}
              episodes will publish
              immediately.
            </strong>

            <p>
              Your audience can access
              the complete series as soon
              as publishing finishes.
            </p>
          </div>
        </div>
      )}

      {seriesReleaseMode ===
        'custom' && (
        <div className="music-series-release-notice">
          <span>📅</span>

          <div>
            <strong>
              Custom episode scheduling
            </strong>

            <p>
              Set the release date and
              time inside each episode
              above.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}