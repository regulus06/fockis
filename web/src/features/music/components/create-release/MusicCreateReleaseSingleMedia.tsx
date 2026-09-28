import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseSingleMedia() {
  const {
    creationMode,
    form,
    isVideoContent,
    saving,
    updateField,
    mediaFile,
    setMediaFile,
    coverPreviewError,
    setCoverPreviewError,
  } = useMusicCreateRelease();

  if (creationMode !== 'single') {
    return null;
  }

  const acceptedMediaTypes = isVideoContent
    ? 'video/mp4,video/webm,video/quicktime,video/x-matroska'
    : 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/wave,audio/x-m4a,audio/mp4,audio/aac,audio/ogg,audio/opus,audio/flac,audio/x-flac';

  const mediaLabel = isVideoContent
    ? 'Video file'
    : 'Audio file';

  const handleMediaFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;

    setMediaFile(file);
  };

  const handleRemoveMediaFile = () => {
    setMediaFile(null);
  };

  return (
    <section className="music-create-card">
      <div className="music-create-card-header">
        <div>
          <span className="music-create-step">
            STEP 3
          </span>

          <h2>
            Media & artwork
          </h2>

          <p>
            Upload your media directly from
            your device or provide a media URL.
          </p>
        </div>
      </div>

      <div className="music-form-grid">
        {/* ============================================================
            DEVICE MEDIA UPLOAD
           ============================================================ */}
        <div className="music-form-field music-form-field--full">
          <span>
            {mediaLabel} <b>*</b>
          </span>

          <div className="music-upload-box">
            <label
              htmlFor="music-single-media-file"
              className="music-upload-box__label"
            >
              <span className="music-upload-box__icon">
                {isVideoContent ? '🎬' : '🎵'}
              </span>

              <span className="music-upload-box__title">
                {mediaFile
                  ? 'Choose a different file'
                  : `Upload ${mediaLabel.toLowerCase()}`}
              </span>

              <span className="music-upload-box__hint">
                Select a file from your computer
                or phone
              </span>

              <input
                id="music-single-media-file"
                type="file"
                accept={acceptedMediaTypes}
                onChange={handleMediaFileChange}
                disabled={saving}
                hidden
              />
            </label>
          </div>

          {mediaFile && (
            <div className="music-selected-file">
              <div className="music-selected-file__info">
                <strong>
                  {mediaFile.name}
                </strong>

                <small>
                  {mediaFile.type || 'Media file'}
                  {' • '}
                  {formatFileSize(mediaFile.size)}
                </small>
              </div>

              <button
                type="button"
                className="music-selected-file__remove"
                onClick={handleRemoveMediaFile}
                disabled={saving}
              >
                Remove
              </button>
            </div>
          )}

          <small>
            {isVideoContent
              ? 'Supported video formats: MP4, WebM, MOV, and MKV. Maximum upload size is 100 MB.'
              : 'Supported audio formats: MP3, WAV, M4A, AAC, OGG, OPUS, and FLAC. Maximum upload size is 100 MB.'}
          </small>
        </div>

        {/* ============================================================
            MEDIA URL FALLBACK
           ============================================================ */}
        <label className="music-form-field music-form-field--full">
          <span>
            {isVideoContent
              ? 'Video URL'
              : 'Audio URL'}
            {!mediaFile && (
              <>
                {' '}
                <b>*</b>
              </>
            )}
          </span>

          <input
            type="url"
            value={form.mediaUrl}
            onChange={(event) =>
              updateField(
                'mediaUrl',
                event.target.value,
              )
            }
            placeholder={
              isVideoContent
                ? 'https://your-storage.com/video.mp4'
                : 'https://your-storage.com/audio.mp3'
            }
            disabled={saving || Boolean(mediaFile)}
          />

          <small>
            {mediaFile
              ? 'A device file is selected, so the URL is not required.'
              : 'You can use a hosted media URL instead of uploading a file.'}
          </small>
        </label>

        {/* ============================================================
            COVER / THUMBNAIL
           ============================================================ */}
        <label className="music-form-field music-form-field--full">
          <span>
            Cover / Thumbnail URL
          </span>

          <input
            type="url"
            value={form.coverImageUrl}
            onChange={(event) => {
              updateField(
                'coverImageUrl',
                event.target.value,
              );

              setCoverPreviewError(false);
            }}
            placeholder="https://your-storage.com/cover.jpg"
            disabled={saving}
          />

          <small>
            Use high-quality artwork or a
            thumbnail for your release.
          </small>
        </label>

        {/* ============================================================
            COVER PREVIEW
           ============================================================ */}
        {form.coverImageUrl &&
          !coverPreviewError && (
            <div className="music-cover-preview">
              <img
                src={form.coverImageUrl}
                alt="Content artwork preview"
                onError={() =>
                  setCoverPreviewError(true)
                }
              />
            </div>
          )}

        {form.coverImageUrl &&
          coverPreviewError && (
            <div className="music-cover-preview music-cover-preview--error">
              <span>
                Cover image could not be loaded.
              </span>
            </div>
          )}
      </div>
    </section>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}