import { Link } from 'react-router-dom';

import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseHeader() {
  const {
    saving,
    reset,
  } = useMusicCreateRelease();

  return (
    <header className="music-create-header">
      <div>
        <Link
          to="/music/studio"
          className="music-create-back"
        >
          ← Back to Creator Studio
        </Link>

        <div className="music-create-eyebrow">
          FOCKIS CREATOR STUDIO
        </div>

        <h1>Create Content</h1>

        <p>
          Publish music, videos, movies,
          performances, creator content
          and complete multi-episode series.
        </p>
      </div>

      <div className="music-create-header-actions">
        <button
          type="button"
          className="music-create-secondary-button"
          onClick={reset}
          disabled={saving}
        >
          Reset
        </button>
      </div>
    </header>
  );
}