import { FOCKIS_API_URL } from "../../../config/fockisConfig";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Eye,
  Radio,
  Users,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import "./LiveNowRail.scss";

/* ============================================================================
   TYPES
============================================================================ */

interface LiveStream {
  id: string;

  title: string;

  description?: string | null;

  username?: string | null;

  displayName?: string | null;

  avatarUrl?: string | null;

  thumbnailUrl?: string | null;

  viewers?: number;

  likes?: number;

  status?: string;

  visibility?: string;

  isPublic?: boolean;

  user?: {
    id?: string;

    username?: string;

    displayName?: string;

    avatarUrl?: string;
  };
}

interface LiveNowRailProps {
  className?: string;
}

/* ============================================================================
   API
============================================================================ */

const API_BASE =
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

async function getPublicLiveStreams(): Promise<LiveStream[]> {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt");

  const response =
    await fetch(
      `${API_BASE}/live/public`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",

          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      `Failed to load live streams (${response.status})`,
    );
  }

  const data =
    await response.json();

  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  if (
    data &&
    Array.isArray(data.items)
  ) {
    return data.items;
  }

  return [];
}

/* ============================================================================
   HELPERS
============================================================================ */

function getStreamId(
  stream: LiveStream,
): string {
  return String(
    stream.id ||
      "",
  );
}

function getDisplayName(
  stream: LiveStream,
): string {
  return (
    stream.displayName ||
    stream.user?.displayName ||
    stream.username ||
    stream.user?.username ||
    "Fockis Creator"
  );
}

function getUsername(
  stream: LiveStream,
): string {
  return (
    stream.username ||
    stream.user?.username ||
    ""
  );
}

function getAvatar(
  stream: LiveStream,
): string | null {
  return (
    stream.avatarUrl ||
    stream.user?.avatarUrl ||
    null
  );
}

function getViewers(
  stream: LiveStream,
): number {
  return Number(
    stream.viewers || 0,
  );
}

function formatCount(
  value: number,
): string {
  if (value >= 1_000_000) {
    return `${(
      value / 1_000_000
    ).toFixed(
      value >= 10_000_000
        ? 0
        : 1,
    )}M`;
  }

  if (value >= 1_000) {
    return `${(
      value / 1_000
    ).toFixed(
      value >= 10_000
        ? 0
        : 1,
    )}K`;
  }

  return String(value);
}

/* ============================================================================
   COMPONENT
============================================================================ */

