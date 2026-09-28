import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseSeriesArtwork() {
  const {
    creationMode,
    form,
    saving,
    updateField,
    coverPreviewError,
    setCoverPreviewError,
  } = useMusicCreateRelease();

  if (
    creationMode !== 'series'
  ) {
    return null;
  }

  return (
    <section className="music-create-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            SERIES ARTWORK
          </span>

          <h2>
            Default artwork
          </h2>

          <p>
            Episodes can override this
            with their own thumbnail.
          </p>
        </div>
      </div>

      <div className="music-form-grid">
        <label className="music-form-field music-form-field--full">
          <span>
            Series cover URL
          </span>

          <input
            type="url"
            value={
              form.coverImageUrl
            }
            onChange={(event) => {
              updateField(
                'coverImageUrl',
                event.target.value,
              );

              setCoverPreviewError(
                false,
              );
            }}
            placeholder="https://your-storage.com/series-cover.jpg"
            disabled={saving}
          />

          <small>
            Episodes without their own
            thumbnail will use this artwork.
          </small>
        </label>

        {form.coverImageUrl &&
          !coverPreviewError && (
            <div className="music-cover-preview">
              <img
                src={
                  form.coverImageUrl
                }
                alt="Series artwork preview"
                onError={() =>
                  setCoverPreviewError(
                    true,
                  )
                }
              />
            </div>
          )}
      </div>
    </section>
  );
}