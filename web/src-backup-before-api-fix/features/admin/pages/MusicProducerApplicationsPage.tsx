import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import producerApi, {
  ProducerProfile,
  ProducerStatus,
} from "../../music/services/producerApi";

import "../styles/MusicProducerApplications.scss";

type StatusFilter = "all" | ProducerStatus;

const STATUS_FILTERS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "approved",
    label: "Approved",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
  {
    value: "suspended",
    label: "Suspended",
  },
  {
    value: "all",
    label: "All",
  },
];

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRevenue(cents?: number): string {
  const amount = Number(cents || 0) / 100;

  return amount.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

function statusLabel(status: ProducerStatus): string {
  switch (status) {
    case "pending":
      return "Pending";

    case "approved":
      return "Approved";

    case "rejected":
      return "Rejected";

    case "suspended":
      return "Suspended";

    default:
      return status;
  }
}

function getInitials(name?: string): string {
  if (!name?.trim()) {
    return "C";
  }

  return name.trim().charAt(0).toUpperCase();
}

function normalizeUrl(value?: string): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function MusicProducerApplicationsPage() {
  const [applications, setApplications] = useState<
    ProducerProfile[]
  >([]);

  const [selected, setSelected] =
    useState<ProducerProfile | null>(null);

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("pending");

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [rejectNote, setRejectNote] =
    useState("");

  const [suspendNote, setSuspendNote] =
    useState("");

  /* ==========================================================
     AUTO APPROVAL SETTING
  ========================================================== */

  const [
    autoApprovalEnabled,
    setAutoApprovalEnabled,
  ] = useState(false);

  const [
    autoApprovalLoading,
    setAutoApprovalLoading,
  ] = useState(true);

  const [
    autoApprovalSaving,
    setAutoApprovalSaving,
  ] = useState(false);

  /* ==========================================================
     LOAD APPLICATIONS
  ========================================================== */

  const loadApplications = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const result =
          await producerApi.adminListApplications(
            statusFilter === "all"
              ? undefined
              : statusFilter,
          );

        const list = Array.isArray(result)
          ? result
          : [];

        setApplications(list);

        setSelected((currentSelected) => {
          if (!currentSelected) {
            return null;
          }

          const refreshed = list.find(
            (item) =>
              item.id === currentSelected.id,
          );

          return refreshed ?? currentSelected;
        });
      } catch (err: any) {
        console.error(
          "Failed to load producer applications:",
          err,
        );

        setError(
          err?.message ||
            "Unable to load producer applications.",
        );
      } finally {
        setLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  /* ==========================================================
     LOAD AUTO APPROVAL SETTING
  ========================================================== */

  const loadAutoApprovalSetting =
    useCallback(async () => {
      setAutoApprovalLoading(true);

      try {
        const setting =
          await producerApi.adminGetAutoApproval();

        setAutoApprovalEnabled(
          Boolean(setting?.enabled),
        );
      } catch (err: any) {
        console.error(
          "Failed to load creator auto-approval setting:",
          err,
        );

        setError(
          err?.message ||
            "Unable to load the creator auto-approval setting.",
        );
      } finally {
        setAutoApprovalLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadAutoApprovalSetting();
  }, [loadAutoApprovalSetting]);

  /* ==========================================================
     TOGGLE AUTO APPROVAL
  ========================================================== */

  async function handleAutoApprovalToggle() {
    if (
      autoApprovalLoading ||
      autoApprovalSaving
    ) {
      return;
    }

    const nextValue =
      !autoApprovalEnabled;

    const previousValue =
      autoApprovalEnabled;

    setAutoApprovalEnabled(nextValue);
    setAutoApprovalSaving(true);
    setError("");
    setSuccess("");

    try {
      const setting =
        await producerApi.adminSetAutoApproval(
          nextValue,
        );

      setAutoApprovalEnabled(
        Boolean(setting?.enabled),
      );

      setSuccess(
        setting?.enabled
          ? "Automatic creator approval is now ON. New creator applications will be approved automatically."
          : "Automatic creator approval is now OFF. New creator applications will require manager approval.",
      );
    } catch (err: any) {
      console.error(
        "Failed to update creator auto-approval setting:",
        err,
      );

      setAutoApprovalEnabled(
        previousValue,
      );

      setError(
        err?.message ||
          "Unable to update the creator auto-approval setting.",
      );
    } finally {
      setAutoApprovalSaving(false);
    }
  }

  /* ==========================================================
     COUNTS
  ========================================================== */

  const counts = useMemo(() => {
    return {
      total: applications.length,

      pending: applications.filter(
        (item) =>
          item.status === "pending",
      ).length,

      approved: applications.filter(
        (item) =>
          item.status === "approved",
      ).length,

      rejected: applications.filter(
        (item) =>
          item.status === "rejected",
      ).length,

      suspended: applications.filter(
        (item) =>
          item.status === "suspended",
      ).length,
    };
  }, [applications]);

  /* ==========================================================
     SELECT
  ========================================================== */

  function openApplication(
    application: ProducerProfile,
  ) {
    setSelected(application);

    setRejectNote(
      application.status === "rejected"
        ? application.adminNote || ""
        : "",
    );

    setSuspendNote(
      application.status === "suspended"
        ? application.adminNote || ""
        : "",
    );

    setSuccess("");
    setError("");
  }

  /* ==========================================================
     CLOSE
  ========================================================== */

  function closeApplication() {
    if (actionLoading) {
      return;
    }

    setSelected(null);
    setRejectNote("");
    setSuspendNote("");
    setError("");
    setSuccess("");
  }

  /* ==========================================================
     UPDATE LOCAL APPLICATION
  ========================================================== */

  function updateLocalApplication(
    updated: ProducerProfile,
  ) {
    setApplications((current) =>
      current.map((item) =>
        item.id === updated.id
          ? updated
          : item,
      ),
    );

    setSelected(updated);
  }

  /* ==========================================================
     APPROVE
  ========================================================== */

  async function handleApprove() {
    if (!selected) {
      return;
    }

    const confirmed = window.confirm(
      `Approve ${selected.producerName} as a Fockis creator?`,
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await producerApi.adminApprove(
          selected.id,
        );

      updateLocalApplication(updated);

      setSuccess(
        `${updated.producerName} has been approved as a creator.`,
      );
    } catch (err: any) {
      console.error(
        "Failed to approve producer:",
        err,
      );

      setError(
        err?.message ||
          "Unable to approve this producer.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* ==========================================================
     REJECT
  ========================================================== */

  async function handleReject() {
    if (!selected) {
      return;
    }

    const note =
      rejectNote.trim();

    if (!note) {
      setError(
        "Please provide a reason for rejecting this application.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Reject ${selected.producerName}'s creator application?`,
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await producerApi.adminReject(
          selected.id,
          note,
        );

      updateLocalApplication(updated);

      setSuccess(
        `${updated.producerName}'s application was rejected.`,
      );
    } catch (err: any) {
      console.error(
        "Failed to reject producer:",
        err,
      );

      setError(
        err?.message ||
          "Unable to reject this producer.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* ==========================================================
     SUSPEND
  ========================================================== */

  async function handleSuspend() {
    if (!selected) {
      return;
    }

    const note =
      suspendNote.trim();

    if (!note) {
      setError(
        "Please provide a reason for suspending this creator.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Suspend ${selected.producerName}'s creator account?`,
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await producerApi.adminSuspend(
          selected.id,
          note,
        );

      updateLocalApplication(updated);

      setSuccess(
        `${updated.producerName}'s creator account has been suspended.`,
      );
    } catch (err: any) {
      console.error(
        "Failed to suspend producer:",
        err,
      );

      setError(
        err?.message ||
          "Unable to suspend this producer.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* ==========================================================
     RESTORE
  ========================================================== */

  async function handleRestore() {
    if (!selected) {
      return;
    }

    const confirmed = window.confirm(
      `Restore ${selected.producerName}'s creator account?`,
    );

    if (!confirmed) {
      return;
    }

    setActionLoading(true);
    setError("");
    setSuccess("");

    try {
      const updated =
        await producerApi.adminRestore(
          selected.id,
        );

      updateLocalApplication(updated);

      setSuccess(
        `${updated.producerName}'s creator account has been restored.`,
      );
    } catch (err: any) {
      console.error(
        "Failed to restore producer:",
        err,
      );

      setError(
        err?.message ||
          "Unable to restore this producer.",
      );
    } finally {
      setActionLoading(false);
    }
  }

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    setSuccess("");

    await Promise.all([
      loadApplications(),
      loadAutoApprovalSetting(),
    ]);
  }

  /* ==========================================================
     STATUS CHANGE
  ========================================================== */

  function handleStatusChange(
    value: StatusFilter,
  ) {
    if (actionLoading) {
      return;
    }

    setSelected(null);
    setSuccess("");
    setError("");
    setStatusFilter(value);
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="music-producer-admin">
      <div className="music-producer-admin__shell">

        {/* ======================================================
            HEADER
        ====================================================== */}

        <header className="music-producer-admin__header">
          <div>
            <span className="music-producer-admin__eyebrow">
              FOCKIS MUSIC
            </span>

            <h1>
              Creator Applications
            </h1>

            <p>
              Review and manage users who want
              to become music creators and
              producers on Fockis.
            </p>
          </div>

          <button
            type="button"
            className="music-producer-admin__refresh"
            onClick={() =>
              void handleRefresh()
            }
            disabled={
              loading ||
              actionLoading ||
              autoApprovalSaving
            }
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>
        </header>

        {/* ======================================================
            AUTO APPROVAL SETTINGS
        ====================================================== */}

        <section className="music-producer-admin__auto-approval">
          <div className="music-producer-admin__auto-approval-content">
            <div className="music-producer-admin__auto-approval-icon">
              ⚡
            </div>

            <div className="music-producer-admin__auto-approval-copy">
              <div className="music-producer-admin__auto-approval-heading">
                <span>
                  CREATOR APPLICATION SETTINGS
                </span>

                <span
                  className={`music-producer-admin__auto-approval-status ${
                    autoApprovalEnabled
                      ? "music-producer-admin__auto-approval-status--on"
                      : "music-producer-admin__auto-approval-status--off"
                  }`}
                >
                  {autoApprovalLoading
                    ? "Loading..."
                    : autoApprovalEnabled
                      ? "ON"
                      : "OFF"}
                </span>
              </div>

              <h2>
                Auto-approve new creator applications
              </h2>

              <p>
                {autoApprovalEnabled
                  ? "New creator applications are automatically approved when they are submitted. Existing applications are not changed."
                  : "New creator applications remain pending until a manager reviews them. Existing approved creators are not affected."}
              </p>

              <small>
                You can change this setting at any time.
                Turning it off will only affect future
                applications.
              </small>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={
                autoApprovalEnabled
              }
              aria-label={
                autoApprovalEnabled
                  ? "Turn off automatic creator approval"
                  : "Turn on automatic creator approval"
              }
              className={`music-producer-admin__auto-approval-toggle ${
                autoApprovalEnabled
                  ? "music-producer-admin__auto-approval-toggle--on"
                  : ""
              }`}
              onClick={() =>
                void handleAutoApprovalToggle()
              }
              disabled={
                autoApprovalLoading ||
                autoApprovalSaving ||
                actionLoading
              }
            >
              <span className="music-producer-admin__auto-approval-toggle-track">
                <span className="music-producer-admin__auto-approval-toggle-thumb" />
              </span>

              <span className="music-producer-admin__auto-approval-toggle-label">
                {autoApprovalSaving
                  ? "Saving..."
                  : autoApprovalEnabled
                    ? "Enabled"
                    : "Disabled"}
              </span>
            </button>
          </div>
        </section>

        {/* ======================================================
            ALERTS
        ====================================================== */}

        {error && (
          <div
            className="
              music-producer-admin__alert
              music-producer-admin__alert--error
            "
            role="alert"
          >
            <strong>
              Something went wrong
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}

        {success && (
          <div
            className="
              music-producer-admin__alert
              music-producer-admin__alert--success
            "
            role="status"
          >
            <strong>
              Action completed
            </strong>

            <span>
              {success}
            </span>
          </div>
        )}

        {/* ======================================================
            STATS
        ====================================================== */}

        <section className="music-producer-admin__stats">
          {STATUS_FILTERS
            .filter(
              (item) =>
                item.value !== "all",
            )
            .map((item) => {

              /*
               * IMPORTANT:
               *
               * StatusFilter is:
               * "all" | ProducerStatus
               *
               * counts does not contain an "all" key.
               *
               * The explicit check below narrows
               * item.value to ProducerStatus before
               * using it as a counts key.
               */
              const count =
                item.value === "all"
                  ? counts.total
                  : counts[item.value];

              return (
                <button
                  key={item.value}
                  type="button"
                  className={`
                    music-producer-admin__stat
                    ${
                      statusFilter ===
                      item.value
                        ? "music-producer-admin__stat--active"
                        : ""
                    }
                  `}
                  onClick={() =>
                    handleStatusChange(
                      item.value,
                    )
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <span>
                    {item.label}
                  </span>

                  <strong>
                    {count}
                  </strong>
                </button>
              );
            })}
        </section>

        {/* ======================================================
            CONTENT
        ====================================================== */}

        <section
          className={`music-producer-admin__content${
            selected
              ? " music-producer-admin__content--split"
              : ""
          }`}
        >

          {/* ====================================================
              APPLICATION LIST
          ==================================================== */}

          <div className="music-producer-admin__list">

            <div className="music-producer-admin__list-header">
              <div>
                <span>
                  APPLICATION QUEUE
                </span>

                <h2>
                  {statusFilter === "all"
                    ? "All Creators"
                    : `${statusLabel(
                        statusFilter,
                      )} Applications`}
                </h2>

                {!loading && (
                  <small>
                    {applications.length}{" "}
                    {applications.length === 1
                      ? "creator"
                      : "creators"}
                  </small>
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  handleStatusChange(
                    event.target
                      .value as StatusFilter,
                  )
                }
                disabled={
                  actionLoading
                }
                aria-label="Filter creator applications"
              >
                {STATUS_FILTERS.map(
                  (item) => (
                    <option
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </option>
                  ),
                )}
              </select>
            </div>

            {loading ? (
              <div className="music-producer-admin__empty">
                <div
                  className="
                    music-producer-admin__spinner
                  "
                />

                <p>
                  Loading creator applications...
                </p>
              </div>
            ) : applications.length === 0 ? (
              <div className="music-producer-admin__empty">
                <div className="music-producer-admin__empty-icon">
                  🎵
                </div>

                <h3>
                  No applications found
                </h3>

                <p>
                  There are currently no{" "}
                  {statusFilter === "all"
                    ? ""
                    : statusFilter}{" "}
                  creator applications.
                </p>
              </div>
            ) : (
              <div className="music-producer-admin__table-wrap">
                <table className="music-producer-admin__table">
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Genres</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Releases</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {applications.map(
                      (application) => (
                        <tr
                          key={
                            application.id
                          }
                        >
                          <td>
                            <button
                              type="button"
                              className="
                                music-producer-admin__creator
                              "
                              onClick={() =>
                                openApplication(
                                  application,
                                )
                              }
                              disabled={
                                actionLoading
                              }
                            >
                              {application.profileImage ? (
                                <img
                                  src={
                                    application.profileImage
                                  }
                                  alt=""
                                  loading="lazy"
                                />
                              ) : (
                                <span
                                  className="
                                    music-producer-admin__avatar
                                  "
                                >
                                  {getInitials(
                                    application.producerName,
                                  )}
                                </span>
                              )}

                              <span>
                                <strong>
                                  {
                                    application.producerName
                                  }
                                </strong>

                                <small>
                                  ID:{" "}
                                  {
                                    application.id
                                  }
                                </small>
                              </span>
                            </button>
                          </td>

                          <td>
                            <div className="music-producer-admin__genres">
                              {application.genres
                                ?.slice(0, 3)
                                .map(
                                  (
                                    genre,
                                  ) => (
                                    <span
                                      key={
                                        genre
                                      }
                                    >
                                      {
                                        genre
                                      }
                                    </span>
                                  ),
                                )}

                              {(application.genres
                                ?.length || 0) >
                                3 && (
                                <span>
                                  +
                                  {(
                                    application
                                      .genres
                                      ?.length ||
                                    0
                                  ) - 3}
                                </span>
                              )}

                              {(!application.genres ||
                                application.genres
                                  .length ===
                                  0) && (
                                <span>
                                  —
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <span
                              className={`
                                music-producer-admin__status
                                music-producer-admin__status--${application.status}
                              `}
                            >
                              {statusLabel(
                                application.status,
                              )}
                            </span>
                          </td>

                          <td>
                            {formatDate(
                              application.createdAt,
                            )}
                          </td>

                          <td>
                            {
                              application.releasesCount
                            }
                          </td>

                          <td>
                            <button
                              type="button"
                              className="
                                music-producer-admin__review-button
                              "
                              onClick={() =>
                                openApplication(
                                  application,
                                )
                              }
                              disabled={
                                actionLoading
                              }
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ====================================================
              DETAIL PANEL
          ==================================================== */}

          {selected && (
            <aside className="music-producer-admin__details">

              <div className="music-producer-admin__details-header">
                <div>
                  <span>
                    CREATOR PROFILE
                  </span>

                  <h2>
                    {selected.producerName}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={
                    closeApplication
                  }
                  aria-label="Close creator details"
                  disabled={
                    actionLoading
                  }
                >
                  ×
                </button>
              </div>

              <div className="music-producer-admin__profile">

                {selected.coverImage ? (
                  <div
                    className="
                      music-producer-admin__cover
                    "
                    style={{
                      backgroundImage: `url("${selected.coverImage}")`,
                    }}
                  />
                ) : (
                  <div
                    className="
                      music-producer-admin__cover
                      music-producer-admin__cover--empty
                    "
                  />
                )}

                <div className="music-producer-admin__profile-main">
                  {selected.profileImage ? (
                    <img
                      className="
                        music-producer-admin__profile-image
                      "
                      src={
                        selected.profileImage
                      }
                      alt={
                        selected.producerName
                      }
                    />
                  ) : (
                    <div
                      className="
                        music-producer-admin__profile-image
                        music-producer-admin__profile-image--placeholder
                      "
                    >
                      {getInitials(
                        selected.producerName,
                      )}
                    </div>
                  )}

                  <div>
                    <h3>
                      {
                        selected.producerName
                      }
                    </h3>

                    <span
                      className={`
                        music-producer-admin__status
                        music-producer-admin__status--${selected.status}
                      `}
                    >
                      {statusLabel(
                        selected.status,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="music-producer-admin__detail-section">
                <span>ABOUT</span>

                <p>
                  {selected.bio ||
                    "No biography provided."}
                </p>
              </div>

              <div className="music-producer-admin__detail-section">
                <span>GENRES</span>

                <div className="music-producer-admin__detail-tags">
                  {selected.genres &&
                  selected.genres.length >
                    0 ? (
                    selected.genres.map(
                      (genre) => (
                        <span
                          key={genre}
                        >
                          {genre}
                        </span>
                      ),
                    )
                  ) : (
                    <p>
                      No genres selected.
                    </p>
                  )}
                </div>
              </div>

              <div className="music-producer-admin__detail-section">
                <span>
                  SOCIAL & WEB
                </span>

                <div className="music-producer-admin__links">
                  {selected.website && (
                    <a
                      href={normalizeUrl(
                        selected.website,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🌐 Website
                    </a>
                  )}

                  {selected.instagram && (
                    <a
                      href={normalizeUrl(
                        selected.instagram,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📸 Instagram
                    </a>
                  )}

                  {selected.youtube && (
                    <a
                      href={normalizeUrl(
                        selected.youtube,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      ▶️ YouTube
                    </a>
                  )}

                  {selected.tiktok && (
                    <a
                      href={normalizeUrl(
                        selected.tiktok,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🎵 TikTok
                    </a>
                  )}

                  {selected.spotify && (
                    <a
                      href={normalizeUrl(
                        selected.spotify,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🎧 Spotify
                    </a>
                  )}

                  {!selected.website &&
                    !selected.instagram &&
                    !selected.youtube &&
                    !selected.tiktok &&
                    !selected.spotify && (
                      <p>
                        No social links
                        provided.
                      </p>
                    )}
                </div>
              </div>

              <div className="music-producer-admin__detail-section">
                <span>
                  ACCOUNT INFORMATION
                </span>

                <dl className="music-producer-admin__facts">
                  <div>
                    <dt>Producer ID</dt>
                    <dd>
                      {selected.id}
                    </dd>
                  </div>

                  <div>
                    <dt>User ID</dt>
                    <dd>
                      {selected.userId}
                    </dd>
                  </div>

                  <div>
                    <dt>Applied</dt>
                    <dd>
                      {formatDateTime(
                        selected.createdAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Last Updated</dt>
                    <dd>
                      {formatDateTime(
                        selected.updatedAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Reviewed</dt>
                    <dd>
                      {formatDateTime(
                        selected.reviewedAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt>Releases</dt>
                    <dd>
                      {
                        selected.releasesCount
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Plays</dt>
                    <dd>
                      {
                        selected.totalPlays
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Views</dt>
                    <dd>
                      {
                        selected.totalViews
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Sales</dt>
                    <dd>
                      {
                        selected.totalSales
                      }
                    </dd>
                  </div>

                  <div>
                    <dt>Revenue</dt>
                    <dd>
                      {formatRevenue(
                        selected.totalRevenueCents,
                      )}
                    </dd>
                  </div>
                </dl>
              </div>

              {selected.reviewedBy && (
                <div className="music-producer-admin__note">
                  <strong>
                    Reviewed By
                  </strong>

                  <p>
                    {
                      selected.reviewedBy
                    }
                  </p>
                </div>
              )}

              {selected.adminNote && (
                <div className="music-producer-admin__note">
                  <strong>
                    Admin Note
                  </strong>

                  <p>
                    {
                      selected.adminNote
                    }
                  </p>
                </div>
              )}

              <div className="music-producer-admin__actions">

                {selected.status ===
                  "pending" && (
                  <>
                    <button
                      type="button"
                      className="
                        music-producer-admin__action
                        music-producer-admin__action--approve
                      "
                      onClick={() =>
                        void handleApprove()
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Processing..."
                        : "✓ Approve Creator"}
                    </button>

                    <textarea
                      value={
                        rejectNote
                      }
                      onChange={(event) =>
                        setRejectNote(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Reason for rejection..."
                      rows={4}
                      disabled={
                        actionLoading
                      }
                      aria-label="Reason for rejection"
                    />

                    <button
                      type="button"
                      className="
                        music-producer-admin__action
                        music-producer-admin__action--reject
                      "
                      onClick={() =>
                        void handleReject()
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Processing..."
                        : "✕ Reject Application"}
                    </button>
                  </>
                )}

                {selected.status ===
                  "approved" && (
                  <>
                    <div className="music-producer-admin__action-heading">
                      <strong>
                        Creator Management
                      </strong>

                      <span>
                        This creator is currently
                        approved.
                      </span>
                    </div>

                    <textarea
                      value={
                        suspendNote
                      }
                      onChange={(event) =>
                        setSuspendNote(
                          event.target
                            .value,
                        )
                      }
                      placeholder="Reason for suspension..."
                      rows={4}
                      disabled={
                        actionLoading
                      }
                      aria-label="Reason for suspension"
                    />

                    <button
                      type="button"
                      className="
                        music-producer-admin__action
                        music-producer-admin__action--suspend
                      "
                      onClick={() =>
                        void handleSuspend()
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Processing..."
                        : "Suspend Creator"}
                    </button>
                  </>
                )}

                {selected.status ===
                  "rejected" && (
                  <>
                    <div className="music-producer-admin__action-heading">
                      <strong>
                        Rejected Application
                      </strong>

                      <span>
                        The creator can submit
                        another application.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="
                        music-producer-admin__action
                        music-producer-admin__action--approve
                      "
                      onClick={() =>
                        void handleApprove()
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Processing..."
                        : "✓ Approve Creator"}
                    </button>
                  </>
                )}

                {selected.status ===
                  "suspended" && (
                  <>
                    <div className="music-producer-admin__action-heading">
                      <strong>
                        Suspended Creator
                      </strong>

                      <span>
                        Restore this creator's
                        publishing access.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="
                        music-producer-admin__action
                        music-producer-admin__action--approve
                      "
                      onClick={() =>
                        void handleRestore()
                      }
                      disabled={
                        actionLoading
                      }
                    >
                      {actionLoading
                        ? "Processing..."
                        : "✓ Restore Creator"}
                    </button>
                  </>
                )}
              </div>
            </aside>
          )}
        </section>
      </div>
    </main>
  );
}