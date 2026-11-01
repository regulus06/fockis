import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowLeft,
  RefreshCw,
  Search,
  Users,
  Video,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { api } from "../api";

import LiveManagerCard from "./LiveManagerCard";

import LiveRecordingView from "./LiveRecordingView";

import type { LiveRecordingDTO } from "../types";

import "./liveManager.scss";

type LiveRecord = {
  _id?: string;
  id?: string;

  hostId?: string;

  username?: string;
  displayName?: string;
  avatarUrl?: string;

  hostUsername?: string;
  hostName?: string;
  hostAvatar?: string;

  host?: {
    _id?: string;
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    avatar?: string;
  };

  title?: string;
  description?: string;
  category?: string;

  status?: string;
  phase?: string;

  thumbnailUrl?: string | null;
  thumbnail?: string | null;

  recordingUrl?: string;
  replayUrl?: string;

  recording?: LiveRecordingDTO;

  totalViews?: number;

  viewerCount?: number;
  currentViewers?: number;
  viewers?: number;

  peakViewers?: number;
  peakViewerCount?: number;

  likes?: number;
  likeCount?: number;

  comments?: number;
  commentCount?: number;

  shares?: number;
  shareCount?: number;

  duration?: number;
  elapsedSeconds?: number;

  roomName?: string;

  createdAt?: string;
  startedAt?: string | null;
  endedAt?: string | null;

  [key: string]: unknown;
};

type ManagerTab =
  | "all"
  | "active"
  | "ended";

const PROCESSING_POLL_MS = 10000;

function isRecordingPending(
  live: LiveRecord,
): boolean {
  const status =
    live.recording?.status ?? "";

  return (
    status === "processing" ||
    status === "recording" ||
    status === "starting"
  );
}

