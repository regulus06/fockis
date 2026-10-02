import {
  CONTENT_TYPES,
} from '../../constants/musicCreateRelease.constants';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseContentType() {
  const {
    form,
    selectContentType,
    saving,
  } = useMusicCreateRelease();

  const groups = [
    [
      'music',
      '🎵',
      'Music',
      'Songs, albums, beats and instrumental releases.',
    ],
    [
      'video',
      '🎬',
      'Video & Entertainment',
      'Videos, performances, interviews and educational content.',
    ],
    [
      'creator',
      '✨',
      'Creator & Lifestyle',
      'Movies, fashion, events, announcements and creator updates.',
    ],
  ] as const;

  return (
    <section className="music-create-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            STEP 1
          </span>

          <h2>
            What do you want to create?
          </h2>

          <p>
            Choose the type of content
            you want to publish.
          </p>
        </div>
      </div>

      {groups.map(
        ([
          category,
          icon,
          title,
          description,
        ]) => (
          <div
            className="music-create-category"
            key={category}
          >
            <div className="music-create-category-title">
              <span>{icon}</span>

              <div>
                <strong>
                  {title}
                </strong>

                <small>
                  {description}
                </small>
              </div>
            </div>

            <div className="music-content-type-grid">
              {CONTENT_TYPES
                .filter(
                  (item) =>
                    item.category ===
                    category,
                )
                .map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`music-content-type-option ${
                      form.contentType ===
                      item.value
                        ? 'music-content-type-option--active'
                        : ''
                    }`}
                    onClick={() =>
                      selectContentType(
                        item.value,
                      )
                    }
                    disabled={saving}
                  >
                    <span className="music-content-type-icon">
                      {item.icon}
                    </span>

                    <span>
                      <strong>
                        {item.label}
                      </strong>

                      <small>
                        {
                          item.description
                        }
                      </small>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ),
      )}
    </section>
  );
}