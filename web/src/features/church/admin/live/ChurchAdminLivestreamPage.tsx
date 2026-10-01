import { FOCKIS_API_URL } from "../../../../config/fockisConfig";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/ChurchAdminLivestreamPage.scss";

import type {
  LiveEventState,
  LiveEventVisibility,
} from "../../types/church.types";

const LOGO = "/Fockis-Logo/fockis2.png";

/* ============================================================================
 * TYPES
 * ========================================================================== */

type StreamStatus = "live" | "scheduled" | "ended";

/**
 * Church livestream.
 *
 * Church livestreams use the existing Fockis Meetings system.
 * meetingId is therefore required for a valid livestream.
 */
interface ChurchLivestream {
  id: string;
  meetingId: string;

  title: string;
  description?: string | null;

  state: LiveEventState;

  visibility: LiveEventVisibility;

  scheduledStart: string;
  actualStart?: string | null;
  endedAt?: string | null;

  service?: string | null;
  campus?: string | null;
  speaker?: string | null;

  chatEnabled: boolean;
  prayerRequestsEnabled: boolean;

  duration?: string | null;

  viewerCount?: number;
  viewers?: number;

  published?: boolean;
}

interface LivestreamListResponse {
  items?: ChurchLivestream[];
  total?: number;
}

/* ============================================================================
 * API
 * ========================================================================== */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  FOCKIS_API_URL;

