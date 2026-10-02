import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { playlistsApi } from "../services/playlistsApi";

import type {
  CreatorStats,
  Playlist,
  PlaylistSummary,
} from "../types/playlist.types";

import { MediaMasthead } from "../components/MediaMasthead";
import { MediaFooter } from "../components/MediaFooter";
import { CreatePlaylistModal } from "../components/CreatePlaylistModal";

import {
  EmptyPlaylistsState,
  ErrorState,
} from "../components/StateViews";

import {
  formatCount,
  formatRevenue,
} from "../utils/format";

import "../styles/Playlists.scss";

// ============================================================================
// MY PLAYLISTS PAGE
// ============================================================================

export function MyPlaylistsPage() {
  const [stats, setStats] = useState<CreatorStats | null>(null);

  const [playlists, setPlaylists] = useState<
    PlaylistSummary[] | null
  >(null);

  const [error, setError] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);

  const [editing, setEditing] = useState<
    Playlist | undefined
  >(undefined);

  const [busyId, setBusyId] = useState<string | null>(null);

  // ==========================================================================
  // LOAD CREATOR DATA
  // ==========================================================================

  const load = async () => {
    setError(false);
    setStats(null);
    setPlaylists(null);

    try {
      const [
        statsData,
        listData,
      ] = await Promise.all([
        playlistsApi.getMyCreatorStats(),
        playlistsApi.getMyPlaylists(),
      ]);

      setStats(statsData);
      setPlaylists(listData);
    } catch {
      setError(true);
    }
  };

  // ==========================================================================
  // INITIAL LOAD
  // ==========================================================================

  useEffect(() => {
    void load();
  }, []);

  // ==========================================================================
  // RUN PLAYLIST ACTION
  // ==========================================================================

  const runAction = async (
    id: string,
    action: (id: string) => Promise<unknown>,
  ) => {
    setBusyId(id);

    try {
      await action(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  // ==========================================================================
  // DELETE PLAYLIST
  // ==========================================================================

  const handleDelete = async (
    id: string,
    title: string,
  ) => {
    if (
      !window.confirm(
        `Delete "${title}"? This cannot be undone.`,
      )
    ) {
      return;
    }

    await runAction(
      id,
      playlistsApi.deletePlaylist,
    );
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="fk-root">

      {/* ====================================================================
          MEDIA HEADER
      ==================================================================== */}

      <MediaMasthead />

      {/* ====================================================================
          PAGE HEADER
      ==================================================================== */}

      <section
        className="fk-section fk-section--tight"
        style={{
          borderBottom: "none",
        }}
      >
        <div className="fk-container">

          <div className="fk-section-head">

            <div className="fk-section-head__text">

              <div className="fk-eyebrow">
                Creator Dashboard
              </div>

              <h1 className="fk-heading-lg">
                My Playlists
              </h1>

            </div>

            <button
              type="button"
              className="fk-btn fk-btn--primary"
              onClick={() => {
                setEditing(undefined);
                setModalOpen(true);
              }}
            >
              Publish New Playlist
            </button>

          </div>

        </div>
      </section>

      {/* ====================================================================
          CREATOR CONTENT
      ==================================================================== */}

      <section
        className="fk-section"
        style={{
          borderBottom: "none",
          paddingTop: 0,
        }}
      >
        <div className="fk-container">

          {error ? (

            <ErrorState
              onRetry={load}
            />

          ) : (

            <>

              {/* ============================================================
                  CREATOR STATS
              ============================================================ */}

              <div className="fk-stat-grid">

                <StatCard
                  label="Total Playlists"
                  value={
                    stats
                      ? String(
                          stats.totalPlaylists,
                        )
                      : undefined
                  }
                />

                <StatCard
                  label="Total Plays"
                  value={
                    stats
                      ? formatCount(
                          stats.totalPlays,
                        )
                      : undefined
                  }
                />

                <StatCard
                  label="Total Followers"
                  value={
                    stats
                      ? formatCount(
                          stats.totalFollowers,
                        )
                      : undefined
                  }
                />

                <StatCard
                  label="Revenue"
                  value={
                    stats
                      ? formatRevenue(
                          stats.revenueCents,
                          stats.currency,
                        )
                      : undefined
                  }
                />

              </div>

              {/* ============================================================
                  CONTENT SUMMARY
              ============================================================ */}

              <div
                style={{
                  display: "flex",
                  gap: "var(--fk-space-3)",
                  marginBottom: "var(--fk-space-5)",
                }}
              >
                <span className="fk-caption">
                  {stats?.publishedContentCount ?? 0}
                  {" "}
                  published
                  {" "}
                  &middot;
                  {" "}
                  {stats?.premiumContentCount ?? 0}
                  {" "}
                  premium
                </span>
              </div>

              {/* ============================================================
                  LOADING
              ============================================================ */}

              {playlists === null ? (

                <div
                  className="fk-skeleton"
                  style={{
                    height: 240,
                    borderRadius: 10,
                  }}
                  aria-hidden="true"
                />

              ) : playlists.length === 0 ? (

                /* ==========================================================
                   EMPTY STATE
                ========================================================== */

                <EmptyPlaylistsState
                  context="playlists"
                />

              ) : (

                /* ==========================================================
                   PLAYLIST TABLE
                ========================================================== */

                <div className="fk-scroll-x">

                  <table className="fk-manage-table">

                    <thead>

                      <tr>
                        <th>
                          Playlist
                        </th>

                        <th>
                          Status
                        </th>

                        <th>
                          Plays
                        </th>

                        <th>
                          Followers
                        </th>

                        <th>
                          Actions
                        </th>
                      </tr>

                    </thead>

                    <tbody>

                      {playlists.map(
                        (playlist) => (

                          <tr
                            key={
                              playlist.id
                            }
                          >

                            {/* ==================================================
                                PLAYLIST
                            ================================================== */}

                            <td
                              data-label="Playlist"
                            >
                              <Link
                                to={`/media/playlists/${playlist.slug}`}
                                style={{
                                  fontWeight: 600,
                                  textDecoration:
                                    "none",
                                }}
                              >
                                {
                                  playlist.title
                                }
                              </Link>
                            </td>

                            {/* ==================================================
                                STATUS
                            ================================================== */}

                            <td
                              data-label="Status"
                            >
                              <span
                                className={`fk-status-pill fk-status-pill--${statusModifier(
                                  playlist,
                                )}`}
                              >
                                {statusLabel(
                                  playlist,
                                )}
                              </span>
                            </td>

                            {/* ==================================================
                                PLAYS
                            ================================================== */}

                            <td
                              data-label="Plays"
                              className="fk-data"
                            >
                              {formatCount(
                                playlist.playCount,
                              )}
                            </td>

                            {/* ==================================================
                                FOLLOWERS
                            ================================================== */}

                            <td
                              data-label="Followers"
                              className="fk-data"
                            >
                              {formatCount(
                                playlist.followerCount,
                              )}
                            </td>

                            {/* ==================================================
                                ACTIONS
                            ================================================== */}

                            <td
                              data-label="Actions"
                            >

                              <div className="fk-row-actions">

                                {/* VIEW */}

                                <Link
                                  to={`/media/playlists/${playlist.slug}`}
                                  className="fk-btn fk-btn--ghost fk-btn--sm"
                                >
                                  View
                                </Link>

                                {/* EDIT */}

                                <button
                                  type="button"
                                  className="fk-btn fk-btn--ghost fk-btn--sm"
                                  onClick={() => {
                                    playlistsApi
                                      .getPlaylistById(
                                        playlist.id,
                                      )
                                      .then(
                                        (full) => {
                                          setEditing(
                                            full,
                                          );

                                          setModalOpen(
                                            true,
                                          );
                                        },
                                      );
                                  }}
                                >
                                  Edit
                                </button>

                                {/* PUBLISH / UNPUBLISH */}

                                {playlist.status ===
                                "published" ? (

                                  <button
                                    type="button"
                                    className="fk-btn fk-btn--ghost fk-btn--sm"
                                    disabled={
                                      busyId ===
                                      playlist.id
                                    }
                                    onClick={() =>
                                      runAction(
                                        playlist.id,
                                        playlistsApi.unpublishPlaylist,
                                      )
                                    }
                                  >
                                    Unpublish
                                  </button>

                                ) : (

                                  <button
                                    type="button"
                                    className="fk-btn fk-btn--ghost fk-btn--sm"
                                    disabled={
                                      busyId ===
                                      playlist.id
                                    }
                                    onClick={() =>
                                      runAction(
                                        playlist.id,
                                        playlistsApi.publishPlaylist,
                                      )
                                    }
                                  >
                                    Publish
                                  </button>

                                )}

                                {/* DUPLICATE */}

                                <button
                                  type="button"
                                  className="fk-btn fk-btn--ghost fk-btn--sm"
                                  disabled={
                                    busyId ===
                                    playlist.id
                                  }
                                  onClick={() =>
                                    runAction(
                                      playlist.id,
                                      playlistsApi.duplicatePlaylist,
                                    )
                                  }
                                >
                                  Duplicate
                                </button>

                                {/* ANALYTICS */}

                                <Link
                                  to={`/media/my-playlists/${playlist.id}/analytics`}
                                  className="fk-btn fk-btn--ghost fk-btn--sm"
                                >
                                  Analytics
                                </Link>

                                {/* DELETE */}

                                <button
                                  type="button"
                                  className="fk-btn fk-btn--danger fk-btn--sm"
                                  onClick={() =>
                                    handleDelete(
                                      playlist.id,
                                      playlist.title,
                                    )
                                  }
                                >
                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>

                        ),
                      )}

                    </tbody>

                  </table>

                </div>

              )}

            </>

          )}

        </div>
      </section>

      {/* ====================================================================
          FOOTER
      ==================================================================== */}

      <MediaFooter />

      {/* ====================================================================
          CREATE / EDIT PLAYLIST MODAL
      ==================================================================== */}

      <CreatePlaylistModal
        open={modalOpen}
        editingPlaylist={editing}
        onClose={() =>
          setModalOpen(false)
        }
        onCreated={() =>
          load()
        }
      />

    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="fk-stat-card">

      <div className="fk-stat-card__label">
        {label}
      </div>

      <div className="fk-stat-card__value fk-data">
        {value ?? "—"}
      </div>

    </div>
  );
}

// ============================================================================
// STATUS MODIFIER
// ============================================================================

function statusModifier(
  playlist: PlaylistSummary,
): string {
  if (
    playlist.access === "exclusive"
  ) {
    return "exclusive";
  }

  if (
    playlist.access === "premium"
  ) {
    return "premium";
  }

  return playlist.status;
}

// ============================================================================
// STATUS LABEL
// ============================================================================

function statusLabel(
  playlist: PlaylistSummary,
): string {
  if (
    playlist.access === "exclusive"
  ) {
    return "Exclusive";
  }

  if (
    playlist.access === "premium"
  ) {
    return "Premium";
  }

  if (
    playlist.status === "draft"
  ) {
    return "Draft";
  }

  if (
    playlist.status === "published"
  ) {
    return "Published";
  }

  return "Unpublished";
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default MyPlaylistsPage;