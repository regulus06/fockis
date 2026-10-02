import { formatMusicPrice } from "../../utils/formatMusicPrice";

import {
  formatPlays,
  formatType,
  getAccentClass,
  getMediaIcon,
  isVideo,
  type ChartItem,
} from "../../utils/musicCharts";

interface ChartRowProps {
  item: ChartItem;
  onOpen: (item: ChartItem) => void;
}

export default function ChartRow({
  item,
  onOpen,
}: ChartRowProps) {
  const progress =
    item.plays > 0
      ? Math.max(8, 100)
      : 8;

  const video = isVideo(item);

  return (
    <article
      className={`music-chart-row ${getAccentClass(
        item.rank,
      )}`}
    >
      <div className="music-chart-rank">
        <span className="music-chart-rank-number">
          #{item.rank}
        </span>

        {item.rank <= 3 && (
          <span
            className="music-chart-rank-medal"
            aria-hidden="true"
          >
            {item.rank === 1
              ? "👑"
              : item.rank === 2
                ? "🥈"
                : "🥉"}
          </span>
        )}
      </div>

      <button
        type="button"
        className="music-chart-art-button"
        onClick={() => onOpen(item)}
        aria-label={`Open ${item.title}`}
      >
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt=""
            className="music-chart-art"
            loading="lazy"
          />
        ) : (
          <div className="music-chart-art music-chart-art-placeholder">
            <span>
              {getMediaIcon(item)}
            </span>
          </div>
        )}

        <span
          className="music-chart-art-play"
          aria-hidden="true"
        >
          ▶
        </span>
      </button>

      <button
        type="button"
        className="music-chart-main"
        onClick={() => onOpen(item)}
      >
        <div className="music-chart-title-row">
          <h3>{item.title}</h3>

          <span className="music-chart-media-type">
            {getMediaIcon(item)}{" "}
            {video ? "Video" : "Music"}
          </span>
        </div>

        <p className="music-chart-creator">
          {item.creator}
        </p>

        <div className="music-chart-meta">
          <span>
            {formatType(item.type)}
          </span>

          {item.duration && (
            <>
              <span aria-hidden="true">
                •
              </span>

              <span>
                {item.duration}
              </span>
            </>
          )}

          <span aria-hidden="true">
            •
          </span>

          <strong>
            {formatPlays(item.plays)} plays
          </strong>
        </div>

        <div
          className="music-chart-progress"
          aria-hidden="true"
        >
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </button>

      <div className="music-chart-price">
        {item.price !== null &&
        item.price > 0 ? (
          <span className="music-chart-paid">
            {formatMusicPrice(item.price)}
          </span>
        ) : (
          <span className="music-chart-free">
            FREE
          </span>
        )}
      </div>

      <button
        type="button"
        className="music-chart-open"
        onClick={() => onOpen(item)}
        aria-label={`View ${item.title}`}
      >
        →
      </button>
    </article>
  );
}