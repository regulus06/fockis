import {
  Radio,
  Users,
  Play,
  Eye,
} from "lucide-react";

import type { PublicLiveStream } from "./liveStreams";

interface LiveNowRailProps {
  streams: PublicLiveStream[];
  loading: boolean;
  onOpen: (streamId: string) => void;
}

export default function LiveNowRail({
  streams,
  loading,
  onOpen,
}: LiveNowRailProps) {
  if (
    !loading &&
    streams.length === 0
  ) {
    return null;
  }

  return (
    <section
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

            <p>
              People you can watch right now
            </p>
          </div>
        </div>

        {streams.length > 0 && (
          <span className="fk-live-now-rail__count">
            {streams.length} live
          </span>
        )}
      </div>

      {loading && (
        <div
          className="fk-live-now-rail__scroller"
          aria-live="polite"
        >
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="fk-live-now-card fk-live-now-card--skeleton"
              aria-hidden="true"
            >
              <div className="fk-live-now-card__avatar-skeleton" />

              <div className="fk-live-now-card__skeleton-line" />

              <div className="fk-live-now-card__skeleton-line fk-live-now-card__skeleton-line--small" />
            </div>
          ))}
        </div>
      )}

      {!loading &&
        streams.length > 0 && (
          <div
            className="fk-live-now-rail__scroller"
            aria-label="Active live streams"
          >
            {streams.map((stream) => {
              const displayName =
                stream.displayName ||
                stream.username ||
                "Fockis user";

              const username = stream.username
                ? `@${stream.username}`
                : "";

              const avatar =
                stream.avatarUrl ||
                stream.avatar ||
                "";

              const thumbnail =
                stream.thumbnailUrl ||
                stream.thumbnail ||
                "";

              const viewers = Math.max(
                0,
                Number(stream.viewers || 0),
              );

              return (
                <button
                  key={stream.id}
                  type="button"
                  className="fk-live-now-card"
                  onClick={() =>
                    onOpen(stream.id)
                  }
                  aria-label={`Watch ${displayName} live`}
                >
                  <div className="fk-live-now-card__media">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt=""
                        className="fk-live-now-card__thumbnail"
                        loading="lazy"
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
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                          loading="lazy"
                        />
                      ) : (
                        <span>
                          {displayName
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="fk-live-now-card__identity">
                      <strong>
                        {displayName}
                      </strong>

                      {username && (
                        <span>
                          {username}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="fk-live-now-card__title">
                    {stream.title ||
                      "Live on Fockis"}
                  </div>

                  <div className="fk-live-now-card__watch">
                    <Play
                      size={12}
                      fill="currentColor"
                    />

                    <span>
                      Watch Live
                    </span>

                    <Eye size={12} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
    </section>
  );
}