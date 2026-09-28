import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

import type { Attachment } from "../types";
import { formatDuration } from "../utils/dateHelpers";
import VoiceWaveform from "./VoiceWaveform";

interface VoiceMessageProps {
  attachment: Attachment;
}

export default function VoiceMessage({
  attachment,
}: VoiceMessageProps) {
  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const [currentTime, setCurrentTime] =
    useState(0);

  const [audioDuration, setAudioDuration] =
    useState(0);

  const duration =
    attachment.duration ??
    audioDuration ??
    0;

  const waveform =
    attachment.waveform &&
    attachment.waveform.length > 0
      ? attachment.waveform
      : Array(32).fill(0.3);

  useEffect(() => {
    const audio = audioRef.current;

    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, []);

  const toggle = async () => {
    const audio =
      audioRef.current;

    if (!audio) {
      return;
    }

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.error(
        "[FOCKIS VOICE] Unable to play audio:",
        error,
      );

      setPlaying(false);
    }
  };

  return (
    <div className="voice-message">
      <audio
        ref={audioRef}
        src={attachment.url}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const audio =
            event.currentTarget;

          if (
            Number.isFinite(
              audio.duration,
            )
          ) {
            setAudioDuration(
              audio.duration,
            );
          }
        }}
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onTimeUpdate={(event) => {
          const audio =
            event.currentTarget;

          const current =
            audio.currentTime || 0;

          const total =
            audio.duration ||
            duration ||
            0;

          setCurrentTime(
            current,
          );

          setProgress(
            total > 0
              ? (current / total) *
                  100
              : 0,
          );
        }}
        onEnded={(event) => {
          const audio =
            event.currentTarget;

          audio.currentTime = 0;

          setPlaying(false);
          setProgress(0);
          setCurrentTime(0);
        }}
        onError={(event) => {
          console.error(
            "[FOCKIS VOICE] Audio playback error:",
            event.currentTarget.error,
            attachment.url,
          );

          setPlaying(false);
        }}
      />

      <button
        type="button"
        className="voice-message__play-btn"
        onClick={toggle}
        aria-label={
          playing
            ? "Pause voice message"
            : "Play voice message"
        }
      >
        {playing ? (
          <Pause size={18} />
        ) : (
          <Play size={18} />
        )}
      </button>

      <VoiceWaveform
        bars={waveform}
        progress={progress}
      />

      <span className="voice-message__duration">
        {formatDuration(
          playing || currentTime > 0
            ? currentTime
            : duration,
        )}
      </span>
    </div>
  );
}