export default function LiveManagerPage() {
  const navigate = useNavigate();

  /*
   * The open recording lives in the URL (?recording=<id>) so the
   * player survives a refresh and can be linked to directly.
   */
  const [searchParams, setSearchParams] =
    useSearchParams();

  const openRecordingId =
    searchParams.get("recording") || "";

  const autoPublish =
    searchParams.get("publish") === "1";

  const [lives, setLives] =
    useState<LiveRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [tab, setTab] =
    useState<ManagerTab>("all");

  const [search, setSearch] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const getId = useCallback(
    (live: LiveRecord): string => {
      return String(
        live._id ??
          live.id ??
          "",
      );
    },
    [],
  );

  const loadLives = useCallback(
    async (
      showRefresh = false,
      quiet = false,
    ) => {
      try {
        if (quiet) {
          // Background refresh: keep the current UI untouched.
        } else if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError(null);

        console.log(
          "[FOCKIS LIVE MANAGER] Loading my live streams...",
        );

        const result =
          await api.getMyLiveStreams();

        console.log(
          "[FOCKIS LIVE MANAGER] My live streams received:",
          result,
        );

        setLives(
          Array.isArray(result)
            ? (result as LiveRecord[])
            : [],
        );
      } catch (err) {
        console.error(
          "[FOCKIS LIVE MANAGER] Failed to load live streams:",
          err,
        );

        if (quiet) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load live streams.",
        );

        setLives([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadLives();
  }, [loadLives]);

  /*
   * While any recording is still being finalized, refresh quietly
   * until it becomes ready (or fails). The backend syncs the
   * recording state from LiveKit on every /live/mine request.
   */
  const hasPendingRecording =
    lives.some(isRecordingPending);

  useEffect(() => {
    if (
      !hasPendingRecording ||
      openRecordingId
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadLives(false, true);
    }, PROCESSING_POLL_MS);

    return () =>
      window.clearInterval(timer);
  }, [
    hasPendingRecording,
    openRecordingId,
    loadLives,
  ]);

  const refreshQuietly = useCallback(() => {
    void loadLives(false, true);
  }, [loadLives]);

  const openRecording = useCallback(
    (id: string, publish = false) => {
      const next = new URLSearchParams(
        searchParams,
      );

      next.set("recording", id);

      if (publish) {
        next.set("publish", "1");
      } else {
        next.delete("publish");
      }

      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const closeRecording = useCallback(() => {
    const next = new URLSearchParams(
      searchParams,
    );

    next.delete("recording");
    next.delete("publish");

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const isActive = useCallback(
    (live: LiveRecord): boolean => {
      const status =
        String(
          live.status ??
            live.phase ??
            "",
        )
          .trim()
          .toLowerCase();

      return status === "live";
    },
    [],
  );

  const isEnded = useCallback(
    (live: LiveRecord): boolean => {
      const status =
        String(
          live.status ??
            live.phase ??
            "",
        )
          .trim()
          .toLowerCase();

      return (
        status === "ended" ||
        status === "completed" ||
        status === "finished" ||
        status === "stopped"
      );
    },
    [],
  );

  const filteredLives = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return [...lives]
      .filter((live) => {
        if (tab === "active") {
          return isActive(live);
        }

        if (tab === "ended") {
          return isEnded(live);
        }

        return true;
      })
      .filter((live) => {
        if (!normalizedSearch) {
          return true;
        }

        const title =
          String(
            live.title ?? "",
          ).toLowerCase();

        const description =
          String(
            live.description ?? "",
          ).toLowerCase();

        const hostName =
          String(
            live.displayName ??
              live.hostName ??
              live.username ??
              live.host?.username ??
              "",
          ).toLowerCase();

        return (
          title.includes(
            normalizedSearch,
          ) ||
          description.includes(
            normalizedSearch,
          ) ||
          hostName.includes(
            normalizedSearch,
          )
        );
      })
      .sort((a, b) => {
        const aDate =
          new Date(
            String(
              a.startedAt ??
                a.createdAt ??
                0,
            ),
          ).getTime();

        const bDate =
          new Date(
            String(
              b.startedAt ??
                b.createdAt ??
                0,
            ),
          ).getTime();

        return bDate - aDate;
      });
  }, [
    lives,
    tab,
    search,
    isActive,
    isEnded,
  ]);

  const activeCount =
    lives.filter(isActive).length;

  const endedCount =
    lives.filter(isEnded).length;

  const totalViewers =
    lives.reduce(
      (total, live) =>
        total +
        Number(
          live.viewerCount ??
            live.currentViewers ??
            live.viewers ??
            0,
        ),
      0,
    );

  const peakViewers =
    lives.reduce(
      (highest, live) =>
        Math.max(
          highest,
          Number(
            live.peakViewerCount ??
              live.peakViewers ??
              0,
          ),
        ),
      0,
    );

  const handleDelete = useCallback(
    async (live: LiveRecord) => {
      const id = getId(live);

      if (!id) {
        return;
      }

      const confirmed =
        window.confirm(
          [
            "Delete this livestream permanently?",
            "",
            "• The livestream, its statistics and its recording will be removed.",
            live.recording?.publishedPostId
              ? "• The post you published to your feed is a separate copy and will NOT be deleted."
              : "• This action cannot be undone.",
          ].join("\n"),
        );

      if (!confirmed) {
        return;
      }

      try {
        setDeletingId(id);

        await api.deleteSession(id);

        setLives((current) =>
          current.filter(
            (item) =>
              getId(item) !== id,
          ),
        );
      } catch (err) {
        console.error(
          "[FOCKIS LIVE MANAGER] Delete failed:",
          err,
        );

        window.alert(
          err instanceof Error
            ? err.message
            : "Unable to delete this livestream.",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [getId],
  );

  const handleDownload = useCallback(
    async (live: LiveRecord) => {
      const id = getId(live);

      if (!id) {
        return;
      }

      if (
        live.recording?.status !== "ready"
      ) {
        window.alert(
          live.recording?.message ||
            "No recording is available for this livestream.",
        );

        return;
      }

      try {
        await api.downloadRecording(id);
      } catch (err) {
        console.error(
          "[FOCKIS LIVE MANAGER] Recording download failed:",
          err,
        );

        window.alert(
          err instanceof Error
            ? err.message
            : "The recording could not be downloaded.",
        );
      }
    },
    [getId],
  );

  const handleView = useCallback(
    (live: LiveRecord) => {
      const id = getId(live);

      if (!id) {
        return;
      }

      // A live broadcast opens in the studio; an ended one
      // opens its recording player.
      if (isActive(live)) {
        navigate(
          `/my-live/${encodeURIComponent(id)}`,
        );

        return;
      }

      openRecording(id);
    },
    [getId, isActive, navigate, openRecording],
  );

  const handlePublish = useCallback(
    (live: LiveRecord) => {
      const id = getId(live);

      if (id) {
        openRecording(id, true);
      }
    },
    [getId, openRecording],
  );

  /* ==========================================================================
     RECORDING PLAYER VIEW
  ========================================================================== */

  if (openRecordingId) {
    const selected =
      lives.find(
        (live) =>
          getId(live) === openRecordingId,
      ) ?? null;

    return (
      <div className="live-manager live-manager--detail">
        {loading && !selected ? (
          <div className="live-manager__loading">
            <RefreshCw
              size={26}
              className="live-manager__spin"
            />

            <h2>Loading recording...</h2>
          </div>
        ) : (
          <LiveRecordingView
            key={openRecordingId}
            streamId={openRecordingId}
            live={selected}
            autoOpenPublish={autoPublish}
            onBack={closeRecording}
            onChanged={refreshQuietly}
          />
        )}
      </div>
    );
  }

  return (
    <div className="live-manager">

      <header className="live-manager__header">

        <div className="live-manager__header-left">

          <button
            type="button"
            className="live-manager__back"
            onClick={() =>
              navigate("/my-live/studio")
            }
          >
            <ArrowLeft size={18} />

            <span>
              Live Studio
            </span>
          </button>

          <div className="live-manager__title">

            <div className="live-manager__title-icon">
              <Video size={22} />
            </div>

            <div>
              <h1>
                Live Manager
              </h1>

              <p>
                Manage your Fockis livestreams.
              </p>
            </div>

          </div>

        </div>

        <button
          type="button"
          className="live-manager__refresh"
          onClick={() =>
            void loadLives(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "live-manager__spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>

      </header>

      <section className="live-manager__stats">

        <div className="live-manager__stat">
          <div className="live-manager__stat-icon">
            <Video size={19} />
          </div>

          <div>
            <span>
              Live Streams
            </span>

            <strong>
              {lives.length}
            </strong>
          </div>
        </div>

        <div className="live-manager__stat">
          <div className="live-manager__stat-icon live-manager__stat-icon--live">
            <Activity size={19} />
          </div>

          <div>
            <span>
              Currently Live
            </span>

            <strong>
              {activeCount}
            </strong>
          </div>
        </div>

        <div className="live-manager__stat">
          <div className="live-manager__stat-icon">
            <Users size={19} />
          </div>

          <div>
            <span>
              Current Viewers
            </span>

            <strong>
              {totalViewers}
            </strong>
          </div>
        </div>

        <div className="live-manager__stat">
          <div className="live-manager__stat-icon">
            <Activity size={19} />
          </div>

          <div>
            <span>
              Peak Viewers
            </span>

            <strong>
              {peakViewers}
            </strong>
          </div>
        </div>

      </section>

      <section className="live-manager__controls">

        <div className="live-manager__tabs">

          <button
            type="button"
            className={
              tab === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("all")
            }
          >
            All

            <span>
              {lives.length}
            </span>
          </button>

          <button
            type="button"
            className={
              tab === "active"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("active")
            }
          >
            Live

            <span>
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            className={
              tab === "ended"
                ? "active"
                : ""
            }
            onClick={() =>
              setTab("ended")
            }
          >
            Ended

            <span>
              {endedCount}
            </span>
          </button>

        </div>

        <div className="live-manager__search">

          <Search size={17} />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Search live streams..."
          />

        </div>

      </section>

      {error && (
        <div className="live-manager__error">
          <strong>
            Unable to load Live Manager
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              void loadLives()
            }
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="live-manager__loading">

          <RefreshCw
            size={26}
            className="live-manager__spin"
          />

          <h2>
            Loading live streams...
          </h2>

          <p>
            Getting your Fockis livestreams.
          </p>

        </div>
      ) : filteredLives.length === 0 ? (
        <div className="live-manager__empty">

          <div className="live-manager__empty-icon">
            <Video size={30} />
          </div>

          <h2>
            {search
              ? "No matching live streams"
              : tab === "ended"
                ? "No ended lives"
                : tab === "active"
                  ? "No one is live right now"
                  : "No live streams"}
          </h2>

          <p>
            {search
              ? "Try another search."
              : "Your livestreams will appear here."}
          </p>

          {!search &&
            tab !== "ended" && (
              <button
                type="button"
                onClick={() =>
                  navigate("/my-live/studio")
                }
              >
                Open Live Studio
              </button>
            )}

        </div>
      ) : (
        <section className="live-manager__list">

          <div className="live-manager__list-header">

            <div>
              <h2>
                {tab === "ended"
                  ? "Ended Lives"
                  : tab === "active"
                    ? "Currently Live"
                    : "My Live Streams"}
              </h2>

              <p>
                {filteredLives.length}{" "}
                {filteredLives.length === 1
                  ? "stream"
                  : "streams"}
              </p>
            </div>

          </div>

          <div className="live-manager__grid">

            {filteredLives.map(
              (live) => {
                const id =
                  getId(live);

                return (
                  <LiveManagerCard
                    key={
                      id ||
                      `${live.title}-${live.createdAt}`
                    }
                    live={live}
                    isActive={isActive(
                      live,
                    )}
                    isDeleting={
                      deletingId === id
                    }
                    onView={() =>
                      handleView(
                        live,
                      )
                    }
                    onDownload={() =>
                      void handleDownload(
                        live,
                      )
                    }
                    onPublish={() =>
                      handlePublish(
                        live,
                      )
                    }
                    onDelete={() =>
                      void handleDelete(
                        live,
                      )
                    }
                  />
                );
              },
            )}

          </div>

        </section>
      )}

    </div>
  );
}