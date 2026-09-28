import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseProgress() {
  const {
    saving,
    creationMode,
    progress,
  } = useMusicCreateRelease();

  if (
    !saving ||
    creationMode !== 'series'
  ) {
    return null;
  }

  return (
    <div className="music-series-progress">
      <div>
        <strong>
          Creating series…
        </strong>

        <span>
          {progress}% complete
        </span>
      </div>

      <div className="music-series-progress-track">
        <div
          className="music-series-progress-bar"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}