import { Link, useNavigate } from "react-router-dom";

import ChartPodium from "../components/charts/ChartPodium";
import ChartRow from "../components/charts/ChartRow";
import ChartSkeleton from "../components/charts/ChartSkeleton";
import ChartTabs from "../components/charts/ChartTabs";
import ChartsHero from "../components/charts/ChartsHero";

import { useMusicCharts } from "../hooks/useMusicCharts";
import { getChartSectionLabel } from "../utils/musicCharts";

import "../styles/Music.scss";
import "../styles/MusicCharts.scss";

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

          <h2>
            What's performing now
          </h2>

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
        <section
          className="music-error"
          role="alert"
        >
          <div>
            <strong>
              Charts could not be loaded
            </strong>

            <p>
              {error}
            </p>
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
          {Array.from({ length: 8 }).map((_, index) => (
            <ChartSkeleton key={index} />
          ))}
        </section>
      ) : filteredItems.length === 0 ? (
        <section className="music-empty-state">
          <div
            className="music-empty-state-icon"
            aria-hidden="true"
          >
            🏆
          </div>

          <h2>
            No charting content yet
          </h2>

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
          <ChartPodium
            items={topThree}
            onOpen={handleOpen}
          />

          <section className="music-charts-list-section">
            <div className="music-section-heading">
              <div>
                <span className="music-section-eyebrow">
                  {getChartSectionLabel(tab)}
                </span>

                <h2>
                  Full Chart
                </h2>
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