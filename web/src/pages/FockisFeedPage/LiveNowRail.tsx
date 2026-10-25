import {
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Radio,
  Users,
  Play,
  Eye,
} from "lucide-react";

import type { PublicLiveStream } from "./liveStreams";
import { FOCKIS_API_URL } from "../../config/fockisConfig";

interface LiveNowRailProps {
  /** Active public streams. Nothing is rendered when this is empty. */
  streams: PublicLiveStream[];
  onOpen: (streamId: string) => void;
}

/*
 * Chrome, Edge and Firefox keep the reading position on their own when
 * content above the viewport is added or removed (CSS scroll anchoring).
 * Elsewhere the rail does it itself.
 */
const supportsScrollAnchoring =
  typeof CSS !== "undefined" &&
  typeof CSS.supports === "function" &&
  CSS.supports("overflow-anchor", "auto");

interface RailBox {
  /** Distance from the top of the document to the rail. */
  top: number;
  /** Rail height plus the gap or margin before the next section. */
  space: number;
}

/**
 * Resolve relative media paths against the configured API server.
 * Also handles localhost URLs returned by a backend in production.
 */
function resolveMediaUrl(value?: string): string {
  const media = value?.trim();

  if (!media) return "";

  try {
    const apiUrl = new URL(FOCKIS_API_URL);
    const mediaUrl = new URL(media, apiUrl.origin);

    if (
      ["localhost", "127.0.0.1"].includes(mediaUrl.hostname) &&
      !["localhost", "127.0.0.1"].includes(apiUrl.hostname)
    ) {
      mediaUrl.protocol = apiUrl.protocol;
      mediaUrl.host = apiUrl.host;
    }

    return mediaUrl.href;
  } catch {
    return media;
  }
}

export default function LiveNowRail({
  streams,
  onOpen,
}: LiveNowRailProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const boxRef = useRef<RailBox | null>(null);
  const visible = streams.length > 0;

  useLayoutEffect(() => {
    const section = sectionRef.current;

    if (!visible || !section) {
      return;
    }

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const next = section.nextElementSibling;

      // Space the rail takes in the column, including any flex gap or
      // margin before the next section.
      const space = next
        ? next.getBoundingClientRect().top - rect.top
        : rect.height +
          (parseFloat(getComputedStyle(section).marginBottom) || 0);

      boxRef.current = {
        top: rect.top + window.scrollY,
        space: Math.max(0, space),
      };
    };

    measure();

    // Appeared above what the user is reading: keep their position.
    if (
      !supportsScrollAnchoring &&
      boxRef.current &&
      boxRef.current.top + boxRef.current.space <= window.scrollY
    ) {
      window.scrollBy(0, boxRef.current.space);
      measure();
    }

    let frame = 0;

    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(scheduleMeasure)
        : null;

    resizeObserver?.observe(section);
    window.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);

      // Removed above what the user is reading: keep their position.
      const box = boxRef.current;

      if (
        !supportsScrollAnchoring &&
        box &&
        box.top + box.space <= window.scrollY
      ) {
        window.scrollBy(0, -box.space);
      }

      boxRef.current = null;
    };
  }, [visible]);

  // No public stream is live: render nothing, so no space is reserved.
  if (!visible) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className="fk-live-now-rail"
      aria-label="Live now"
    >
      <div className="fk-live-now-rail__header">
        <div className="fk-live-now-rail__heading">
          <span
            className="fk-live-now-rail__live-icon"
            aria-hidden="true"
          >
            <Radio size={17} />
          </span>

          <div>
            <h2>Live Now</h2>
            <p>People you can watch right now</p>
          </div>
        </div>

        <span className="fk-live-now-rail__count">
          {streams.length} live
        </span>
      </div>

      <div
        className="fk-live-now-rail__scroller"
        aria-label="Active live streams"
      >
        {streams.map((stream) => (
          <LiveNowCard
            key={stream.id}
            stream={stream}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}

function LiveNowCard({
  stream,
  onOpen,
}: {
  stream: PublicLiveStream;
  onOpen: (streamId: string) => void;
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const displayName =
    stream.displayName ||
    stream.username ||
    "Fockis user";

  const username = stream.username
    ? `@${stream.username}`
    : "";

  const avatar = resolveMediaUrl(
    stream.avatarUrl || stream.avatar,
  );

  const thumbnail = resolveMediaUrl(
    stream.thumbnailUrl || stream.thumbnail,
  );

  const viewers = Math.max(
    0,
    Number(stream.viewers || 0),
  );

  return (
    <button
      type="button"
      className="fk-live-now-card"
      onClick={() => onOpen(stream.id)}
      aria-label={`Watch ${displayName} live`}
    >
      <div className="fk-live-now-card__media">
        {thumbnail && !thumbnailFailed ? (
          <img
            src={thumbnail}
            alt=""
            className="fk-live-now-card__thumbnail"
            loading="lazy"
            onError={() => setThumbnailFailed(true)}
          />
        ) : (
          <div
            className="fk-live-now-card__placeholder"
            aria-hidden="true"
          >
            <Radio size={30} />
          </div>
        )}

        <span className="fk-live-now-card__live-badge">
          <span className="fk-live-now-card__live-dot" />
          LIVE
        </span>

        <span className="fk-live-now-card__viewers">
          <Users size={11} />
          {viewers.toLocaleString()}
        </span>
      </div>

      <div className="fk-live-now-card__creator">
        <div className="fk-live-now-card__avatar">
          {avatar && !avatarFailed ? (
            <img
              src={avatar}
              alt=""
              loading="lazy"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span>
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="fk-live-now-card__identity">
          <strong>{displayName}</strong>
          {username && <span>{username}</span>}
        </div>
      </div>

      <div className="fk-live-now-card__title">
        {stream.title || "Live on Fockis"}
      </div>

      <div className="fk-live-now-card__watch">
        <Play size={12} fill="currentColor" />
        <span>Watch Live</span>
        <Eye size={12} />
      </div>
    </button>
  );
}