export default function LiveNowRail({
  className = "",
}: LiveNowRailProps) {
  const navigate =
    useNavigate();

  const [
    streams,
    setStreams,
  ] = useState<LiveStream[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  /* --------------------------------------------------------------------------
     LOAD
  -------------------------------------------------------------------------- */

  const loadStreams =
    useCallback(
      async (
        showLoader = false,
      ) => {
        try {
          if (showLoader) {
            setLoading(true);
          }

          setError(null);

          const result =
            await getPublicLiveStreams();

          const publicLive =
            result.filter(
              (stream) => {
                const status =
                  String(
                    stream.status ||
                      "",
                  ).toLowerCase();

                const visibility =
                  String(
                    stream.visibility ||
                      "",
                  ).toLowerCase();

                if (
                  status &&
                  ![
                    "live",
                    "active",
                    "broadcasting",
                  ].includes(
                    status,
                  )
                ) {
                  return false;
                }

                if (
                  visibility &&
                  [
                    "private",
                    "followers",
                    "friends",
                    "invite",
                  ].includes(
                    visibility,
                  )
                ) {
                  return false;
                }

                if (
                  stream.isPublic ===
                  false
                ) {
                  return false;
                }

                return Boolean(
                  getStreamId(
                    stream,
                  ),
                );
              },
            );

          setStreams(
            publicLive,
          );
        } catch (err) {
          console.error(
            "[LiveNowRail] Failed to load public live streams:",
            err,
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load live streams",
          );

          /*
           * Do not destroy an already visible rail
           * just because one polling request failed.
           */
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  /* --------------------------------------------------------------------------
     INITIAL LOAD + POLLING
  -------------------------------------------------------------------------- */

  useEffect(() => {
    void loadStreams(
      true,
    );

    const interval =
      window.setInterval(
        () => {
          void loadStreams();
        },
        15_000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [
    loadStreams,
  ]);

  /* --------------------------------------------------------------------------
     HIDDEN WHEN NOTHING IS LIVE
  -------------------------------------------------------------------------- */

  if (
    !loading &&
    streams.length === 0
  ) {
    return null;
  }

  /* --------------------------------------------------------------------------
     OPEN LIVE STREAM
  -------------------------------------------------------------------------- */

  function openStream(
    stream: LiveStream,
  ) {
    const id =
      getStreamId(
        stream,
      );

    if (!id) {
      return;
    }

    navigate(
      `/my-live/${encodeURIComponent(
        id,
      )}`,
    );
  }

  /* --------------------------------------------------------------------------
     RENDER
  -------------------------------------------------------------------------- */

  return (
    <section
      className={`fk-live-now-rail ${className}`}
      aria-label="Live now"
    >
      {/* =====================================================================
          HEADER
      ===================================================================== */}

      <div className="fk-live-now-rail__header">
        <div className="fk-live-now-rail__heading">
          <span className="fk-live-now-rail__live-icon">
            <Radio
              size={17}
              strokeWidth={2.5}
            />
          </span>

          <div>
            <h2>
              Live Now
            </h2>

            <p>
              People you can watch live
            </p>
          </div>
        </div>

        {streams.length > 0 && (
          <span className="fk-live-now-rail__count">
            {streams.length} live
          </span>
        )}
      </div>

      {/* =====================================================================
          LOADING
      ===================================================================== */}

      {loading && (
        <div className="fk-live-now-rail__scroller">
          {[
            1,
            2,
            3,
            4,
            5,
          ].map(
            (item) => (
              <div
                key={item}
                className="fk-live-now-card fk-live-now-card--skeleton"
              >
                <div className="fk-live-now-card__avatar-skeleton" />

                <div className="fk-live-now-card__skeleton-line" />

                <div className="fk-live-now-card__skeleton-line fk-live-now-card__skeleton-line--small" />
              </div>
            ),
          )}
        </div>
      )}

      {/* =====================================================================
          ERROR
      ===================================================================== */}

      {!loading &&
        streams.length === 0 &&
        error && (
          <div className="fk-live-now-rail__error">
            Unable to load live streams.
          </div>
        )}

      {/* =====================================================================
          LIVE STREAMS
      ===================================================================== */}

      {streams.length > 0 && (
        <div
          className="fk-live-now-rail__scroller"
          role="list"
        >
          {streams.map(
            (stream) => {
              const name =
                getDisplayName(
                  stream,
                );

              const username =
                getUsername(
                  stream,
                );

              const avatar =
                getAvatar(
                  stream,
                );

              const viewers =
                getViewers(
                  stream,
                );

              return (
                <button
                  key={getStreamId(
                    stream,
                  )}
                  type="button"
                  className="fk-live-now-card"
                  onClick={() =>
                    openStream(
                      stream,
                    )
                  }
                  role="listitem"
                  aria-label={`Watch ${name} live`}
                >
                  {/* ==========================================================
                      THUMBNAIL
                  ========================================================== */}

                  <div className="fk-live-now-card__media">
                    {stream.thumbnailUrl ? (
                      <img
                        src={
                          stream.thumbnailUrl
                        }
                        alt=""
                        className="fk-live-now-card__thumbnail"
                      />
                    ) : avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="fk-live-now-card__thumbnail fk-live-now-card__thumbnail--avatar"
                      />
                    ) : (
                      <div className="fk-live-now-card__placeholder">
                        <span>
                          {name
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </span>
                      </div>
                    )}

                    {/* ========================================================
                        LIVE BADGE
                    ======================================================== */}

                    <span className="fk-live-now-card__live-badge">
                      <span className="fk-live-now-card__live-dot" />

                      LIVE
                    </span>

                    {/* ========================================================
                        VIEWERS
                    ======================================================== */}

                    <span className="fk-live-now-card__viewers">
                      <Eye
                        size={12}
                      />

                      {formatCount(
                        viewers,
                      )}
                    </span>
                  </div>

                  {/* ==========================================================
                      CREATOR
                  ========================================================== */}

                  <div className="fk-live-now-card__creator">
                    <div className="fk-live-now-card__avatar">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt=""
                        />
                      ) : (
                        <span>
                          {name
                            .charAt(
                              0,
                            )
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="fk-live-now-card__identity">
                      <strong>
                        {name}
                      </strong>

                      {username && (
                        <span>
                          @{username}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ==========================================================
                      TITLE
                  ========================================================== */}

                  <p className="fk-live-now-card__title">
                    {stream.title ||
                      "Live on Fockis"}
                  </p>

                  {/* ==========================================================
                      WATCH
                  ========================================================== */}

                  <div className="fk-live-now-card__watch">
                    <Radio
                      size={13}
                    />

                    Watch live

                    <Users
                      size={12}
                    />

                    {formatCount(
                      viewers,
                    )}
                  </div>
                </button>
              );
            },
          )}
        </div>
      )}
    </section>
  );
}