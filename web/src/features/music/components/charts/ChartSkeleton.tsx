export default function ChartSkeleton() {
  return (
    <div
      className="music-chart-skeleton"
      aria-hidden="true"
    >
      <div className="music-chart-skeleton-rank" />

      <div className="music-chart-skeleton-art" />

      <div className="music-chart-skeleton-content">
        <div className="music-skeleton-line music-skeleton-line-title" />

        <div className="music-skeleton-line music-skeleton-line-small" />

        <div className="music-skeleton-line music-skeleton-line-bar" />
      </div>
    </div>
  );
}