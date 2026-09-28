import React, { useEffect, useState } from "react";
import { Radio, Users, Video } from "lucide-react";

import { liveApi } from "../../../my-live/api";

interface LiveStream {
  id: string;
  title: string;
  description?: string;
  displayName: string;
  username?: string;
  avatar?: string;
  viewers?: number;
  thumbnailUrl?: string;
  status?: string;
}

export default function LiveStreamsRail() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadLiveStreams() {
      try {
        setLoading(true);

        const result = await liveApi.getPublicLiveStreams();

        if (!mounted) {
          return;
        }

        const list = Array.isArray(result)
          ? result
          : Array.isArray((result as any)?.streams)
            ? (result as any).streams
            : [];

        setStreams(
          list.filter(
            (stream: LiveStream) =>
              stream &&
              stream.status !== "ended",
          ),
        );
      } catch (error) {
        console.error(
          "[LiveStreamsRail] Failed to load live streams:",
          error,
        );

        if (mounted) {
          setStreams([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadLiveStreams();

    const interval = window.setInterval(
      loadLiveStreams,
      30000,
    );

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  function openStream(streamId: string) {
    window.location.href = `/live/${streamId}`;
  }

  return (
    <section
      className="fk-live-rail"
      aria-label="Live now"
    >
      <div className="fk-live-rail__header">
        <div className="fk-live-rail__title">
          <span className="fk-live-rail__live-icon">
            <Radio size={16} />
          </span>

          <div>
            <h2>Live Now</h2>
            <p>People streaming on Fockis</p>
          </div>
        </div>

        {streams.length > 0 && (
          <span className="fk-live-rail__count">
            {streams.length} live
          </span>
        )}
      </div>

      {loading && (
        <div className="fk-live-rail__loading">
          <div className="fk-live-rail__skeleton" />
          <div className="fk-live-rail__skeleton" />
          <div className="fk-live-rail__skeleton" />
        </div>
      )}

      {!loading && streams.length === 0 && (
        <div className="fk-live-rail__empty">
          <div className="fk-live-rail__empty-icon">
            <Video size={22} />
          </div>

          <div>
            <strong>No one is live right now</strong>
            <span>
              When someone starts a public live,
              it will appear here.
            </span>
          </div>
        </div>
      )}

      {!loading && streams.length > 0 && (
        <div className="fk-live-rail__scroller">
          {streams.map((stream) => (
            <button
              key={stream.id}
              type="button"
              className="fk-live-card"
              onClick={() =>
                openStream(stream.id)
              }
            >
              <div className="fk-live-card__media">
                {stream.thumbnailUrl ? (
                  <img
                    src={stream.thumbnailUrl}
                    alt=""
                  />
                ) : (
                  <div className="fk-live-card__placeholder">
                    <Video size={30} />
                  </div>
                )}

                <span className="fk-live-card__badge">
                  <span />
                  LIVE
                </span>

                <span className="fk-live-card__viewers">
                  <Users size={12} />
                  {stream.viewers ?? 0}
                </span>
              </div>

              <div className="fk-live-card__body">
                <div className="fk-live-card__creator">
                  {stream.avatar ? (
                    <img
                      src={stream.avatar}
                      alt=""
                    />
                  ) : (
                    <div className="fk-live-card__avatar">
                      {(
                        stream.displayName ||
                        stream.username ||
                        "F"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}

                  <div>
                    <strong>
                      {stream.displayName ||
                        stream.username ||
                        "Fockis User"}
                    </strong>

                    {stream.username && (
                      <span>
                        @{stream.username}
                      </span>
                    )}
                  </div>
                </div>

                <h3>
                  {stream.title ||
                    "Live on Fockis"}
                </h3>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}