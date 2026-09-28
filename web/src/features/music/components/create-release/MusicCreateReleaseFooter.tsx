import { Link } from 'react-router-dom';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseFooter() {
  const {
    saving,
    publishMode,
    creationMode,
    progress,
    setPublishMode,
    submit,
  } = useMusicCreateRelease();

  return (
    <footer className="music-create-footer">
      <Link
        to="/music/studio"
        className="music-create-cancel"
      >
        Cancel
      </Link>

      <div>
        <button
          type="submit"
          className="music-create-draft-button"
          disabled={saving}
          onClick={() =>
            setPublishMode('draft')
          }
        >
          {saving &&
          publishMode === 'draft'
            ? creationMode ===
              'series'
              ? `Creating ${progress}%…`
              : 'Saving…'
            : creationMode ===
                'series'
              ? 'Save Series Draft'
              : 'Save Draft'}
        </button>

        {publishMode ===
        'schedule' ? (
          <button
            type="button"
            className="music-create-primary-button"
            disabled={saving}
            onClick={(event) =>
              submit(
                event,
                'schedule',
              )
            }
          >
            {saving
              ? creationMode ===
                'series'
                ? `Scheduling ${progress}%…`
                : 'Scheduling…'
              : '📅 Schedule'}
          </button>
        ) : (
          <button
            type="button"
            className="music-create-primary-button"
            disabled={saving}
            onClick={(event) =>
              submit(
                event,
                'publish',
              )
            }
          >
            {saving
              ? creationMode ===
                'series'
                ? `Publishing ${progress}%…`
                : 'Publishing…'
              : creationMode ===
                  'series'
                ? '🚀 Publish Series'
                : '🚀 Publish'}
          </button>
        )}
      </div>
    </footer>
  );
}