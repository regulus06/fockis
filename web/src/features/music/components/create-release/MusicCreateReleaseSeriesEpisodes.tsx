import type { ChangeEvent } from 'react';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

const MAX_EPISODES = 25;

const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/x-m4a',
  'audio/mp4',
  'audio/aac',
  'audio/ogg',
  'audio/opus',
  'audio/flac',
  'audio/x-flac',
];

const VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
];

export default function MusicCreateReleaseSeriesEpisodes() {
  const {
    creationMode,
    seriesEpisodes,
    saving,
    addEpisode,
    removeEpisode,
    moveEpisode,
    updateEpisode,
    setEpisodeMediaKind,
    seriesReleaseMode,
    getMinimumDateTime,
    episodeFiles,
    setEpisodeFile,
  } = useMusicCreateRelease();

  if (creationMode !== 'series') {
    return null;
  }

  const handleEpisodeFileChange = (
    episodeId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;

    setEpisodeFile(episodeId, file);

    // Allow selecting the same file again.
    event.target.value = '';
  };

  const handleRemoveEpisodeFile = (
    episodeId: string,
  ) => {
    setEpisodeFile(episodeId, null);
  };

  const openFilePicker = (
    episodeId: string,
  ) => {
    const input = document.getElementById(
      `music-series-media-${episodeId}`,
    ) as HTMLInputElement | null;

    input?.click();
  };

  return (
    <section className="music-create-card music-series-card">
      {/* ================================================================
          HEADER
         ================================================================ */}

      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            SERIES
          </span>

          <h2>Episodes</h2>

          <p>
            Add audio or video episodes in the order
            you want them released.
          </p>
        </div>

        <button
          type="button"
          className="music-create-primary-button"
          onClick={addEpisode}
          disabled={
            saving ||
            seriesEpisodes.length >= MAX_EPISODES
          }
        >
          + Add Episode
        </button>
      </div>

      {/* ================================================================
          COUNTER
         ================================================================ */}

      <div className="music-series-counter">
        <strong>
          {seriesEpisodes.length}
        </strong>

        <span>
          / {MAX_EPISODES} episodes
        </span>
      </div>

      {/* ================================================================
          EPISODES
         ================================================================ */}

      <div className="music-series-episodes">
        {seriesEpisodes.map((episode, index) => {
          const selectedFile =
            episodeFiles[episode.id] ?? null;

          const isAudio =
            episode.mediaKind === 'audio';

          const isVideo =
            episode.mediaKind === 'video';

          const acceptedTypes = isAudio
            ? AUDIO_TYPES.join(',')
            : VIDEO_TYPES.join(',');

          return (
            <article
              className="music-series-episode"
              key={episode.id}
            >
              {/* ========================================================
                  EPISODE HEADER
                 ======================================================== */}

              <div className="music-series-episode-header">
                <div className="music-series-episode-number">
                  {index + 1}
                </div>

                <div>
                  <strong>
                    Episode {index + 1}
                  </strong>

                  <small>
                    {episode.title ||
                      'Untitled episode'}
                  </small>
                </div>

                <div className="music-series-episode-actions">
                  <button
                    type="button"
                    onClick={() =>
                      moveEpisode(index, 'up')
                    }
                    disabled={
                      saving ||
                      index === 0
                    }
                    title="Move episode up"
                    aria-label="Move episode up"
                  >
                    ↑
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      moveEpisode(index, 'down')
                    }
                    disabled={
                      saving ||
                      index ===
                        seriesEpisodes.length - 1
                    }
                    title="Move episode down"
                    aria-label="Move episode down"
                  >
                    ↓
                  </button>

                  <button
                    type="button"
                    className="danger"
                    onClick={() =>
                      removeEpisode(episode.id)
                    }
                    disabled={
                      saving ||
                      seriesEpisodes.length <= 1
                    }
                    title="Remove episode"
                    aria-label="Remove episode"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="music-form-grid">
                {/* ======================================================
                    TITLE
                   ====================================================== */}

                <label className="music-form-field">
                  <span>
                    Episode title <b>*</b>
                  </span>

                  <input
                    type="text"
                    value={episode.title}
                    onChange={(event) =>
                      updateEpisode(
                        episode.id,
                        'title',
                        event.target.value,
                      )
                    }
                    placeholder={`Episode ${index + 1}`}
                    maxLength={160}
                    disabled={saving}
                  />
                </label>

                {/* ======================================================
                    MEDIA TYPE
                   ====================================================== */}

                <div className="music-form-field">
                  <span>
                    Media type <b>*</b>
                  </span>

                  <div className="music-media-type-selector">
                    <button
                      type="button"
                      className={`music-media-type-option ${
                        isAudio ? 'is-active' : ''
                      }`}
                      onClick={() =>
                        setEpisodeMediaKind(
                          episode.id,
                          'audio',
                        )
                      }
                      disabled={saving}
                      aria-pressed={isAudio}
                    >
                      <span aria-hidden="true">
                        🎵
                      </span>

                      <strong>
                        Audio
                      </strong>

                      <small>
                        MP3, WAV, M4A, FLAC
                      </small>
                    </button>

                    <button
                      type="button"
                      className={`music-media-type-option ${
                        isVideo ? 'is-active' : ''
                      }`}
                      onClick={() =>
                        setEpisodeMediaKind(
                          episode.id,
                          'video',
                        )
                      }
                      disabled={saving}
                      aria-pressed={isVideo}
                    >
                      <span aria-hidden="true">
                        🎬
                      </span>

                      <strong>
                        Video
                      </strong>

                      <small>
                        MP4, WebM, MOV, MKV
                      </small>
                    </button>
                  </div>
                </div>

                {/* ======================================================
                    REAL DEVICE UPLOAD
                   ====================================================== */}

                <div className="music-form-field music-form-field--full">
                  <span>
                    {isAudio
                      ? 'Audio file'
                      : 'Video file'}{' '}
                    <b>*</b>
                  </span>

                  <input
                    id={`music-series-media-${episode.id}`}
                    type="file"
                    accept={acceptedTypes}
                    onChange={(event) =>
                      handleEpisodeFileChange(
                        episode.id,
                        event,
                      )
                    }
                    disabled={saving}
                    style={{
                      display: 'none',
                    }}
                  />

                  <button
                    type="button"
                    className="music-upload-button"
                    onClick={() =>
                      openFilePicker(
                        episode.id,
                      )
                    }
                    disabled={saving}
                  >
                    <span className="music-upload-button__icon">
                      {isAudio ? '🎵' : '🎬'}
                    </span>

                    <span className="music-upload-button__content">
                      <strong>
                        {selectedFile
                          ? 'Change file'
                          : `Upload ${
                              isAudio
                                ? 'audio'
                                : 'video'
                            } file`}
                      </strong>

                      <small>
                        Select a file from your
                        computer or phone
                      </small>
                    </span>
                  </button>

                  {/* ====================================================
                      SELECTED FILE
                     ==================================================== */}

                  {selectedFile && (
                    <div className="music-selected-file">
                      <div className="music-selected-file__info">
                        <strong>
                          {selectedFile.name}
                        </strong>

                        <small>
                          {selectedFile.type ||
                            (isAudio
                              ? 'Audio file'
                              : 'Video file')}

                          {' • '}

                          {formatFileSize(
                            selectedFile.size,
                          )}
                        </small>
                      </div>

                      <button
                        type="button"
                        className="music-selected-file__remove"
                        onClick={() =>
                          handleRemoveEpisodeFile(
                            episode.id,
                          )
                        }
                        disabled={saving}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <small>
                    {isAudio
                      ? 'Supported audio: MP3, WAV, M4A, AAC, OGG, OPUS, and FLAC. Maximum 100 MB.'
                      : 'Supported video: MP4, WebM, MOV, and MKV. Maximum 100 MB.'}
                  </small>
                </div>

                {/* ======================================================
                    MEDIA URL FALLBACK
                   ====================================================== */}

                <label className="music-form-field music-form-field--full">
                  <span>
                    {isAudio
                      ? 'Audio URL'
                      : 'Video URL'}

                    {!selectedFile && (
                      <>
                        {' '}
                        <b>*</b>
                      </>
                    )}
                  </span>

                  <input
                    type="url"
                    value={episode.mediaUrl}
                    onChange={(event) =>
                      updateEpisode(
                        episode.id,
                        'mediaUrl',
                        event.target.value,
                      )
                    }
                    placeholder={
                      isAudio
                        ? 'https://your-storage.com/episode-1.mp3'
                        : 'https://your-storage.com/episode-1.mp4'
                    }
                    disabled={
                      saving ||
                      Boolean(selectedFile)
                    }
                  />

                  <small>
                    {selectedFile
                      ? 'A device file is selected, so the URL is not required.'
                      : `Use a hosted ${
                          isAudio
                            ? 'audio'
                            : 'video'
                        } URL instead of uploading a file.`}
                  </small>
                </label>

                {/* ======================================================
                    DESCRIPTION
                   ====================================================== */}

                <label className="music-form-field music-form-field--full">
                  <span>
                    Episode description
                  </span>

                  <textarea
                    value={episode.description}
                    onChange={(event) =>
                      updateEpisode(
                        episode.id,
                        'description',
                        event.target.value,
                      )
                    }
                    placeholder={
                      isAudio
                        ? 'Describe this audio episode...'
                        : 'Describe this video episode...'
                    }
                    rows={3}
                    maxLength={3000}
                    disabled={saving}
                  />
                </label>

                {/* ======================================================
                    THUMBNAIL
                   ====================================================== */}

                <label className="music-form-field music-form-field--full">
                  <span>
                    Episode thumbnail
                  </span>

                  <input
                    type="url"
                    value={episode.coverImageUrl}
                    onChange={(event) =>
                      updateEpisode(
                        episode.id,
                        'coverImageUrl',
                        event.target.value,
                      )
                    }
                    placeholder="https://your-storage.com/episode-1.jpg"
                    disabled={saving}
                  />

                  <small>
                    Add artwork or a thumbnail
                    for this episode.
                  </small>
                </label>

                {/* ======================================================
                    CUSTOM RELEASE DATE
                   ====================================================== */}

                {seriesReleaseMode ===
                  'custom' && (
                  <label className="music-form-field music-series-custom-date">
                    <span>
                      Episode release date{' '}
                      <b>*</b>
                    </span>

                    <input
                      type="datetime-local"
                      value={
                        episode.releaseDate
                      }
                      min={getMinimumDateTime()}
                      onChange={(event) =>
                        updateEpisode(
                          episode.id,
                          'releaseDate',
                          event.target.value,
                        )
                      }
                      disabled={saving}
                    />
                  </label>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* ================================================================
          ADD ANOTHER
         ================================================================ */}

      {seriesEpisodes.length < MAX_EPISODES && (
        <button
          type="button"
          className="music-series-add-more"
          onClick={addEpisode}
          disabled={saving}
        >
          + Add another episode
        </button>
      )}
    </section>
  );
}

/* ==========================================================================
   FILE SIZE
   ========================================================================== */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}