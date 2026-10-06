import { useMemo, useState, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";

import ChartRow from "../components/charts/ChartRow";
import ChartSkeleton from "../components/charts/ChartSkeleton";
import ChartTabs from "../components/charts/ChartTabs";
import ChartsHero from "../components/charts/ChartsHero";

import { useMusicCharts } from "../hooks/useMusicCharts";
import { getChartSectionLabel } from "../utils/musicCharts";

import "../styles/Music.scss";
import "../styles/MusicCharts.scss";

type ChartMediaItem = {
  id?: unknown;
  _id?: unknown;
  title?: unknown;
  name?: unknown;
  artist?: unknown;
  creatorName?: unknown;
  producerName?: unknown;
  creator?: unknown;
  type?: unknown;
  mediaKind?: unknown;
  mediaType?: unknown;
  coverImage?: unknown;
  thumbnail?: unknown;
  poster?: unknown;
  image?: unknown;
  artwork?: unknown;
  videoUrl?: unknown;
  processedVideoUrl?: unknown;
  playbackUrl?: unknown;
  mediaUrl?: unknown;
  videoStorageKey?: unknown;
  processedVideoStorageKey?: unknown;
  processedMediaStorageKey?: unknown;
  storageKey?: unknown;
  media?: Record<string, unknown>;
  [key: string]: unknown;
};

const getString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return String(value);
    }
  }

  return "";
};

const getId = (item: ChartMediaItem): string =>
  getString(item.id, item._id);

const getNestedString = (
  value: unknown,
  ...keys: string[]
): string => {
  if (!value || typeof value !== "object") {
    return "";
  }

  const object = value as Record<string, unknown>;

  return getString(
    ...keys.map((key) => object[key]),
  );
};

const getMediaKind = (item: ChartMediaItem): string =>
  getString(
    item.mediaKind,
    item.mediaType,
    item.type,
    item.media?.mediaKind,
    item.media?.kind,
  ).toLowerCase();

const isVideoItem = (item: ChartMediaItem): boolean => {
  const kind = getMediaKind(item);

  return (
    kind === "video" ||
    kind === "music_video" ||
    kind === "musicvideo" ||
    kind === "live_video" ||
    kind === "live_performance" ||
    kind === "interview" ||
    kind === "tutorial" ||
    kind === "exclusive_video" ||
    kind.includes("video")
  );
};

const getApiBaseUrl = (): string => {
  const env = (
    import.meta as unknown as {
      env?: Record<string, string | undefined>;
    }
  ).env;

  const configured = getString(
    env?.VITE_API_URL,
    env?.VITE_API_BASE_URL,
  ).replace(/\/+$/, "");

  if (configured) {
    return configured;
  }

  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:3000";
  }

  return "";
};

