/**
 * NewsListPage.tsx — Latest, Breaking, Trending, a category, Videos, Live TV,
 * Radio and Podcasts on central Fockis News.
 */

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Headphones, Play, Radio as RadioIcon, Tv, Video } from "lucide-react";

import NewsShell from "./NewsShell";
import NewsRail from "./NewsRail";
import { FilterBar, VideoCard, useUrlFilters } from "./NewsHomePage";
import { ArticleTile, Empty, OutletLogo, Skeleton, Verified, useToast } from "./NewsParts";
import { CATEGORY_LABELS, newsApi, newsError, type ArticleCard, type LiveEntry, type MediaItemCard, type OutletCard } from "./newsApi";

type Mode = "latest" | "breaking" | "trending" | "category" | "videos" | "live" | "radio" | "podcasts";

const TITLES: Record<Mode, string> = {
  latest: "Latest News",
  breaking: "Breaking News",
  trending: "Trending Stories",
  category: "",
  videos: "Videos",
  live: "Live TV",
  radio: "Radio",
  podcasts: "Podcasts",
};

export default function NewsListPage({ mode }: { mode: Mode }) {
  const { category = "" } = useParams<{ category: string }>();
  const toast = useToast();
  const [filters, setFilters] = useUrlFilters();
  const [page, setPage] = useState(1);
  const [articles, setArticles] = useState<{ items: ArticleCard[]; total: number } | null>(null);
  const [items, setItems] = useState<{ items: MediaItemCard[]; total: number } | null>(null);
  const [live, setLive] = useState<LiveEntry[] | null>(null);
  const [top, setTop] = useState<OutletCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPage(1), [mode, category, filters]);

  useEffect(() => {
    let alive = true;
    setError(null);
    const fail = (err: unknown) => alive && setError(newsError(err, "This page could not be loaded."));
    if (mode === "live" || mode === "radio") {
      setLive(null);
      newsApi.live().then((l) => alive && setLive(l)).catch(fail);
      setItems(null);
      newsApi
        .media(mode === "live" ? "tv_program" : "radio_program", 1)
        .then((r) => alive && setItems(r))
        .catch(() => undefined);
    } else if (mode === "podcasts" || mode === "videos") {
      setItems(null);
      newsApi
        .media(mode === "podcasts" ? "podcast" : "video", page)
        .then((r) => alive && setItems((prev) => (page > 1 && prev ? { total: r.total, items: [...prev.items, ...r.items] } : r)))
        .catch(fail);
      if (mode === "videos") newsApi.articles({ ...filters, section: "videos", page: 1 }).then((r) => alive && setArticles(r)).catch(() => undefined);
    } else {
      if (page === 1) setArticles(null);
      newsApi
        .articles({ ...filters, section: mode === "category" ? undefined : mode, category: mode === "category" ? category : filters.category, page })
        .then((r) => alive && setArticles((prev) => (page > 1 && prev ? { total: r.total, items: [...prev.items, ...r.items] } : r)))
        .catch(fail);
    }
    return () => {
      alive = false;
    };
  }, [mode, category, filters, page]);

  useEffect(() => {
    newsApi.topMedia().then(setTop).catch(() => setTop([]));
    if (mode !== "live" && mode !== "radio") newsApi.live().then(setLive).catch(() => setLive([]));
  }, [mode]);

  const title = mode === "category" ? CATEGORY_LABELS[category] ?? "News" : TITLES[mode];
  const liveRows = (live ?? []).filter((l) => (mode === "radio" ? l.kind === "radio" : mode === "live" ? l.kind === "tv" : true));

  return (
    <NewsShell compactHeader rail={<NewsRail topMedia={top} live={live} notify={toast.show} />}>
      <header className="nm-pagehead">
        <h1>
          {mode === "live" && <Tv />}
          {mode === "radio" && <RadioIcon />}
          {mode === "videos" && <Video />}
          {mode === "podcasts" && <Headphones />}
          {title}
          {filters.q ? <small> · results for “{filters.q}”</small> : null}
        </h1>
      </header>

      {!["live", "radio", "podcasts"].includes(mode) && <FilterBar value={filters} onChange={setFilters} />}
      {error && <Empty title="Not available" text={error} />}

      {(mode === "live" || mode === "radio") && (
        <>
          {!live && <Skeleton h={220} />}
          {live && liveRows.length === 0 && <Empty icon={mode === "radio" ? RadioIcon : Tv} title={mode === "radio" ? "No radio station is live right now" : "No channel is live right now"} text="Live broadcasts from media organizations appear here." />}
          <div className="nm-grid3">
            {liveRows.map((l) => (
              <Link key={`${l.outlet.id}-${l.kind}`} to={`/news/${l.outlet.slug}?tab=${l.kind === "tv" ? "live" : "radio"}`} className="nm-livewide">
                <span className="nm-livewide__art">
                  {l.outlet.coverUrl && <img src={l.outlet.coverUrl} alt="" />}
                  <span className="nm-livecard__play">
                    <Play />
                  </span>
                  <span className="nm-livetag nm-livetag--abs">
                    <span className="nm-live-dot" /> LIVE
                  </span>
                </span>
                <span className="nm-livewide__who">
                  <OutletLogo outlet={l.outlet} size={34} />
                  <span>
                    <b>
                      {l.outlet.name} {l.outlet.verified && <Verified size={14} />}
                    </b>
                    <small>{l.title}</small>
                  </span>
                </span>
              </Link>
            ))}
          </div>
          {items && items.items.length > 0 && (
            <section className="nm-section">
              <h2 className="nm-h2">Programs</h2>
              <div className="nm-schedule">
                {items.items.map((p) => (
                  <div key={p.id} className="nm-schedule__row">
                    <b>{p.schedule?.startTime ?? ""}</b>
                    <span>
                      <strong>{p.title}</strong>
                      <small>
                        {p.outlet?.name}
                        {p.presenters.length ? ` · with ${p.presenters.join(", ")}` : ""} · {(p.schedule?.days ?? []).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
                      </small>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {(mode === "videos" || mode === "podcasts") && (
        <>
          {!items && !error && <Skeleton h={220} />}
          {items && items.items.length === 0 && (!articles || articles.items.length === 0) && <Empty icon={mode === "podcasts" ? Headphones : Video} title={`No ${mode} yet`} text="Published videos and podcast episodes appear here." />}
          <div className="nm-grid4">
            {items?.items.map((v) => (
              <VideoCard key={v.id} v={v} />
            ))}
          </div>
          {items && items.items.length < items.total && (
            <button type="button" className="nm-btn nm-btn--ghost nm-more" onClick={() => setPage((p) => p + 1)}>
              Load more
            </button>
          )}
          {mode === "videos" && articles && articles.items.length > 0 && (
            <section className="nm-section">
              <h2 className="nm-h2">Video reports</h2>
              <div className="nm-grid4">
                {articles.items.map((a) => (
                  <ArticleTile key={a.id} a={a} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {!["live", "radio", "videos", "podcasts"].includes(mode) && (
        <>
          {!articles && !error && (
            <div className="nm-grid3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} h={260} />
              ))}
            </div>
          )}
          {articles && articles.items.length === 0 && <Empty title="No stories yet" text="Published stories that match will appear here." />}
          {articles && articles.items.length > 0 && (
            <div className="nm-grid3">
              {articles.items.map((a, i) => (
                <ArticleTile key={a.id} a={a} size={i === 0 && page === 1 ? "lg" : "md"} />
              ))}
            </div>
          )}
          {articles && articles.items.length < articles.total && (
            <button type="button" className="nm-btn nm-btn--ghost nm-more" onClick={() => setPage((p) => p + 1)}>
              Load more
            </button>
          )}
        </>
      )}
      {toast.node}
    </NewsShell>
  );
}
