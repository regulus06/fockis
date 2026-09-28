import { useMusicCreateRelease } from '../../context/MusicCreateReleaseContext';

export default function MusicCreateReleaseAlert() {
  const { error } =
    useMusicCreateRelease();

  if (!error) {
    return null;
  }

  return (
    <div
      className="music-create-alert"
      role="alert"
    >
      <strong>
        Unable to create content
      </strong>

      <span>{error}</span>
    </div>
  );
}