const resolveMediaUrl = (value: unknown): string => {
  const raw = getString(value);

  if (!raw) {
    return "";
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (raw.startsWith("//")) {
    return `${window.location.protocol}${raw}`;
  }

  const apiBase = getApiBaseUrl();

  if (raw.startsWith("/")) {
    return `${apiBase}${raw}`;
  }

  const normalized = raw
    .replace(/^\.?\//, "")
    .replace(/^uploads\//i, "");

  return `${apiBase}/uploads/${normalized}`;
};

const getVideoUrls = (item: ChartMediaItem): string[] => {
  const media = item.media;

  const candidates: unknown[] = [
    item.processedVideoUrl,
    item.videoUrl,
    item.playbackUrl,
    item.mediaUrl,
    item.processedVideoStorageKey,
    item.processedMediaStorageKey,
    item.videoStorageKey,

    getNestedString(
      media,
      "processedVideoUrl",
      "processedUrl",
      "playbackUrl",
      "videoUrl",
      "url",
    ),

    getNestedString(
      media,
      "processedVideoStorageKey",
      "processedMediaStorageKey",
      "videoStorageKey",
      "storageKey",
    ),

    item.storageKey,
  ];

  const urls: string[] = [];

  for (const candidate of candidates) {
    const url = resolveMediaUrl(candidate);

    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }

  return urls;
};

const getVideoUrl = (item: ChartMediaItem): string =>
  getVideoUrls(item)[0] || "";

const getPosterUrl = (item: ChartMediaItem): string => {
  const cover = item.coverImage;

  const candidates: unknown[] = [
    getNestedString(
      cover,
      "url",
      "imageUrl",
      "storageKey",
    ),
    item.thumbnail,
    item.poster,
    item.image,
    item.artwork,

    getNestedString(
      item.media,
      "coverUrl",
      "coverImageUrl",
      "thumbnailUrl",
      "posterUrl",
    ),
  ];

  for (const candidate of candidates) {
    const url = resolveMediaUrl(candidate);

    if (url) {
      return url;
    }
  }

  return "";
};

const getTitle = (item: ChartMediaItem): string =>
  getString(
    item.title,
    item.name,
    "Untitled",
  );

const getCreator = (item: ChartMediaItem): string =>
  getString(
    item.artist,
    item.creatorName,
    item.producerName,
    item.creator,
    item.authorName,
    "Fockis Creator",
  );

const getPlays = (item: ChartMediaItem): string => {
  const value = getString(
    item.plays,
    item.playCount,
    item.totalPlays,
    item.stats &&
      typeof item.stats === "object"
      ? (item.stats as Record<string, unknown>).plays
      : undefined,
  );

  if (!value) {
    return "0 plays";
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return `${value} plays`;
  }

  return `${numeric.toLocaleString()} ${
    numeric === 1 ? "play" : "plays"
  }`;
};

function ChartVideoArtwork({
  item,
}: {
  item: ChartMediaItem;
}) {
  const [failedIndex, setFailedIndex] = useState(0);
  const videoUrls = getVideoUrls(item);
  const posterUrl = getPosterUrl(item);

  if (
    !isVideoItem(item) ||
    videoUrls.length === 0 ||
    failedIndex >= videoUrls.length
  ) {
    return (
      <div
        className="fockis-chart-video-placeholder"
        aria-label="Video preview unavailable"
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="fockis-chart-poster-image"
          />
        ) : (
          <span aria-hidden="true">🎬</span>
        )}

        <span className="fockis-chart-placeholder-badge">
          🎬 Video unavailable
        </span>
      </div>
    );
  }

  const currentUrl = videoUrls[failedIndex];

  return (
    <div className="fockis-chart-video-wrap">
      <video
        key={currentUrl}
        className="fockis-chart-video"
        src={currentUrl}
        poster={posterUrl || undefined}
        controls
        playsInline
        preload="metadata"
        onError={() => {
          console.warn(
            "[Fockis Music Charts] Video URL failed:",
            currentUrl,
          );

          setFailedIndex((current) => current + 1);
        }}
      />
    </div>
  );
}

function ChartPodiumReplacement({
  items,
  onOpen,
}: {
  items: unknown[];
  onOpen: (item: { id: string }) => void;
}) {
  const podiumItems = useMemo(
    () =>
      items
        .slice(0, 3)
        .map(
          (value) =>
            value as ChartMediaItem,
        ),
    [items],
  );

  if (podiumItems.length === 0) {
    return null;
  }

  return (
    <section
      className="fockis-chart-podium"
      aria-label="Top three chart performers"
    >
      <div className="fockis-chart-podium-heading">
        <span className="music-section-eyebrow">
          TOP PERFORMERS
        </span>

        <h2>The Top 3</h2>
      </div>

      <div className="fockis-chart-podium-grid">
        {podiumItems.map((item, index) => {
          const id = getId(item);
          const rank = index + 1;

          const cardStyle = {
            "--fockis-rank": rank,
          } as CSSProperties;

          return (
            <article
              key={id || `chart-rank-${rank}`}
              className={`fockis-chart-podium-card fockis-chart-rank-${rank}`}
              style={cardStyle}
            >
              <div className="fockis-chart-rank-row">
                <span className="fockis-chart-rank">
                  #{rank}
                </span>
              </div>

              <div className="fockis-chart-art">
                <ChartVideoArtwork item={item} />
              </div>

              <div className="fockis-chart-card-body">
                <button
                  type="button"
                  className="fockis-chart-title-button"
                  onClick={() => {
                    if (id) {
                      onOpen({ id });
                    }
                  }}
                >
                  <h3>{getTitle(item)}</h3>
                </button>

                <p>{getCreator(item)}</p>

                <span className="fockis-chart-plays">
                  {getPlays(item)}
                </span>

                <span className="fockis-chart-card-type">
                  {isVideoItem(item)
                    ? "🎬 Video"
                    : "🎵 Music"}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ChartPageStyles() {
  return (
    <style>{`
      .fockis-chart-podium {
        width: min(1100px, calc(100% - 80px));
        margin: 42px auto 0;
      }

      .fockis-chart-podium-heading {
        margin-bottom: 16px;
      }

      .fockis-chart-podium-heading h2 {
        margin: 5px 0 0;
      }

      .fockis-chart-podium-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
        align-items: start;
      }

      .fockis-chart-podium-card {
        min-width: 0;
        overflow: hidden;
        background: #ffffff;
        border: 1px solid #e1e7ef;
        border-top: 3px solid #a13cff;
        border-radius: 12px;
        box-shadow: 0 10px 28px rgba(15, 38, 60, 0.08);
      }

      .fockis-chart-podium-card.fockis-chart-rank-1 {
        transform: translateY(-4px);
      }

      .fockis-chart-rank-row {
        padding: 12px 12px 0;
      }

      .fockis-chart-rank {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 34px;
        height: 24px;
        padding: 0 8px;
        margin-bottom: 8px;
        border-radius: 999px;
        background: #f3edff;
        color: #6d2ad8;
        font-size: 11px;
        font-weight: 800;
      }

      .fockis-chart-art {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        overflow: hidden;
        margin-top: 8px;
        background: #111827;
      }

      .fockis-chart-video-wrap,
      .fockis-chart-video-placeholder {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }

      .fockis-chart-video {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
        background: #111827;
      }

      .fockis-chart-video::-webkit-media-controls-panel {
        background-image: linear-gradient(
          transparent,
          rgba(0, 0, 0, 0.78)
        );
      }

      .fockis-chart-title-button {
        width: 100%;
        padding: 0;
        border: 0;
        background: transparent;
        text-align: left;
        cursor: pointer;
      }

      .fockis-chart-title-button:focus-visible {
        outline: 3px solid rgba(161, 60, 255, 0.35);
        outline-offset: 3px;
        border-radius: 4px;
      }

      .fockis-chart-poster-image {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: cover;
      }

      .fockis-chart-video-placeholder {
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 42px;
        color: #7156a4;
      }

      .fockis-chart-placeholder-badge {
        position: absolute;
        right: 8px;
        bottom: 8px;
        z-index: 2;
        padding: 5px 8px;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.82);
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
      }

      .fockis-chart-card-body {
        padding: 12px 2px 4px;
      }

      .fockis-chart-card-body h3 {
        margin: 0;
        color: #102f46;
        font-size: 17px;
        line-height: 1.25;
      }

      .fockis-chart-card-body p {
        margin: 5px 0 0;
        color: #718096;
        font-size: 12px;
      }

      .fockis-chart-plays {
        display: block;
        margin-top: 9px;
        color: #34495e;
        font-size: 12px;
        font-weight: 700;
      }

      .fockis-chart-card-type {
        display: block;
        margin-top: 8px;
        color: #7040d8;
        font-size: 11px;
        font-weight: 800;
      }

      @media (max-width: 860px) {
        .fockis-chart-podium {
          width: min(100% - 40px, 700px);
        }

        .fockis-chart-podium-grid {
          grid-template-columns: 1fr;
        }

        .fockis-chart-podium-card.fockis-chart-rank-1 {
          transform: none;
        }
      }
    `}</style>
  );
}

export default function MusicChartsPage() {
  const navigate = useNavigate();

  const {
    tab,
    setTab,
    items,
    filteredItems,
    topThree,
    remainingItems,
    musicCount,
    videoCount,
    loading,
    error,
    reload,
  } = useMusicCharts();

  const handleOpen = (item: { id: string }) => {
    navigate(`/music/${item.id}`);
  };

  return (
    <main className="music-home music-charts-page">
      <ChartPageStyles />

      <ChartsHero chartCount={items.length} />

      <nav
        className="music-home-nav music-charts-nav"
        aria-label="Music navigation"
      >
        <Link to="/music">Home</Link>
        <Link to="/music/explore">Explore</Link>

        <Link
          className="music-home-nav-active"
          to="/music/charts"
          aria-current="page"
        >
          🏆 Charts
        </Link>

        <Link to="/music/tracks">Tracks</Link>
        <Link to="/music/videos">Videos</Link>
        <Link to="/music/albums">Albums</Link>
        <Link to="/music/producers">Producers</Link>
      </nav>

      <section className="music-charts-toolbar">
        <div className="music-charts-toolbar-copy">
          <span className="music-section-eyebrow">
            RANKINGS
          </span>

          <h2>What's performing now</h2>

          <p>
            Rankings are based on content performance and plays.
          </p>
        </div>

        <ChartTabs
          tab={tab}
          onChange={setTab}
          totalCount={items.length}
          musicCount={musicCount}
          videoCount={videoCount}
        />
      </section>

      {error && (
        <section className="music-error" role="alert">
          <div>
            <strong>Charts could not be loaded</strong>

            <p>{error}</p>
          </div>

          <button
            type="button"
            className="music-secondary-button"
            onClick={() => void reload()}
          >
            Try Again
          </button>
        </section>
      )}

      {loading ? (
        <section
          className="music-charts-list"
          aria-label="Loading charts"
          aria-busy="true"
        >
          {Array.from({ length: 8 }).map(
            (_, index) => (
              <ChartSkeleton key={index} />
            ),
          )}
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="music-empty-state">
          <div
            className="music-empty-state-icon"
            aria-hidden="true"
          >
            🏆
          </div>

          <h2>No charting content yet</h2>

          <p>
            Once creators start getting plays, their music and
            videos will appear here.
          </p>

          <Link
            to="/music/explore"
            className="music-primary-button"
          >
            Explore Fockis Music
          </Link>
        </section>
      ) : (
        <>
          <ChartPodiumReplacement
            items={topThree}
            onOpen={handleOpen}
          />

          <section className="music-charts-list-section">
            <div className="music-section-heading">
              <div>
                <span className="music-section-eyebrow">
                  {getChartSectionLabel(tab)}
                </span>

                <h2>Full Chart</h2>
              </div>

              <span className="music-chart-total">
                {filteredItems.length} ranked
              </span>
            </div>

            <div className="music-charts-list">
              {remainingItems.length > 0
                ? remainingItems.map((item) => (
                    <ChartRow
                      key={item.id}
                      item={item}
                      onOpen={handleOpen}
                    />
                  ))
                : topThree.map((item) => (
                    <ChartRow
                      key={item.id}
                      item={item}
                      onOpen={handleOpen}
                    />
                  ))}
            </div>
          </section>
        </>
      )}

      <section className="music-charts-creator-banner">
        <div>
          <span className="music-section-eyebrow">
            ARE YOU A CREATOR?
          </span>

          <h2>
            Get your music or video on the Fockis Charts.
          </h2>

          <p>
            Publish your work, build an audience, earn from your
            content, and compete for the top spot.
          </p>
        </div>

        <Link
          to="/music/studio"
          className="music-primary-button"
        >
          Open Creator Studio →
        </Link>
      </section>
    </main>
  );
}
