import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  Playlist,
  Track,
} from "../types/playlist.types";

export interface PlaylistPlayerProps {
  playlist: Playlist;
  initialTrackId?: string;
  onPlayRecorded?: (trackId: string) => void;
  sticky?: boolean;
}

/* =========================================================
   Formatting
========================================================= */

function formatDuration(
  seconds: number | undefined | null,
): string {
  if (
    seconds === undefined ||
    seconds === null ||
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "0:00";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes
      .toString()
      .padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

/* =========================================================
   Icons
========================================================= */

interface IconProps {
  width?: number;
  height?: number;
}

function PlayIcon({
  width = 18,
  height = 18,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5.14v13.72c0 .78.85 1.26 1.52.86l10.18-6.86a1 1 0 0 0 0-1.72L9.52 4.28A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

function PauseIcon({
  width = 18,
  height = 18,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function SkipBackIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M6 5h2v14H6z" />
      <path d="m18 6-8 6 8 6V6Z" />
    </svg>
  );
}

function SkipForwardIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16 5h2v14h-2z" />
      <path d="m6 6 8 6-8 6V6Z" />
    </svg>
  );
}

function ShuffleIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7h3c4 0 6 10 10 10h5" />
      <path d="m18 14 3 3-3 3" />
      <path d="M3 17h3c1.7 0 2.8-1.5 3.8-3" />
      <path d="M15 7h1c1.4 0 2.8 1.1 4 2.5" />
      <path d="m18 4 3 3-3 3" />
    </svg>
  );
}

function RepeatIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </svg>
  );
}

