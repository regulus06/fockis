/**
 * MediaDirectoryPage.tsx — /news/directory — discover media organizations.
 */

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2, ExternalLink, MapPin, Plus, Search } from "lucide-react";

import NewsShell from "./NewsShell";
import { Empty, FollowControl, OutletLogo, Skeleton, Thumb, Verified, useToast } from "./NewsParts";
import { LANGUAGE_LABELS, MEDIA_TYPE_LABELS, compact, newsApi, newsError, type OutletCard } from "./newsApi";

export default function MediaDirectoryPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const type = params.get("type") ?? "";
  const sort = params.get("sort") ?? "followers";
  const [q, setQ] = useState(params.get("q") ?? "");
  const [country, setCountry] = useState(params.get("country") ?? "");
  const [language, setLanguage] = useState(params.get("language") ?? "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: OutletCard[]; total: number; counts: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
  };

  useEffect(() => setPage(1), [params]);
  useEffect(() => {
    let alive = true;
    setError(null);
    newsApi
      .directory({ type: type || undefined, q: params.get("q") || undefined, country: params.get("country") || undefined, language: params.get("language") || undefined, verified: params.get("verified") || undefined, sort, page })
      .then((r) => alive && setData((prev) => (page > 1 && prev ? { ...r, items: [...prev.items, ...r.items] } : r)))
      .catch((err) => alive && setError(newsError(err, "The directory could not be loaded.")));
    return () => {
      alive = false;
    };
  }, [params, type, sort, page]);

  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <NewsShell compactHeader>
      <header className="nm-pagehead nm-pagehead--split">
        <div>
          <h1>
            <Building2 /> Media Directory
          </h1>
          <p>Newspapers, TV channels, radio stations, magazines, podcasts and independent journalists on Fockis.</p>
        </div>
        <Link to="/news/create" className="nm-btn nm-btn--red">
          <Plus /> Create a Media
        </Link>
      </header>

      <div className="nm-tabs" role="tablist" aria-label="Media types">
        <button type="button" role="tab" aria-selected={!type} className={!type ? "is-on" : ""} onClick={() => set("type", "")}>
          All <span>{total}</span>
        </button>
        {Object.entries(MEDIA_TYPE_LABELS).map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={type === k} className={type === k ? "is-on" : ""} onClick={() => set("type", k)}>
            {l} <span>{data?.counts[k] ?? 0}</span>
          </button>
        ))}
      </div>

      <form
        className="nm-toolbar"
        onSubmit={(ev) => {
          ev.preventDefault();
          const next = new URLSearchParams(params);
          for (const [k, v] of [
            ["q", q],
            ["country", country],
            ["language", language],
          ] as const)
            v ? next.set(k, v) : next.delete(k);
          setParams(next, { replace: true });
        }}
      >
        <label className="nm-searchbox">
          <Search aria-hidden="true" />
          <input value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Search media by name…" aria-label="Search media" />
        </label>
        <input className="nm-input" value={country} onChange={(ev) => setCountry(ev.target.value)} placeholder="Country" aria-label="Country" />
        <select className="nm-input" value={language} onChange={(ev) => setLanguage(ev.target.value)} aria-label="Language">
          <option value="">All languages</option>
          {Object.entries(LANGUAGE_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select className="nm-input" value={sort} onChange={(ev) => set("sort", ev.target.value)} aria-label="Sort">
          <option value="followers">Most followed</option>
          <option value="newest">Newest</option>
          <option value="name">Name A–Z</option>
        </select>
        <label className="nm-check">
          <input type="checkbox" checked={params.get("verified") === "true"} onChange={(ev) => set("verified", ev.target.checked ? "true" : "")} /> Verified only
        </label>
        <button type="submit" className="nm-btn nm-btn--primary">
          Search
        </button>
      </form>

      {error && <Empty title="Not available" text={error} />}
      {!data && !error && (
        <div className="nm-grid3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} h={280} />
          ))}
        </div>
      )}
      {data && data.items.length === 0 && <Empty icon={Building2} title="No media organizations found" text="Try another search, or create your own media." />}
      <div className="nm-grid3">
        {data?.items.map((o) => (
          <article key={o.id} className="nm-dircard">
            <Link to={`/news/${o.slug}`} className="nm-dircard__cover" aria-label={o.name}>
              <Thumb src={o.coverUrl} />
            </Link>
            <div className="nm-dircard__body">
              <OutletLogo outlet={o} size={64} />
              <Link to={`/news/${o.slug}`} className="nm-dircard__name">
                {o.name} {o.verified && <Verified size={17} />}
              </Link>
              <span className="nm-dircard__type">{MEDIA_TYPE_LABELS[o.mediaType] ?? o.mediaType}</span>
              {o.tagline && <p>{o.tagline}</p>}
              <div className="nm-dircard__facts">
                {(o.city || o.country) && (
                  <span>
                    <MapPin /> {[o.city, o.country].filter(Boolean).join(", ")}
                  </span>
                )}
                <span>
                  <b>{compact(o.followerCount)}</b> followers
                </span>
                {o.verified ? <span className="nm-okpill">Verified</span> : <span className="nm-greypill">Not verified</span>}
              </div>
              <div className="nm-dircard__actions">
                <FollowControl outletId={o.id} outletName={o.name} initial={{ isFollowing: o.isFollowing }} notify={toast.show} />
                {o.websiteUrl && (
                  <a href={o.websiteUrl} target="_blank" rel="noreferrer" className="nm-btn nm-btn--ghost">
                    <ExternalLink /> Website
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {data && data.items.length < data.total && (
        <button type="button" className="nm-btn nm-btn--ghost nm-more" onClick={() => setPage((p) => p + 1)}>
          Load more
        </button>
      )}
      {toast.node}
    </NewsShell>
  );
}
