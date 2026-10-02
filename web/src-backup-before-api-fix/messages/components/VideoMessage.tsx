import { useRef, useState } from 'react';
import { Play, Pause, Maximize2 } from 'lucide-react';
import type { Attachment } from '../types';
import { formatDuration } from '../utils/dateHelpers';

interface VideoMessageProps {
  attachment: Attachment;
  onOpenFullscreen: () => void;
}

export default function VideoMessage({ attachment, onOpenFullscreen }: VideoMessageProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) video.pause();
    else video.play();
    setPlaying(!playing);
  };

  return (
    <div className="video-message">
      <video
        ref={videoRef}
        src={attachment.url}
        poster={attachment.thumbnailUrl}
        className="video-message__el"
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
        }}
        onEnded={() => setPlaying(false)}
      />
      <div className="video-message__overlay">
        <button type="button" className="video-message__play-btn" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={22} /> : <Play size={22} />}
        </button>
        <button type="button" className="video-message__fullscreen-btn" onClick={onOpenFullscreen} aria-label="Fullscreen">
          <Maximize2 size={16} />
        </button>
        <span className="video-message__duration">{formatDuration(attachment.duration ?? 0)}</span>
      </div>
      <div className="video-message__progress">
        <div className="video-message__progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
