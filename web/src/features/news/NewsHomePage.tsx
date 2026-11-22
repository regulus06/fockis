/**
 * NewsHomePage.tsx — /news — central Fockis News.
 * Everything shown comes from published articles distributed to Fockis News.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  CalendarDays,
  Clock,
  Cpu,
  Eye,
  Globe2,
  GraduationCap,
  Headphones,
  LayoutGrid,
  Landmark,
  MapPin,
  Music4,
  Play,
  SlidersHorizontal,
  Trophy,
  TrendingUp,
  Video,
  X,
} from "lucide-react";

import NewsShell, { PulseMark } from "./NewsShell";
import NewsRail from "./NewsRail";
import { ArticleRowItem, ArticleTile, CategoryTag, Empty, SectionHead, Skeleton, Thumb, useToast } from "./NewsParts";
import { CATEGORY_LABELS, LANGUAGE_LABELS, MEDIA_TYPE_LABELS, articlePath, compact, fmtDate, newsApi, newsError, timeAgo, type MediaItemCard, type NewsFilters, type NewsHome } from "./newsApi";

const CHIPS: { id: string; label: string; icon: typeof LayoutGrid; to: string }[] = [
  { id: "", label: "All News", icon: LayoutGrid, to: "/news" },
  { id: "politics", label: "Politics", icon: Landmark, to: "/news/category/politics" },
  { id: "business", label: "Business", icon: Briefcase, to: "/news/category/business" },
  { id: "technology", label: "Technology", icon: Cpu, to: "/news/category/technology" },
  { id: "international", label: "World", icon: Globe2, to: "/news/category/international" },
  { id: "sports", label: "Sports", icon: Trophy, to: "/news/category/sports" },
  { id: "culture", label: "Culture", icon: Music4, to: "/news/category/culture" },
  { id: "videos", label: "Videos", icon: Video, to: "/news/videos" },
];

const FILTER_KEYS = ["country", "city", "language", "mediaType", "outlet", "from", "to"] as const;

export function FilterBar({ value, onChange }: { value: NewsFilters; onChange: (f: NewsFilters) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NewsFilters>(value);
  useEffect(() => setDraft(value), [value]);
  const active = FILTER_KEYS.filter((k) => value[k]);
  return (
    <div className="nm-filters">
      <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <SlidersHorizontal /> Filters{active.length ? ` (${active.length})` : ""}
      </button>
      {active.map((k) => (
        <span key={k} className="nm-chip">
          {k === "language" ? LANGUAGE_LABELS[value[k]!] : k === "mediaType" ? MEDIA_TYPE_LABELS[value[k]!] : value[k]}
          <button type="button" aria-label={`Remove ${k} filter`} onClick={() => onChange({ ...value, [k]: undefined })}>
            <X />
          </button>
        </span>
      ))}
      {open && (
        <form
          className="nm-filters__panel"
          onSubmit={(ev) => {
            ev.preventDefault();
            onChange(draft);
            setOpen(false);
          }}
        >
          <label>
            Country
            <input className="nm-input" value={draft.country ?? ""} onChange={(ev) => setDraft({ ...draft, country: ev.target.value || undefined })} placeholder="Haiti" />
          </label>
          <label>
            City
            <input className="nm-input" value={draft.city ?? ""} onChange={(ev) => setDraft({ ...draft, city: ev.target.value || undefined })} placeholder="Ouanaminthe" />
          </label>
          <label>
            Language
            <select className="nm-input" value={draft.language ?? ""} onChange={(ev) => setDraft({ ...draft, language: ev.target.value || undefined })}>
              <option value="">Any</option>
              {Object.entries(LANGUAGE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Media type
            <select className="nm-input" value={draft.mediaType ?? ""} onChange={(ev) => setDraft({ ...draft, mediaType: ev.target.value || undefined })}>
              <option value="">Any</option>
              {Object.entries(MEDIA_TYPE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label>
            Media organization
            <input className="nm-input" value={draft.outlet ?? ""} onChange={(ev) => setDraft({ ...draft, outlet: ev.target.value.trim().toLowerCase() || undefined })} placeholder="media address, e.g. ouanamintheview" />
          </label>
          <label>
            From
            <input className="nm-input" type="date" value={draft.from ?? ""} onChange={(ev) => setDraft({ ...draft, from: ev.target.value || undefined })} />
          </label>
          <label>
            To
            <input className="nm-input" type="date" value={draft.to ?? ""} onChange={(ev) => setDraft({ ...draft, to: ev.target.value || undefined })} />
          </label>
          <div className="nm-filters__actions">
            <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => onChange({})}>
              Clear
            </button>
            <button type="submit" className="nm-btn nm-btn--primary nm-btn--sm">
              Apply
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function useUrlFilters(): [NewsFilters, (f: NewsFilters) => void] {
  const [params, setParams] = useSearchParams();
  const value = useMemo(() => {
    const f: NewsFilters = {};
    for (const k of FILTER_KEYS) {
      const v = params.get(k);
      if (v) f[k] = v;
    }
    const q = params.get("q");
    if (q) f.q = q;
    return f;
  }, [params]);
  const set = (f: NewsFilters) => {
    const next = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v) next.set(k, String(v));
    setParams(next, { replace: true });
  };
  return [value, set];
}

export function VideoCard({ v }: { v: MediaItemCard }) {
  return (
    <Link to={v.outlet ? `/news/${v.outlet.slug}?tab=${v.kind === "podcast" ? "podcasts" : "videos"}&item=${v.id}` : "/news/videos"} className="nm-vcard">
      <span className="nm-vcard__media">
        <Thumb src={v.thumbnailUrl} />
        <span className="nm-vcard__play" aria-hidden="true">
          {v.kind === "podcast" ? <Headphones /> : <Play />}
        </span>
        {v.durationSec ? <span className="nm-vcard__dur">{Math.floor(v.durationSec / 60)}:{String(v.durationSec % 60).padStart(2, "0")}</span> : null}
      </span>
      <b>{v.title}</b>
      <small>
        {v.outlet?.name ?? ""}
        {v.showName ? ` · ${v.showName}` : ""} · {timeAgo(v.publishedAt)}
      </small>
    </Link>
  );
}

export default function NewsHomePage() {
  const toast = useToast();
  const [filters, setFilters] = useUrlFilters();
  const [home, setHome] = useState<NewsHome | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    newsApi
      .home(filters)
      .then((h) => alive && setHome(h))
      .catch((err) => alive && setError(newsError(err, "The news could not be loaded.")));
    return () => {
      alive = false;
    };
  }, [filters]);

  const ticker = home ? (home.breaking.length ? home.breaking : home.trending).slice(0, 6) : [];
  const hasAnything = Boolean(home && (home.top || home.latest.length));
  const sections: [keyof NewsHome["sections"], string, string][] = [
    ["local", "Local News", "/news/category/local"],
    ["politics", "Politics", "/news/category/politics"],
    ["business", "Business & Economy", "/news/category/business"],
    ["education", "Education", "/news/category/education"],
    ["sports", "Sports", "/news/category/sports"],
    ["technology", "Technology", "/news/category/technology"],
    ["culture", "Culture & Entertainment", "/news/category/culture"],
    ["international", "International News", "/news/category/international"],
  ];

  return (
    <NewsShell rail={<NewsRail topMedia={home?.topMedia ?? null} live={home?.live ?? null} notify={toast.show} />}>
      {/* Trending / breaking ticker */}
      <div className="nm-ticker" aria-label={home?.breaking.length ? "Breaking news" : "Trending"}>
        <span className="nm-ticker__label">{home?.breaking.length ? "BREAKING" : "TRENDING"}</span>
        <div className="nm-ticker__track">
          {ticker.length === 0 && <span className="nm-muted">{home ? "Stories will appear here as media organizations publish." : "Loading…"}</span>}
          {ticker.map((a) => (
            <Link key={a.id} to={articlePath(a)}>
              {a.headline}
            </Link>
          ))}
        </div>
        {home && home.live.some((l) => l.kind === "tv") && (
          <Link to="/news/live" className="nm-ticker__live">
            <span className="nm-live-dot" /> LIVE TV
          </Link>
        )}
      </div>

      <FilterBar value={filters} onChange={setFilters} />

      {error && <Empty title="The news could not be loaded" text={error} />}

      {!home && !error && (
        <div className="nm-hero">
          <Skeleton h={380} className="nm-hero__intro" />
          <Skeleton h={380} />
          <div className="nm-hero__list">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} h={86} />
            ))}
          </div>
        </div>
      )}

      {home && !hasAnything && (
        <Empty
          title="No news published yet"
          text={Object.keys(filters).length ? "No published stories match these filters." : "When media organizations publish articles to Fockis News, they appear here."}
          action={
            <Link to="/news/create" className="nm-btn nm-btn--red">
              Create a Media <ArrowRight />
            </Link>
          }
        />
      )}

      {home && hasAnything && (
        <>
          {/* Hero: intro · top story · top headlines */}
          <section className={`nm-hero${home.headlines.length ? "" : " nm-hero--wide"}`} aria-label="Top stories">
            <div className="nm-hero__intro">
              <h1>Breaking News &amp; Timely Updates</h1>
              <PulseMark />
              <p>Stay informed with the latest headlines, expert analysis and real-time updates from Haiti and around the world.</p>
              <Link to="/news/latest" className="nm-btn nm-btn--red">
                Read Latest News <ArrowRight />
              </Link>
            </div>
            {home.top && (
              <Link to={articlePath(home.top)} className="nm-topstory">
                <Thumb src={home.top.imageUrl} />
                <span className="nm-topstory__shade" />
                <span className="nm-topstory__text">
                  <span className="nm-tag-red">TOP STORY</span>
                  <b>{home.top.headline}</b>
                  {(home.top.subtitle || home.top.excerpt) && <span className="nm-topstory__sub">{home.top.subtitle || home.top.excerpt}</span>}
                  <span className="nm-topstory__meta">
                    {home.top.authorName && <span>By {home.top.authorName}</span>}
                    <span>
                      <CalendarDays /> {fmtDate(home.top.publishedAt)}
                    </span>
                    <span>
                      <Clock /> {home.top.readingMinutes} min read
                    </span>
                    {home.top.views > 0 && (
                      <span>
                        <Eye /> {compact(home.top.views)} views
                      </span>
                    )}
                  </span>
                </span>
              </Link>
            )}
            {home.headlines.length > 0 && (
              <div className="nm-hero__list">
                {home.headlines.map((a) => (
                  <ArticleRowItem key={a.id} a={a} compactRow />
                ))}
              </div>
            )}
          </section>

          {/* Category bar */}
          <nav className="nm-catbar" aria-label="Browse by category">
            {CHIPS.map((c) => (
              <Link key={c.label} to={c.to} className={`nm-catbar__item${!c.id ? " is-active" : ""}`}>
                <c.icon aria-hidden="true" /> {c.label}
              </Link>
            ))}
          </nav>

          {home.featured.length > 0 && (
            <section className="nm-section">
              <SectionHead title="Featured Articles" to="/news/trending" label="View All" />
              <div className="nm-grid4">
                {home.featured.map((a) => (
                  <ArticleTile key={a.id} a={a} />
                ))}
              </div>
            </section>
          )}

          <div className="nm-split">
            <section className="nm-section">
              <SectionHead title="Latest News" to="/news/latest" />
              <div className="nm-list">
                {home.latest.slice(0, 8).map((a) => (
                  <ArticleRowItem key={a.id} a={a} />
                ))}
              </div>
            </section>
            {home.trending.length > 0 && (
              <section className="nm-section">
                <SectionHead title="Trending Stories" icon={TrendingUp} to="/news/trending" />
                <ol className="nm-ranked">
                  {home.trending.map((a, i) => (
                    <li key={a.id}>
                      <span className="nm-ranked__n">{i + 1}</span>
                      <Link to={articlePath(a)}>
                        <CategoryTag category={a.category} />
                        <b>{a.headline}</b>
                        <small>
                          {a.outlet?.name} · {compact(a.views)} views
                        </small>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {sections.map(([key, title, to]) =>
            home.sections[key].length ? (
              <section key={key} className="nm-section">
                <SectionHead title={title} to={to} />
                <div className="nm-mosaic">
                  <ArticleTile a={home.sections[key][0]} size="lg" />
                  <div className="nm-mosaic__rest">
                    {home.sections[key].slice(1).map((a) => (
                      <ArticleRowItem key={a.id} a={a} />
                    ))}
                  </div>
                </div>
              </section>
            ) : null,
          )}

          {home.videos.length > 0 && (
            <section className="nm-section nm-section--dark">
              <SectionHead title="Video News" icon={Video} to="/news/videos" />
              <div className="nm-grid4">
                {home.videos.slice(0, 8).map((v) => (
                  <VideoCard key={v.id} v={v} />
                ))}
              </div>
            </section>
          )}

          {home.podcasts.length > 0 && (
            <section className="nm-section">
              <SectionHead title="Podcasts" icon={Headphones} to="/news/podcasts" />
              <div className="nm-grid3">
                {home.podcasts.map((v) => (
                  <VideoCard key={v.id} v={v} />
                ))}
              </div>
            </section>
          )}

          <section className="nm-section">
            <SectionHead title="Browse by category" icon={BookOpen} />
            <div className="nm-catcloud">
              {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                <Link key={k} to={`/news/category/${k}`} className="nm-chip nm-chip--link">
                  {k === "local" && <MapPin />}
                  {k === "education" && <GraduationCap />}
                  {l}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
      {toast.node}
    </NewsShell>
  );
}
