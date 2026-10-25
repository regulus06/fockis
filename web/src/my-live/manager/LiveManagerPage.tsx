import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  Radio,
  RefreshCw,
  Search,
  Users,
  Video,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { api } from "../api";

import LiveManagerCard from "./LiveManagerCard";
import LiveRecordingView from "./LiveRecordingView";

import "./liveManager.scss";

import FockisMark from "../../components/fockis/FockisMark";

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

export default function LiveManagerPage() {
  const navigate = useNavigate();

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

  /** Ended live whose recording is open (null = show the list). */
  const [viewingId, setViewingId] =
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
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
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
          "Delete this livestream permanently? This action cannot be undone.",
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

      if (live.recordingUrl) {
        window.open(
          String(
            live.recordingUrl,
          ),
          "_blank",
          "noopener,noreferrer",
        );

        return;
      }

      if (live.replayUrl) {
        window.open(
          String(
            live.replayUrl,
          ),
          "_blank",
          "noopener,noreferrer",
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
            : "No recording is available for this livestream.",
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

      // A live that is still running opens the Studio; an ended live
      // opens its recording (player, download, publish).
      if (isActive(live)) {
        navigate(
          `/my-live/${encodeURIComponent(id)}`,
        );
        return;
      }

      setViewingId(id);
    },
    [getId, isActive, navigate],
  );

  if (viewingId) {
    const viewingLive =
      lives.find(
        (item) => getId(item) === viewingId,
      ) ?? null;

    return (
      <div className="live-manager">
        <LiveRecordingView
          streamId={viewingId}
          live={viewingLive}
          onBack={() => setViewingId(null)}
          onChanged={() => void loadLives(true)}
        />
      </div>
    );
  }

  return (
    <div className="live-manager">

      <header className="live-manager__header">
        <div className="live-manager__header-left">
          <span className="live-manager__brand-mark" aria-hidden="true">
            <FockisMark />
          </span>

          <div className="live-manager__title">
            <span className="live-manager__eyebrow">Fockis Live</span>
            <h1>Live Manager</h1>
            <p>Start, watch and manage your livestreams.</p>
          </div>
        </div>

        <div className="live-manager__header-actions">
          <button
            type="button"
            className="live-manager__refresh"
            onClick={() => void loadLives(true)}
            disabled={refreshing || loading}
            aria-label="Refresh live streams"
          >
            <RefreshCw
              size={16}
              className={refreshing ? "live-manager__spin" : ""}
            />
            <span>{refreshing ? "Refreshing…" : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="live-manager__primary"
            onClick={() => navigate("/my-live/studio")}
          >
            <Radio size={17} />
            {activeCount > 0 ? "Open Live Studio" : "Go live"}
          </button>
        </div>
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
              {lives.length.toLocaleString()}
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
              {activeCount.toLocaleString()}
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
              {totalViewers.toLocaleString()}
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
              {peakViewers.toLocaleString()}
            </strong>
          </div>
        </div>

      </section>

      <section className="live-manager__controls">

        <div className="live-manager__tabs" role="tablist" aria-label="Filter live streams">

          <button
            type="button"
            role="tab"
            aria-selected={tab === "all"}
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
            role="tab"
            aria-selected={tab === "active"}
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
            role="tab"
            aria-selected={tab === "ended"}
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
            aria-label="Search live streams"
          />

        </div>

      </section>

      {error && (
        <div className="live-manager__error" role="alert">
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
        <section className="live-manager__list" aria-busy="true" aria-label="Loading live streams">
          <div className="live-manager__grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="live-card live-card--skeleton" key={index} aria-hidden="true">
                <div className="live-card__media" />
                <div className="live-card__content">
                  <span className="live-card__skeleton-line" />
                  <span className="live-card__skeleton-line live-card__skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : error ? null : filteredLives.length === 0 ? (
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