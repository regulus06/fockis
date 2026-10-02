import { Link } from "react-router-dom";

interface ChartsHeroProps {
  chartCount: number;
}

export default function ChartsHero({
  chartCount,
}: ChartsHeroProps) {
  return (
    <section className="music-charts-hero">
      <div className="music-charts-hero-content">
        <span className="music-hero-kicker">
          FOCKIS MUSIC
        </span>

        <h1>
          <span aria-hidden="true">
            🏆
          </span>{" "}
          Fockis Charts
        </h1>

        <p>
          Discover the music and videos
          everyone is watching, listening
          to, and supporting right now.
        </p>

        <div className="music-charts-hero-actions">
          <Link
            to="/music"
            className="music-secondary-button"
          >
            ← Music Home
          </Link>

          <Link
            to="/music/explore"
            className="music-primary-button"
          >
            Explore Everything
          </Link>
        </div>
      </div>

      <div
        className="music-charts-hero-stat"
        aria-label={`${chartCount} charting titles`}
      >
        <strong>{chartCount}</strong>

        <span>
          charting titles
        </span>
      </div>
    </section>
  );
}