import type { ChartTab } from "../../utils/musicCharts";

interface ChartTabsProps {
  tab: ChartTab;
  onChange: (tab: ChartTab) => void;
  totalCount: number;
  musicCount: number;
  videoCount: number;
}

export default function ChartTabs({
  tab,
  onChange,
  totalCount,
  musicCount,
  videoCount,
}: ChartTabsProps) {
  return (
    <div
      className="music-chart-tabs"
      role="tablist"
      aria-label="Chart category"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "all"}
        className={
          tab === "all"
            ? "is-active"
            : ""
        }
        onClick={() => onChange("all")}
      >
        🔥 All
        <span>{totalCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={tab === "music"}
        className={
          tab === "music"
            ? "is-active"
            : ""
        }
        onClick={() => onChange("music")}
      >
        🎵 Music
        <span>{musicCount}</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={
          tab === "videos"
        }
        className={
          tab === "videos"
            ? "is-active"
            : ""
        }
        onClick={() =>
          onChange("videos")
        }
      >
        🎬 Videos
        <span>{videoCount}</span>
      </button>
    </div>
  );
}