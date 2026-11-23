/**
 * MediaPlayerDialog.tsx
 * -----------------------------------------------------------------------------
 * Plays a sermon / Bible study on the page instead of opening the file
 * (opening a .mov file directly makes the browser download it).
 *
 *   YouTube / Vimeo link → embedded player
 *   video file           → <video> player
 *   audio file           → <audio> player
 *   PDF / document       → shown inline
 * Uploaded videos are converted by the server to H.264 MP4 so every browser
 * can play them; while that runs, this says so. If the browser still can't
 * decode a file, it says so and offers the download instead.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export interface PlayableMedia {
  title: string;
  subtitle?: string;
  url: string;
  mediaType?: string | null;
  mimeType?: string | null;
  posterUrl?: string | null;
  /** The server is still converting this video to a format every browser plays. */
  processing?: boolean;
}

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}?autoplay=1&rel=0`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return null;
}

function kindOf(m: PlayableMedia): "embed" | "video" | "audio" | "document" {
  if (embedUrl(m.url)) return "embed";
  const type = (m.mediaType ?? "").toLowerCase();
  const mime = (m.mimeType ?? "").toLowerCase();
  const path = m.url.split("?")[0].toLowerCase();
  if (type === "audio" || mime.startsWith("audio/") || /\.(mp3|m4a|aac|wav|ogg|oga|flac)$/.test(path)) return "audio";
  if (type === "document" || mime === "application/pdf" || /\.pdf$/.test(path)) return "document";
  return "video";
}

export default function MediaPlayerDialog({ media, onClose }: { media: PlayableMedia; onClose: () => void }): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const kind = kindOf(media);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="mpl" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"mpl__box mpl__box--" + kind} role="dialog" aria-modal="true" aria-label={media.title}>
        <div className="mpl__head">
          <div>
            <strong>{media.title}</strong>
            {media.subtitle && <small>{media.subtitle}</small>}
          </div>
          <button type="button" className="mpl__close" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="mpl__stage">
          {media.processing && kind === "video" ? (
            <div className="mpl__error" role="status">
              <p>This video is being prepared so it plays in every browser.</p>
              <p>It's usually ready within a few minutes. Please check back soon.</p>
            </div>
          ) : failed ? (
            <div className="mpl__error">
              <p>This file can't be played in this browser.</p>
              <p>If it was uploaded recently, it may still be converting. Try again in a few minutes, or download it to watch now.</p>
              <a href={media.url} download className="cw-btn cw-btn--white">
                <Download aria-hidden="true" /> Download
              </a>
            </div>
          ) : kind === "embed" ? (
            <iframe src={embedUrl(media.url)!} title={media.title} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
          ) : kind === "audio" ? (
            <div className="mpl__audio" style={media.posterUrl ? { backgroundImage: `url("${media.posterUrl}")` } : undefined}>
              <audio src={media.url} controls autoPlay onError={() => setFailed(true)} />
            </div>
          ) : kind === "document" ? (
            <iframe src={media.url} title={media.title} />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={media.url} poster={media.posterUrl ?? undefined} controls autoPlay playsInline preload="metadata" onError={() => setFailed(true)} />
          )}
        </div>

        {!failed && !(media.processing && kind === "video") && kind !== "embed" && (
          <div className="mpl__foot">
            <a href={media.url} download>
              <Download aria-hidden="true" /> Download
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
