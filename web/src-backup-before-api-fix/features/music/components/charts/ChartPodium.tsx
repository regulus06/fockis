import {
  getAccentClass,
  getMediaIcon,
  isVideo,
  formatPlays,
  type ChartItem,
} from "../../utils/musicCharts";

interface ChartPodiumProps {
  items: ChartItem[];
  onOpen: (item: ChartItem) => void;
}

function getMedal(rank: number): string {
  if (rank === 1) {
    return "👑";
  }

  if (rank === 2) {
    return "🥈";
  }

  return "🥉";
}

export default function ChartPodium({
  items,
  onOpen,
}: ChartPodiumProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="music-charts-top">
      <div className="music-section-heading">
        <div>
          <span className="music-section-eyebrow">
            TOP PERFORMERS
          </span>

          <h2>
            The Top 3
          </h2>
        </div>
      </div>

      <div className="music-charts-podium">
        {items.map((item) => {
          const video = isVideo(item);

          return (
            <button
              type="button"
              className={`music-chart-podium-card ${getAccentClass(
                item.rank,
              )}`}
              key={item.id}
              onClick={() => onOpen(item)}
            >
              <span className="music-chart-podium-rank">
                #{item.rank}
              </span>

              <div className="music-chart-podium-art">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span>
                    {getMediaIcon(item)}
                  </span>
                )}

                <i aria-hidden="true">
                  {getMedal(item.rank)}
                </i>
              </div>

              <div className="music-chart-podium-info">
                <h3>{item.title}</h3>

                <p>
                  {item.creator}
                </p>

                <strong>
                  {formatPlays(
                    item.plays,
                  )}{" "}
                  plays
                </strong>
              </div>

              <span className="music-chart-podium-type">
                {getMediaIcon(item)}{" "}
                {video
                  ? "Video"
                  : "Music"}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}