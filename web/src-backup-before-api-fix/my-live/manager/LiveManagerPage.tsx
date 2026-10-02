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

import { useNavigate } from "react-router-dom";

import { api } from "../api";

import LiveManagerCard from "./LiveManagerCard";

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

      navigate(
        `/my-live/${encodeURIComponent(id)}`,
      );
    },
    [getId, navigate],
  );

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