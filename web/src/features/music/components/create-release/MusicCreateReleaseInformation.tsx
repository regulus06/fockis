import { GENRES } from '../../constants/musicCreateRelease.constants';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

import type {
  MusicGenre,
  MusicMediaKind,
} from '../../types/music.types';

export default function MusicCreateReleaseInformation() {
  const {
    form,
    creationMode,
    isVideoContent,
    contentLabel,
    saving,
    updateField,
  } = useMusicCreateRelease();

  return (
    <section className="music-create-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            STEP 2
          </span>

          <h2>
            {creationMode === 'series'
              ? 'Series information'
              : 'Content information'}
          </h2>

          <p>
            {creationMode === 'series'
              ? 'Set the information shared across your episodes.'
              : "Tell your audience what you're publishing."}
          </p>
        </div>
      </div>

      <div className="music-form-grid">
        <label className="music-form-field music-form-field--full">
          <span>
            {creationMode === 'series'
              ? 'Series title'
              : 'Title'}{' '}
            <b>*</b>
          </span>

          <input
            type="text"
            value={form.title}
            onChange={(event) =>
              updateField(
                'title',
                event.target.value,
              )
            }
            placeholder={
              creationMode ===
              'series'
                ? 'Example: The Journey — Season 1'
                : isVideoContent
                  ? 'Enter your video title'
                  : `Enter your ${contentLabel.toLowerCase()} title`
            }
            maxLength={160}
            disabled={saving}
          />

          <small>
            {form.title.length}/160
          </small>
        </label>

        <label className="music-form-field">
          <span>Genre</span>

          <select
            value={form.genre}
            onChange={(event) =>
              updateField(
                'genre',
                event.target
                  .value as MusicGenre | '',
              )
            }
            disabled={saving}
          >
            <option value="">
              Select genre
            </option>

            {GENRES.map(
              (genre) => (
                <option
                  key={genre.value}
                  value={
                    genre.value
                  }
                >
                  {genre.label}
                </option>
              ),
            )}
          </select>
        </label>

        {creationMode ===
        'single' ? (
          <label className="music-form-field">
            <span>
              Media type
            </span>

            <select
              value={
                form.mediaKind
              }
              onChange={(event) =>
                updateField(
                  'mediaKind',
                  event.target
                    .value as MusicMediaKind,
                )
              }
              disabled={saving}
            >
              <option value="audio">
                Audio
              </option>

              <option value="video">
                Video
              </option>
            </select>
          </label>
        ) : (
          <div className="music-series-video-lock">
            <span>🎬</span>

            <div>
              <strong>
                Video series
              </strong>

              <small>
                Each episode is published
                as video content.
              </small>
            </div>
          </div>
        )}

        <label className="music-form-field music-form-field--full">
          <span>
            Description
          </span>

          <textarea
            value={form.description}
            onChange={(event) =>
              updateField(
                'description',
                event.target.value,
              )
            }
            placeholder={
              creationMode ===
              'series'
                ? 'Describe your series...'
                : `Tell your audience about this ${contentLabel.toLowerCase()}...`
            }
            rows={6}
            maxLength={3000}
            disabled={saving}
          />

          <small>
            {form.description.length}/3000
          </small>
        </label>

        <label className="music-form-field music-form-field--full">
          <span>
            Tags
          </span>

          <input
            type="text"
            value={form.tags}
            onChange={(event) =>
              updateField(
                'tags',
                event.target.value,
              )
            }
            placeholder="new, trending, exclusive, season-1"
            disabled={saving}
          />

          <small>
            Separate tags with commas.
          </small>
        </label>
      </div>
    </section>
  );
}