function getAccessToken(): string | null {
  return (
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}

async function churchApi<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();

      if (body?.message) {
        if (Array.isArray(body.message)) {
          message = body.message.join(", ");
        } else if (typeof body.message === "string") {
          message = body.message;
        }
      }
    } catch {
      // Ignore invalid JSON error bodies.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/* ============================================================================
 * API ENDPOINTS
 * ========================================================================== */

const LIVESTREAM_ENDPOINT = "/church/livestreams";

/* ============================================================================
 * HELPERS
 * ========================================================================== */

function normalizeStatus(
  state: LiveEventState,
): StreamStatus {
  switch (state) {
    case "live":
      return "live";

    case "ended":
      return "ended";

    case "scheduled":
    default:
      return "scheduled";
  }
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(
  value?: string | null,
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatViewers(
  value?: number,
): string {
  return (value ?? 0).toLocaleString();
}

/* ============================================================================
 * COMPONENT
 * ========================================================================== */

export default function ChurchAdminLivestreamPage() {
  const navigate = useNavigate();

  /* --------------------------------------------------------------------------
   * DATA
   * ------------------------------------------------------------------------ */

  const [streams, setStreams] =
    useState<ChurchLivestream[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* --------------------------------------------------------------------------
   * UI STATE
   * ------------------------------------------------------------------------ */

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState<ChurchLivestream | null>(null);

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<"all" | StreamStatus>("all");

  /* --------------------------------------------------------------------------
   * FORM
   * ------------------------------------------------------------------------ */

  const emptyForm = {
    title: "",
    service: "11:00 AM Sunday Service",
    campus: "Downtown Campus",
    speaker: "Pastor Daniel Reyes",
    date: "",
    time: "11:00",
    description: "",
    visibility:
      "public" as LiveEventVisibility,
    chatEnabled: true,
    prayerRequestsEnabled: true,
    publish: true,
  };

  const [form, setForm] =
    useState(emptyForm);

  /* ==========================================================================
   * LOAD LIVESTREAMS
   * ======================================================================== */

  const loadStreams =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const response =
          await churchApi<
            ChurchLivestream[] |
            LivestreamListResponse
          >(LIVESTREAM_ENDPOINT);

        const items =
          Array.isArray(response)
            ? response
            : response?.items ?? [];

        setStreams(items);
      } catch (err) {
        console.error(
          "Failed to load Church livestreams:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load livestreams.",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadStreams();
  }, [loadStreams]);

  /* ==========================================================================
   * CURRENT LIVE STREAM
   * ======================================================================== */

  const liveStream = useMemo(
    () =>
      streams.find(
        (stream) =>
          normalizeStatus(stream.state) ===
          "live",
      ),
    [streams],
  );

  /* ==========================================================================
   * FILTERED STREAMS
   * ======================================================================== */

  const filteredStreams = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return streams.filter((stream) => {
      const status =
        normalizeStatus(stream.state);

      const matchesFilter =
        filter === "all" ||
        status === filter;

      if (!normalizedSearch) {
        return matchesFilter;
      }

      const searchText = [
        stream.title,
        stream.description,
        stream.campus,
        stream.speaker,
        stream.service,
        stream.visibility,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        matchesFilter &&
        searchText.includes(
          normalizedSearch,
        )
      );
    });
  }, [streams, search, filter]);

  /* ==========================================================================
   * COUNTS
   * ======================================================================== */

  const scheduledCount =
    streams.filter(
      (stream) =>
        normalizeStatus(stream.state) ===
        "scheduled",
    ).length;

  const endedCount =
    streams.filter(
      (stream) =>
        normalizeStatus(stream.state) ===
        "ended",
    ).length;

  /* ==========================================================================
   * MEETING ROUTING
   * ======================================================================== */

  const openMeetingStudio = useCallback(
    (stream: ChurchLivestream) => {
      if (!stream.meetingId) {
        setError(
          "This livestream is not connected to a Fockis Meeting.",
        );
        return;
      }

      navigate(
        `/meetings/${encodeURIComponent(
          stream.meetingId,
        )}/room`,
      );
    },
    [navigate],
  );

  const openMeetingDetails = useCallback(
    (stream: ChurchLivestream) => {
      if (!stream.meetingId) {
        setError(
          "This livestream is not connected to a Fockis Meeting.",
        );
        return;
      }

      navigate(
        `/meetings/${encodeURIComponent(
          stream.meetingId,
        )}`,
      );
    },
    [navigate],
  );

  /* ==========================================================================
   * CREATE MODAL
   * ======================================================================== */

  const openCreateModal = () => {
    setForm({
      ...emptyForm,
    });

    setError(null);
    setShowCreateModal(true);
  };

  /* ==========================================================================
   * CREATE LIVESTREAM
   * ======================================================================== */

  const handleCreateLivestream = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      if (!form.date) {
        throw new Error(
          "Please select a livestream date.",
        );
      }

      const scheduledStart =
        new Date(
          `${form.date}T${
            form.time || "11:00"
          }:00`,
        );

      if (
        Number.isNaN(
          scheduledStart.getTime(),
        )
      ) {
        throw new Error(
          "Invalid livestream date or time.",
        );
      }

      const payload = {
        title:
          form.title.trim() ||
          "Sunday Worship Service",

        description:
          form.description.trim() ||
          "Join us online for worship, teaching, prayer, and community.",

        visibility:
          form.visibility,

        scheduledStart:
          scheduledStart.toISOString(),

        service:
          form.service,

        campus:
          form.campus,

        speaker:
          form.speaker.trim(),

        chatEnabled:
          form.chatEnabled,

        prayerRequestsEnabled:
          form.prayerRequestsEnabled,

        published:
          form.publish,
      };

      const created =
        await churchApi<ChurchLivestream>(
          LIVESTREAM_ENDPOINT,
          {
            method: "POST",
            body: JSON.stringify(payload),
          },
        );

      setStreams((current) => [
        created,
        ...current,
      ]);

      setShowCreateModal(false);

      setForm({
        ...emptyForm,
      });
    } catch (err) {
      console.error(
        "Failed to schedule livestream:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule livestream.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================================
   * START LIVESTREAM
   * ======================================================================== */

  const startLivestream = async (
    stream: ChurchLivestream,
  ) => {
    if (!stream.meetingId) {
      setError(
        "This livestream does not have a connected Fockis Meeting.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated =
        await churchApi<ChurchLivestream>(
          `${LIVESTREAM_ENDPOINT}/${encodeURIComponent(
            stream.id,
          )}/start`,
          {
            method: "POST",
            body: JSON.stringify({
              meetingId:
                stream.meetingId,
            }),
          },
        );

      setStreams((current) =>
        current.map((item) =>
          item.id === stream.id
            ? updated
            : item,
        ),
      );

      openMeetingStudio(updated);
    } catch (err) {
      console.error(
        "Failed to start livestream:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to start livestream.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================================
   * END LIVESTREAM
   * ======================================================================== */

  const endLivestream = async (
    stream: ChurchLivestream,
  ) => {
    setSaving(true);
    setError(null);

    try {
      const updated =
        await churchApi<ChurchLivestream>(
          `${LIVESTREAM_ENDPOINT}/${encodeURIComponent(
            stream.id,
          )}/end`,
          {
            method: "POST",
            body: JSON.stringify({
              meetingId:
                stream.meetingId,
            }),
          },
        );

      setStreams((current) =>
        current.map((item) =>
          item.id === stream.id
            ? updated
            : item,
        ),
      );
    } catch (err) {
      console.error(
        "Failed to end livestream:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to end livestream.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================================
   * DELETE LIVESTREAM
   * ======================================================================== */

  const deleteLivestream = async () => {
    const stream =
      showDeleteModal;

    if (!stream) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await churchApi<void>(
        `${LIVESTREAM_ENDPOINT}/${encodeURIComponent(
          stream.id,
        )}`,
        {
          method: "DELETE",
        },
      );

      setStreams((current) =>
        current.filter(
          (item) =>
            item.id !== stream.id,
        ),
      );

      setShowDeleteModal(null);
    } catch (err) {
      console.error(
        "Failed to delete livestream:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete livestream.",
      );
    } finally {
      setSaving(false);
    }
  };

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <div className="church-admin-live">
      <aside className="church-admin-live__sidebar">
        <Link
          to="/church"
          className="church-admin-live__brand"
        >
          <img
            src={LOGO}
            alt="Fockis Church"
          />

          <div>
            <strong>Fockis</strong>
            <span>Church Admin</span>
          </div>
        </Link>

        <div className="church-admin-live__org">
          <span>Organization</span>
          <strong>Fockis Church</strong>
        </div>

        <nav className="church-admin-live__nav">
          <Link to="/church/admin">
            <span>⌂</span>
            Dashboard
          </Link>

          <Link to="/church/admin/members">
            <span>♙</span>
            Members
          </Link>

          <Link to="/church/admin/departments">
            <span>◫</span>
            Departments
          </Link>

          <Link to="/church/admin/groups">
            <span>◌</span>
            Groups
          </Link>

          <Link to="/church/admin/events">
            <span>▣</span>
            Events
          </Link>

          <Link to="/church/admin/attendance">
            <span>✓</span>
            Attendance
          </Link>

          <Link to="/church/admin/sermons">
            <span>▶</span>
            Sermons
          </Link>

          <Link to="/church/admin/media">
            <span>▤</span>
            Media
          </Link>

          <Link
            to="/church/admin/live"
            className="is-active"
          >
            <span>●</span>
            Livestream
          </Link>

          <Link to="/church/admin/giving">
            <span>$</span>
            Giving
          </Link>

          <Link to="/church/admin/reports">
            <span>▥</span>
            Reports
          </Link>
        </nav>

        <div className="church-admin-live__sidebar-bottom">
          <Link to="/church/admin/settings">
            <span>⚙</span>
            Settings
          </Link>

          <Link to="/church">
            <span>↗</span>
            View Church
          </Link>
        </div>
      </aside>

      <div className="church-admin-live__main">
        <header className="church-admin-live__topbar">
          <div>
            <span>
              Church Administration
            </span>

            <h1>Livestream</h1>
          </div>

          <div className="church-admin-live__top-actions">
            <Link to="/church/live">
              View Public Livestream
            </Link>

            <button
              type="button"
              onClick={openCreateModal}
              disabled={saving}
            >
              + Schedule Livestream
            </button>
          </div>
        </header>

        <main className="church-admin-live__content">
          {error && (
            <div
              role="alert"
              className="church-admin-live__error"
            >
              <strong>
                Livestream error
              </strong>

              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  setError(null)
                }
              >
                ×
              </button>
            </div>
          )}

          {loading ? (
            <section className="church-admin-live__loading">
              <div>
                Loading livestreams...
              </div>
            </section>
          ) : (
            <>
              <section className="church-admin-live__stats">
                <div className="church-admin-live__stat">
                  <div className="stat-icon stat-icon--live">
                    ●
                  </div>

                  <div>
                    <span>
                      Currently Live
                    </span>

                    <strong>
                      {liveStream ? 1 : 0}
                    </strong>
                  </div>
                </div>

                <div className="church-admin-live__stat">
                  <div className="stat-icon">
                    ◷
                  </div>

                  <div>
                    <span>Scheduled</span>

                    <strong>
                      {scheduledCount}
                    </strong>
                  </div>
                </div>

                <div className="church-admin-live__stat">
                  <div className="stat-icon">
                    ◉
                  </div>

                  <div>
                    <span>
                      Current Viewers
                    </span>

                    <strong>
                      {formatViewers(
                        liveStream?.viewerCount,
                      )}
                    </strong>
                  </div>
                </div>

                <div className="church-admin-live__stat">
                  <div className="stat-icon">
                    ▤
                  </div>

                  <div>
                    <span>
                      Previous Streams
                    </span>

                    <strong>
                      {endedCount}
                    </strong>
                  </div>
                </div>
              </section>

              {liveStream && (
                <section className="church-admin-live__live-card">
                  <div className="live-card__header">
                    <div>
                      <span className="live-card__label">
                        <i />
                        Live Now
                      </span>

                      <span className="live-card__viewers">
                        {formatViewers(
                          liveStream.viewerCount,
                        )}{" "}
                        watching
                      </span>
                    </div>

                    <span className="live-card__service">
                      {liveStream.service ||
                        "Church Service"}
                    </span>
                  </div>

                  <div className="live-card__body">
                    <div className="live-card__visual">
                      <div className="live-card__visual-content">
                        <span>
                          FOCKIS CHURCH
                        </span>

                        <strong>LIVE</strong>

                        <button
                          type="button"
                          onClick={() =>
                            openMeetingStudio(
                              liveStream,
                            )
                          }
                          disabled={saving}
                        >
                          Open Live Studio
                        </button>
                      </div>
                    </div>

                    <div className="live-card__details">
                      <span className="live-card__campus">
                        {liveStream.campus ||
                          "Main Campus"}{" "}
                        ·{" "}
                        {formatTime(
                          liveStream.actualStart ||
                            liveStream.scheduledStart,
                        )}
                      </span>

                      <h2>
                        {liveStream.title}
                      </h2>

                      <p>
                        {liveStream.description ||
                          "Live church service."}
                      </p>

                      <div className="live-card__speaker">
                        <div>
                          {(
                            liveStream.speaker ||
                            "DR"
                          )
                            .split(" ")
                            .map(
                              (part) =>
                                part[0],
                            )
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <span>
                          <small>
                            Speaker
                          </small>

                          <strong>
                            {liveStream.speaker ||
                              "Church Speaker"}
                          </strong>
                        </span>
                      </div>

                      <div className="live-card__controls">
                        <button
                          type="button"
                          className="primary"
                          onClick={() =>
                            openMeetingStudio(
                              liveStream,
                            )
                          }
                          disabled={saving}
                        >
                          Open Live Studio
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() =>
                            void endLivestream(
                              liveStream,
                            )
                          }
                          disabled={saving}
                        >
                          End Livestream
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <section className="church-admin-live__streams">
                <div className="streams-heading">
                  <div>
                    <span>
                      Broadcast Management
                    </span>

                    <h2>Livestreams</h2>
                  </div>
                </div>

                <div className="streams-toolbar">
                  <div className="streams-search">
                    <span>⌕</span>

                    <input
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                      placeholder="Search livestreams..."
                    />
                  </div>

                  <div className="streams-filters">
                    {(
                      [
                        "all",
                        "scheduled",
                        "live",
                        "ended",
                      ] as const
                    ).map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={
                          filter === item
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          setFilter(item)
                        }
                      >
                        {item === "all"
                          ? "All"
                          : item ===
                              "scheduled"
                            ? "Upcoming"
                            : item ===
                                "live"
                              ? "Live"
                              : "Previous"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="streams-table">
                  <div className="streams-table__head">
                    <span>
                      Livestream
                    </span>

                    <span>Campus</span>

                    <span>
                      Date &amp; Time
                    </span>

                    <span>Status</span>

                    <span>Actions</span>
                  </div>

                  {filteredStreams.length ===
                    0 && (
                    <div className="streams-empty">
                      <div>●</div>

                      <h3>
                        No livestreams found
                      </h3>

                      <p>
                        {search
                          ? "Try changing your search."
                          : "Schedule your first Church livestream."}
                      </p>

                      <button
                        type="button"
                        onClick={
                          openCreateModal
                        }
                      >
                        Schedule Livestream
                      </button>
                    </div>
                  )}

                  {filteredStreams.map(
                    (stream) => {
                      const status =
                        normalizeStatus(
                          stream.state,
                        );

                      return (
                        <div
                          className="streams-table__row"
                          key={stream.id}
                        >
                          <div className="stream-title-cell">
                            <div className="stream-thumbnail">
                              {status ===
                              "live" ? (
                                <span>
                                  LIVE
                                </span>
                              ) : (
                                <span>
                                  ▶
                                </span>
                              )}
                            </div>

                            <div>
                              <strong>
                                {
                                  stream.title
                                }
                              </strong>

                              <span>
                                {stream.service ||
                                  "Church Service"}
                              </span>
                            </div>
                          </div>

                          <div className="stream-campus">
                            {stream.campus ||
                              "—"}
                          </div>

                          <div className="stream-date">
                            <strong>
                              {formatDate(
                                stream.scheduledStart,
                              )}
                            </strong>

                            <span>
                              {formatTime(
                                stream.scheduledStart,
                              )}
                            </span>
                          </div>

                          <div>
                            <span
                              className={`status status--${status}`}
                            >
                              {status ===
                                "live" &&
                                "Live"}

                              {status ===
                                "scheduled" &&
                                "Scheduled"}

                              {status ===
                                "ended" &&
                                "Ended"}
                            </span>
                          </div>

                          <div className="stream-actions">
                            {status ===
                              "live" && (
                              <button
                                type="button"
                                onClick={() =>
                                  openMeetingStudio(
                                    stream,
                                  )
                                }
                                disabled={
                                  saving
                                }
                              >
                                Studio
                              </button>
                            )}

                            {status ===
                              "scheduled" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void startLivestream(
                                      stream,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                >
                                  Start
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openMeetingDetails(
                                      stream,
                                    )
                                  }
                                  disabled={
                                    saving
                                  }
                                >
                                  Edit
                                </button>
                              </>
                            )}

                            {status ===
                              "ended" && (
                              <button
                                type="button"
                                onClick={() =>
                                  openMeetingDetails(
                                    stream,
                                  )
                                }
                              >
                                Replay
                              </button>
                            )}

                            <button
                              type="button"
                              className="delete-action"
                              onClick={() =>
                                setShowDeleteModal(
                                  stream,
                                )
                              }
                              disabled={
                                saving ||
                                status ===
                                  "live"
                              }
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {showCreateModal && (
        <div
          className="church-admin-live__modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowCreateModal(false);
            }
          }}
        >
          <div
            className="church-admin-live__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-livestream-title"
          >
            <div className="modal-header">
              <div>
                <span>
                  Broadcast Management
                </span>

                <h2 id="create-livestream-title">
                  Schedule Livestream
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowCreateModal(false)
                }
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                handleCreateLivestream
              }
            >
              <div className="modal-body">
                <div className="form-section">
                  <span className="form-section__title">
                    Service Information
                  </span>

                  <label>
                    Livestream Title

                    <input
                      required
                      value={form.title}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          title:
                            event.target.value,
                        })
                      }
                      placeholder="Example: The Long Way Home — Week 4"
                    />
                  </label>

                  <div className="form-grid">
                    <label>
                      Service

                      <select
                        value={
                          form.service
                        }
                        onChange={(event) =>
                          setForm({
                            ...form,
                            service:
                              event.target.value,
                          })
                        }
                      >
                        <option>
                          11:00 AM Sunday Service
                        </option>

                        <option>
                          9:00 AM Sunday Service
                        </option>

                        <option>
                          Wednesday Bible Study
                        </option>

                        <option>
                          Special Service
                        </option>
                      </select>
                    </label>

                    <label>
                      Campus

                      <select
                        value={
                          form.campus
                        }
                        onChange={(event) =>
                          setForm({
                            ...form,
                            campus:
                              event.target.value,
                          })
                        }
                      >
                        <option>
                          Downtown Campus
                        </option>

                        <option>
                          North Campus
                        </option>

                        <option>
                          South Campus
                        </option>

                        <option>
                          Online
                        </option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Speaker

                    <input
                      value={
                        form.speaker
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          speaker:
                            event.target.value,
                        })
                      }
                    />
                  </label>

                  <label>
                    Description

                    <textarea
                      rows={4}
                      value={
                        form.description
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          description:
                            event.target.value,
                        })
                      }
                      placeholder="Describe this livestream..."
                    />
                  </label>
                </div>

                <div className="form-section">
                  <span className="form-section__title">
                    Schedule
                  </span>

                  <div className="form-grid">
                    <label>
                      Date

                      <input
                        type="date"
                        required
                        value={form.date}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            date:
                              event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Start Time

                      <input
                        type="time"
                        value={form.time}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            time:
                              event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <label>
                    Visibility

                    <select
                      value={
                        form.visibility
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          visibility:
                            event.target
                              .value as LiveEventVisibility,
                        })
                      }
                    >
                      <option value="public">
                        Public
                      </option>

                      <option value="members">
                        Church Members
                      </option>

                      <option value="private">
                        Private / Invited
                      </option>
                    </select>
                  </label>
                </div>

                <div className="form-section">
                  <span className="form-section__title">
                    Audience Experience
                  </span>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={
                        form.chatEnabled
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          chatEnabled:
                            event.target
                              .checked,
                        })
                      }
                    />

                    <span>
                      <strong>
                        Enable Live Chat
                      </strong>

                      <small>
                        Allow viewers to communicate during the service.
                      </small>
                    </span>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={
                        form.prayerRequestsEnabled
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          prayerRequestsEnabled:
                            event.target
                              .checked,
                        })
                      }
                    />

                    <span>
                      <strong>
                        Allow Prayer Requests
                      </strong>

                      <small>
                        Let viewers privately submit prayer requests.
                      </small>
                    </span>
                  </label>

                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={
                        form.publish
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          publish:
                            event.target
                              .checked,
                        })
                      }
                    />

                    <span>
                      <strong>
                        Publish to Church Livestream
                      </strong>

                      <small>
                        Display this service on the public Church livestream page.
                      </small>
                    </span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() =>
                    setShowCreateModal(
                      false,
                    )
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="create-button"
                  disabled={saving}
                >
                  {saving
                    ? "Scheduling..."
                    : "Schedule Livestream"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="church-admin-live__modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowDeleteModal(null);
            }
          }}
        >
          <div className="church-admin-live__confirm">
            <div className="confirm-icon">
              !
            </div>

            <h2>
              Delete livestream?
            </h2>

            <p>
              Are you sure you want to
              delete{" "}
              <strong>
                {showDeleteModal.title}
              </strong>
              ? This action cannot be
              undone.
            </p>

            <div>
              <button
                type="button"
                onClick={() =>
                  setShowDeleteModal(null)
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="delete-confirm"
                onClick={() =>
                  void deleteLivestream()
                }
                disabled={saving}
              >
                {saving
                  ? "Deleting..."
                  : "Delete Livestream"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}