function VolumeIcon({
  width = 16,
  height = 16,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function FullscreenIcon({
  width = 18,
  height = 18,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3H3v5" />
      <path d="M3 3l6 6" />
      <path d="M16 3h5v5" />
      <path d="m21 3-6 6" />
      <path d="M8 21H3v-5" />
      <path d="m3 21 6-6" />
      <path d="M16 21h5v-5" />
      <path d="m21 21-6-6" />
    </svg>
  );
}

function PipIcon({
  width = 18,
  height = 18,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <rect x="12" y="12" width="7" height="5" rx="1" />
    </svg>
  );
}

/* =========================================================
   Playlist Player
========================================================= */

export function PlaylistPlayer({
  playlist,
  initialTrackId,
  onPlayRecorded,
  sticky = false,
}: PlaylistPlayerProps) {
  const playableTracks = useMemo(
    () =>
      playlist.tracks.filter(
        (track) => !track.isLocked,
      ),
    [playlist.tracks],
  );

  const [currentIndex, setCurrentIndex] =
    useState(() => {
      const index = playableTracks.findIndex(
        (track) => track.id === initialTrackId,
      );

      return index >= 0 ? index : 0;
    });

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [duration, setDuration] =
    useState(0);

  const [volume, setVolume] =
    useState(0.8);

  const [shuffle, setShuffle] =
    useState(false);

  const [repeat, setRepeat] =
    useState<"off" | "one" | "all">("off");

  const [playbackRate, setPlaybackRate] =
    useState(1);

  const [hasRecordedPlay, setHasRecordedPlay] =
    useState(false);

  const mediaRef =
    useRef<HTMLAudioElement | HTMLVideoElement>(
      null,
    );

  const stageRef =
    useRef<HTMLDivElement>(null);

  const track: Track | undefined =
    playableTracks[currentIndex];

  const isVideo =
    track?.mediaKind === "video";

  /* -------------------------------------------------------
     Reset track state
  ------------------------------------------------------- */

  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setHasRecordedPlay(false);
  }, [track?.id]);

  /* -------------------------------------------------------
     Media settings
  ------------------------------------------------------- */

  useEffect(() => {
    const media = mediaRef.current;

    if (!media) {
      return;
    }

    media.volume = volume;
    media.playbackRate = playbackRate;
  }, [
    volume,
    playbackRate,
    track?.id,
  ]);

  /* -------------------------------------------------------
     Play / Pause
  ------------------------------------------------------- */

  useEffect(() => {
    const media = mediaRef.current;

    if (!media) {
      return;
    }

    if (isPlaying) {
      media
        .play()
        .catch(() => {
          setIsPlaying(false);
        });
    } else {
      media.pause();
    }
  }, [
    isPlaying,
    track?.id,
  ]);

  /* -------------------------------------------------------
     Track navigation
  ------------------------------------------------------- */

  const goToIndex = useCallback(
    (index: number) => {
      if (
        index < 0 ||
        index >= playableTracks.length
      ) {
        return;
      }

      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [playableTracks.length],
  );

  const handleNext = useCallback(() => {
    if (playableTracks.length === 0) {
      return;
    }

    if (shuffle) {
      let nextIndex = Math.floor(
        Math.random() *
          playableTracks.length,
      );

      if (
        playableTracks.length > 1 &&
        nextIndex === currentIndex
      ) {
        nextIndex =
          (nextIndex + 1) %
          playableTracks.length;
      }

      goToIndex(nextIndex);
      return;
    }

    if (
      currentIndex ===
      playableTracks.length - 1
    ) {
      if (repeat === "all") {
        goToIndex(0);
      } else {
        setIsPlaying(false);
      }

      return;
    }

    goToIndex(currentIndex + 1);
  }, [
    currentIndex,
    goToIndex,
    playableTracks.length,
    repeat,
    shuffle,
  ]);

  const handlePrev = useCallback(() => {
    if (currentTime > 3) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = 0;
      }

      setCurrentTime(0);
      return;
    }

    goToIndex(
      Math.max(
        0,
        currentIndex - 1,
      ),
    );
  }, [
    currentIndex,
    currentTime,
    goToIndex,
  ]);

  /* -------------------------------------------------------
     Ended
  ------------------------------------------------------- */

  const handleEnded = useCallback(() => {
    if (repeat === "one") {
      const media = mediaRef.current;

      if (media) {
        media.currentTime = 0;

        media
          .play()
          .catch(() => undefined);
      }

      return;
    }

    handleNext();
  }, [
    handleNext,
    repeat,
  ]);

  /* -------------------------------------------------------
     Time updates
  ------------------------------------------------------- */

  const handleTimeUpdate = () => {
    const media = mediaRef.current;

    if (!media) {
      return;
    }

    setCurrentTime(media.currentTime);

    if (
      !hasRecordedPlay &&
      track &&
      Number.isFinite(media.duration) &&
      media.duration > 0 &&
      media.currentTime / media.duration >
        0.5
    ) {
      setHasRecordedPlay(true);

      onPlayRecorded?.(track.id);
    }
  };

  /* -------------------------------------------------------
     Seek
  ------------------------------------------------------- */

  const handleSeek = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const media = mediaRef.current;

    if (!media) {
      return;
    }

    const value = Number(
      event.target.value,
    );

    media.currentTime = value;

    setCurrentTime(value);
  };

  /* -------------------------------------------------------
     Fullscreen
  ------------------------------------------------------- */

  const toggleFullscreen = () => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    if (document.fullscreenElement) {
      document
        .exitFullscreen()
        .catch(() => undefined);
    } else {
      stage
        .requestFullscreen()
        .catch(() => undefined);
    }
  };

  /* -------------------------------------------------------
     Picture in Picture
  ------------------------------------------------------- */

  const togglePip = async () => {
    const media =
      mediaRef.current as HTMLVideoElement | null;

    if (!media) {
      return;
    }

    if (
      !(
        "requestPictureInPicture" in
        media
      )
    ) {
      return;
    }

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await media.requestPictureInPicture();
      }
    } catch {
      // Browser does not allow picture-in-picture.
    }
  };

  /* -------------------------------------------------------
     Empty state
  ------------------------------------------------------- */

  if (!track) {
    return (
      <div
        className="fk-player"
        role="status"
      >
        <div
          style={{
            padding: 24,
            textAlign: "center",
            color: "var(--fk-slate)",
          }}
        >
          No playable tracks in this
          collection yet.
        </div>
      </div>
    );
  }

  /* =======================================================
     Render
  ======================================================= */

  return (
    <div
      className={`fk-player${
        sticky
          ? " fk-player--sticky"
          : ""
      }`}
    >
      {/* ===================================================
          VIDEO
      =================================================== */}

      {isVideo ? (
        <div className="fk-video-player">
          <div
            className="fk-video-player__stage"
            ref={stageRef}
          >
            <video
              ref={
                mediaRef as React.RefObject<HTMLVideoElement>
              }
              src={track.streamUrl}
              poster={
                track.posterUrl ??
                playlist.coverImageUrl
              }
              onTimeUpdate={
                handleTimeUpdate
              }
              onLoadedMetadata={(event) =>
                setDuration(
                  event.currentTarget
                    .duration,
                )
              }
              onEnded={handleEnded}
              onClick={() =>
                setIsPlaying(
                  (playing) => !playing,
                )
              }
              playsInline
              preload="metadata"
            />
          </div>

          <div className="fk-video-player__controls">
            <button
              type="button"
              className="fk-video-player__btn"
              onClick={() =>
                setIsPlaying(
                  (playing) => !playing,
                )
              }
              aria-label={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
            >
              {isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
            </button>

            <span className="fk-video-player__time fk-data">
              {formatDuration(
                currentTime,
              )}
            </span>

            <input
              type="range"
              className="fk-video-player__bar"
              min={0}
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Seek"
            />

            <span className="fk-video-player__time fk-data">
              {formatDuration(duration)}
            </span>

            <select
              className="fk-video-player__speed"
              value={playbackRate}
              onChange={(event) =>
                setPlaybackRate(
                  Number(
                    event.target.value,
                  ),
                )
              }
              aria-label="Playback speed"
            >
              {[
                0.5,
                0.75,
                1,
                1.25,
                1.5,
                2,
              ].map((rate) => (
                <option
                  key={rate}
                  value={rate}
                >
                  {rate}x
                </option>
              ))}
            </select>

            <button
              type="button"
              className="fk-video-player__btn"
              onClick={togglePip}
              aria-label="Picture in picture"
            >
              <PipIcon />
            </button>

            <button
              type="button"
              className="fk-video-player__btn"
              onClick={toggleFullscreen}
              aria-label="Fullscreen"
            >
              <FullscreenIcon />
            </button>
          </div>
        </div>
      ) : (
        /* =================================================
           AUDIO
        ================================================== */

        <div className="fk-audio-player">
          <div className="fk-audio-player__meta">
            {track.posterUrl ??
            playlist.coverImageUrl ? (
              <img
                className="fk-audio-player__art"
                src={
                  track.posterUrl ??
                  playlist.coverImageUrl
                }
                alt=""
              />
            ) : (
              <div className="fk-audio-player__art fk-audio-player__art--placeholder">
                <PlayIcon
                  width={24}
                  height={24}
                />
              </div>
            )}

            <div
              style={{
                minWidth: 0,
              }}
            >
              <div className="fk-audio-player__title">
                {track.title}
              </div>

              <div className="fk-audio-player__artist">
                {track.artist}
              </div>
            </div>
          </div>

          <div className="fk-audio-player__center">
            <div className="fk-audio-player__transport">
              <button
                type="button"
                className="fk-icon-btn"
                aria-pressed={shuffle}
                aria-label="Shuffle"
                onClick={() =>
                  setShuffle(
                    (value) => !value,
                  )
                }
              >
                <ShuffleIcon />
              </button>

              <button
                type="button"
                className="fk-icon-btn"
                aria-label="Previous track"
                onClick={handlePrev}
              >
                <SkipBackIcon />
              </button>

              <button
                type="button"
                className="fk-audio-player__play"
                onClick={() =>
                  setIsPlaying(
                    (value) => !value,
                  )
                }
                aria-label={
                  isPlaying
                    ? "Pause"
                    : "Play"
                }
              >
                {isPlaying ? (
                  <PauseIcon />
                ) : (
                  <PlayIcon />
                )}
              </button>

              <button
                type="button"
                className="fk-icon-btn"
                aria-label="Next track"
                onClick={handleNext}
              >
                <SkipForwardIcon />
              </button>

              <button
                type="button"
                className="fk-icon-btn"
                aria-pressed={
                  repeat !== "off"
                }
                aria-label={`Repeat: ${repeat}`}
                onClick={() =>
                  setRepeat(
                    (value) =>
                      value === "off"
                        ? "all"
                        : value === "all"
                          ? "one"
                          : "off",
                  )
                }
              >
                <RepeatIcon />
              </button>
            </div>

            <div className="fk-audio-player__progress">
              <span className="fk-data">
                {formatDuration(
                  currentTime,
                )}
              </span>

              <input
                type="range"
                className="fk-audio-player__bar"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={handleSeek}
                aria-label="Seek"
              />

              <span className="fk-data">
                {formatDuration(duration)}
              </span>
            </div>

            <audio
              ref={
                mediaRef as React.RefObject<HTMLAudioElement>
              }
              src={track.streamUrl}
              onTimeUpdate={
                handleTimeUpdate
              }
              onLoadedMetadata={(event) =>
                setDuration(
                  event.currentTarget
                    .duration,
                )
              }
              onEnded={handleEnded}
              preload="metadata"
            />
          </div>

          <div className="fk-audio-player__right">
            <div className="fk-audio-player__volume">
              <VolumeIcon />

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) =>
                  setVolume(
                    Number(
                      event.target.value,
                    ),
                  )
                }
                aria-label="Volume"
              />
            </div>

            <span className="fk-caption">
              Track {currentIndex + 1} of{" "}
              {playableTracks.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}