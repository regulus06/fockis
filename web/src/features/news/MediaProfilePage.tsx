/**
 * MediaProfilePage.tsx — /news/:slug — a media organization's public profile.
 */

import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  ExternalLink,
  Eye,
  CalendarDays,
  FileText,
  Handshake,
  Heart,
  Headphones,
  Mail,
  MapPin,
  Megaphone,
  MessageSquare,
  Mic,
  PencilLine,
  Phone,
  Radio as RadioIcon,
  Send,
  Settings2,
  Share2,
  ShieldAlert,
  Tv,
  Users,
} from "lucide-react";

import NewsShell from "./NewsShell";
import { VideoCard } from "./NewsHomePage";
import { ArticleRowItem, ArticleTile, CategoryTag, Empty, FollowControl, OutletLogo, Skeleton, Thumb, Verified, useToast } from "./NewsParts";
import { LANGUAGE_LABELS, MEDIA_TYPE_LABELS, REQUEST_TYPES, articlePath, compact, fmtDate, money, newsApi, newsError, type ArticleCard, type MediaItemCard, type MediaProfile } from "./newsApi";

const TABS = [
  ["home", "Home"],
  ["articles", "Articles"],
  ["videos", "Videos"],
  ["live", "Live TV"],
  ["radio", "Radio"],
  ["podcasts", "Podcasts"],
  ["about", "About"],
] as const;

const REQUEST_ICONS: Record<string, typeof Send> = {
  coverage: PencilLine,
  interview: Mic,
  news_tip: Send,
  story: FileText,
  advertising: Megaphone,
  partnership: Handshake,
  correction: ShieldAlert,
  general: Mail,
};

export function StreamPlayer({ kind, url, title }: { kind: "tv" | "radio"; url: string; title: string }) {
  return (
    <div className={`nm-player nm-player--${kind}`}>
      {kind === "tv" ? <video src={url} controls autoPlay muted playsInline title={title} /> : <audio src={url} controls autoPlay title={title} />}
      <span className="nm-livetag nm-livetag--abs">
        <span className="nm-live-dot" /> LIVE
      </span>
    </div>
  );
}

export default function MediaProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some(([t]) => t === params.get("tab")) ? params.get("tab") : "home") as (typeof TABS)[number][0];
  const toast = useToast();
  const [p, setP] = useState<MediaProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [articles, setArticles] = useState<{ items: ArticleCard[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItemCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    setP(null);
    setError(null);
    newsApi
      .profile(slug)
      .then((r) => {
        if (!alive) return;
        setP(r);
        document.title = `${r.name} · Fockis News`;
      })
      .catch((err) => alive && setError(newsError(err, "This media organization was not found.")));
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!p || !["home", "articles"].includes(tab)) return;
    let alive = true;
    newsApi
      .outletArticles(slug, { page })
      .then((r) => alive && setArticles((prev) => (page > 1 && prev ? { total: r.total, items: [...prev.items, ...r.items] } : r)))
      .catch(() => alive && setArticles({ items: [], total: 0 }));
    return () => {
      alive = false;
    };
  }, [p, slug, tab, page]);

  useEffect(() => {
    if (!p) return;
    const kind = tab === "videos" ? "video" : tab === "podcasts" ? "podcast" : tab === "live" ? "tv_program" : tab === "radio" ? "radio_program" : null;
    if (!kind) return;
    setItems(null);
    newsApi
      .media(kind, 1, slug)
      .then((r) => setItems(r.items))
      .catch(() => setItems([]));
  }, [p, slug, tab]);

  async function share() {
    const url = window.location.origin + `/news/${slug}`;
    try {
      if (navigator.share) await navigator.share({ title: p?.name, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.show("ok", "Link copied.");
      }
    } catch {
      /* cancelled */
    }
  }

  if (error)
    return (
      <NewsShell compactHeader>
        <Empty title="Media not found" text={error} action={<Link to="/news/directory" className="nm-btn nm-btn--primary">Open the Media Directory</Link>} />
      </NewsShell>
    );

  const featured = articles?.items[0];
  const rest = articles?.items.slice(1, 4) ?? [];

  return (
    <NewsShell compactHeader>
      {!p && (
        <>
          <Skeleton h={240} />
          <Skeleton h={120} />
        </>
      )}
      {p && (
        <>
          <section className="nm-profile">
            <div className="nm-profile__cover">
              <Thumb src={p.coverUrl} alt="" />
            </div>
            <div className="nm-profile__bar">
              <span className="nm-profile__logo">
                <OutletLogo outlet={p} size={132} />
              </span>
              <div className="nm-profile__id">
                <h1>
                  {p.name} {p.verified && <Verified size={26} />}
                </h1>
                <p className="nm-profile__type">
                  {MEDIA_TYPE_LABELS[p.mediaType] ?? p.mediaType}
                  {(p.city || p.country) && <> · {[p.city, p.country].filter(Boolean).join(", ")}</>}
                </p>
                {p.tagline && <p className="nm-profile__tagline">{p.tagline}</p>}
                <p className="nm-profile__stats">
                  <span>
                    <Users /> <b>{compact(p.followerCount)}</b> Followers
                  </span>
                  <span>
                    <FileText /> <b>{compact(p.publishedArticles)}</b> Articles
                  </span>
                  {p.foundedYear && (
                    <span>
                      <CalendarDays /> Since {p.foundedYear}
                    </span>
                  )}
                </p>
              </div>
              <div className="nm-profile__actions">
                <FollowControl outletId={p.id} outletName={p.name} initial={p.viewer} withBell notify={toast.show} />
                {p.donationsEnabled && (
                  <Link to={`/news/${p.slug}/support`} className="nm-btn nm-btn--red">
                    Support <Heart />
                  </Link>
                )}
                {p.requestsEnabled && (
                  <Link to={`/news/${p.slug}/contact`} className="nm-btn nm-btn--ghost">
                    <Mail /> Contact
                  </Link>
                )}
                {p.websiteUrl && (
                  <a href={p.websiteUrl} target="_blank" rel="noreferrer" className="nm-btn nm-btn--ghost">
                    <ExternalLink /> Website
                  </a>
                )}
                <button type="button" className="nm-iconbtn nm-iconbtn--ring" onClick={share} aria-label="Share media profile">
                  <Share2 />
                </button>
                {p.viewer.canManage && (
                  <Link to={`/news/admin/${p.id}`} className="nm-btn nm-btn--navy">
                    <Settings2 /> Manage
                  </Link>
                )}
              </div>
            </div>
            <nav className="nm-profile__tabs" role="tablist" aria-label={`${p.name} sections`}>
              {TABS.map(([t, label]) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? "is-on" : ""}
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    if (t === "home") next.delete("tab");
                    else next.set("tab", t);
                    setParams(next, { replace: true });
                  }}
                >
                  {t === "live" && p.liveInfo.tvLive && <span className="nm-live-dot" />}
                  {t === "radio" && p.liveInfo.radioLive && <span className="nm-live-dot" />}
                  {label}
                </button>
              ))}
            </nav>
          </section>

          <div className="nm-profile__body">
            <div className="nm-profile__main">
              {tab === "home" && (
                <section className="nm-box nm-box--flat">
                  <h2 className="nm-h2">Latest from {p.name}</h2>
                  {!articles && <Skeleton h={260} />}
                  {articles && articles.items.length === 0 && <Empty title="No articles yet" text={`${p.name} hasn't published any articles yet.`} />}
                  {featured && (
                    <div className="nm-latestgrid">
                      <Link to={articlePath(featured)} className="nm-feature">
                        <span className="nm-feature__media">
                          <Thumb src={featured.imageUrl} />
                          <span className="nm-tile__badge">
                            <CategoryTag category={featured.category} solid />
                          </span>
                        </span>
                        <b>{featured.headline}</b>
                        <span className="nm-meta">
                          <span>
                            <CalendarDays /> {fmtDate(featured.publishedAt)}
                          </span>
                          {featured.views > 0 && (
                            <span>
                              <Eye /> {compact(featured.views)} views
                            </span>
                          )}
                        </span>
                      </Link>
                      <div className="nm-list">
                        {rest.map((a) => (
                          <ArticleRowItem key={a.id} a={{ ...a, outlet: null }} />
                        ))}
                      </div>
                    </div>
                  )}
                  {articles && articles.items.length > 4 && (
                    <div className="nm-grid3 nm-mt">
                      {articles.items.slice(4, 10).map((a) => (
                        <ArticleTile key={a.id} a={{ ...a, outlet: null }} size="sm" />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {tab === "articles" && (
                <section>
                  {!articles && <Skeleton h={260} />}
                  {articles && articles.items.length === 0 && <Empty title="No articles yet" />}
                  <div className="nm-grid3">
                    {articles?.items.map((a) => (
                      <ArticleTile key={a.id} a={{ ...a, outlet: null }} />
                    ))}
                  </div>
                  {articles && articles.items.length < articles.total && (
                    <button type="button" className="nm-btn nm-btn--ghost nm-more" onClick={() => setPage((x) => x + 1)}>
                      Load more
                    </button>
                  )}
                </section>
              )}

              {(tab === "videos" || tab === "podcasts") && (
                <section>
                  {!items && <Skeleton h={220} />}
                  {items && items.length === 0 && <Empty icon={tab === "podcasts" ? Headphones : Tv} title={tab === "podcasts" ? "No podcast episodes yet" : "No videos yet"} />}
                  {items && items.length > 0 && params.get("item") && (() => {
                    const it = items.find((x) => x.id === params.get("item"));
                    return it ? (
                      <div className="nm-box nm-box--flat">
                        <h2 className="nm-h2">{it.title}</h2>
                        {it.kind === "video" ? <video className="nm-video" src={it.mediaUrl} poster={it.thumbnailUrl || undefined} controls playsInline /> : <audio className="nm-audio" src={it.mediaUrl} controls />}
                        {it.description && <p className="nm-pre">{it.description}</p>}
                      </div>
                    ) : null;
                  })()}
                  <div className="nm-grid3">
                    {items?.map((v) => (
                      <VideoCard key={v.id} v={v} />
                    ))}
                  </div>
                </section>
              )}

              {(tab === "live" || tab === "radio") && (
                <section className="nm-box nm-box--flat">
                  {tab === "live" && p.liveInfo.tvLive && <StreamPlayer kind="tv" url={p.liveInfo.tvStreamUrl} title={p.liveInfo.tvTitle || p.name} />}
                  {tab === "radio" && p.liveInfo.radioLive && (
                    <div className="nm-radio">
                      <OutletLogo outlet={p} size={88} />
                      <div>
                        <span className="nm-livetag">
                          <span className="nm-live-dot" /> ON AIR
                        </span>
                        <h2>{p.liveInfo.radioTitle || `${p.name} Live`}</h2>
                        <StreamPlayer kind="radio" url={p.liveInfo.radioStreamUrl} title={p.liveInfo.radioTitle || p.name} />
                      </div>
                    </div>
                  )}
                  {((tab === "live" && !p.liveInfo.tvLive) || (tab === "radio" && !p.liveInfo.radioLive)) && (
                    <Empty icon={tab === "live" ? Tv : RadioIcon} title={`${p.name} is not live right now`} text="Follow and turn on live notifications to know when the broadcast starts." />
                  )}
                  {items && items.length > 0 && (
                    <>
                      <h2 className="nm-h2 nm-mt">Broadcast schedule</h2>
                      <div className="nm-schedule">
                        {items.map((it) => (
                          <div key={it.id} className="nm-schedule__row">
                            <b>
                              {it.schedule?.startTime}
                              {it.schedule?.endTime ? `–${it.schedule.endTime}` : ""}
                            </b>
                            <span>
                              <strong>{it.title}</strong>
                              <small>
                                {(it.schedule?.days ?? []).map((d) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ")}
                                {it.presenters.length ? ` · ${it.presenters.join(", ")}` : ""}
                              </small>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}

              {tab === "about" && (
                <section className="nm-box nm-box--flat">
                  <h2 className="nm-h2">About {p.name}</h2>
                  <p className="nm-pre">{p.about || p.tagline || "No description yet."}</p>
                  <dl className="nm-dl">
                    <dt>Type</dt>
                    <dd>{MEDIA_TYPE_LABELS[p.mediaType]}</dd>
                    {(p.city || p.country) && (
                      <>
                        <dt>Location</dt>
                        <dd>
                          <MapPin /> {[p.address, p.city, p.country].filter(Boolean).join(", ")}
                        </dd>
                      </>
                    )}
                    <dt>Languages</dt>
                    <dd>{[p.primaryLanguage, ...p.languages.filter((l) => l !== p.primaryLanguage)].map((l) => LANGUAGE_LABELS[l] ?? l).join(", ")}</dd>
                    {p.email && (
                      <>
                        <dt>Email</dt>
                        <dd>
                          <a href={`mailto:${p.email}`}>{p.email}</a>
                        </dd>
                      </>
                    )}
                    {p.phone && (
                      <>
                        <dt>Phone</dt>
                        <dd>
                          <Phone /> {p.phone}
                        </dd>
                      </>
                    )}
                    {p.websiteUrl && (
                      <>
                        <dt>Website</dt>
                        <dd>
                          <a href={p.websiteUrl} target="_blank" rel="noreferrer">
                            {p.websiteUrl.replace(/^https?:\/\//, "")}
                          </a>
                        </dd>
                      </>
                    )}
                    <dt>Verification</dt>
                    <dd>{p.verified ? "Officially verified by Fockis" : "Not verified"}</dd>
                  </dl>
                  {Object.keys(p.socials).length > 0 && (
                    <div className="nm-socials">
                      {Object.entries(p.socials).map(([k, url]) => (
                        <a key={k} href={url} target="_blank" rel="noreferrer" className="nm-chip nm-chip--link">
                          {k === "x" ? "X" : k[0].toUpperCase() + k.slice(1)}
                        </a>
                      ))}
                    </div>
                  )}
                  {p.team.length > 0 && (
                    <>
                      <h2 className="nm-h2 nm-mt">Our team</h2>
                      <div className="nm-team">
                        {p.team.map((m, i) => (
                          <div key={i} className="nm-team__person">
                            <OutletLogo outlet={{ name: m.name, logoUrl: m.avatarUrl }} size={56} />
                            <b>{m.name}</b>
                            <small>{m.title}</small>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>

            <aside className="nm-profile__side">
              {p.donationsEnabled && (
                <section className="nm-box">
                  <h2 className="nm-box__title">
                    <span className="nm-heartbox">
                      <Heart />
                    </span>
                    Support {p.name}
                  </h2>
                  <p className="nm-muted">{p.supportMessage || "Your support helps us keep reporting, investigate important stories, and serve our community."}</p>
                  {p.campaigns[0] && (
                    <div className="nm-minicamp">
                      <b>{p.campaigns[0].title}</b>
                      <div className="nm-progress">
                        <span style={{ width: `${p.campaigns[0].progress}%` }} />
                      </div>
                      <small>
                        {money(p.campaigns[0].raised, p.campaigns[0].currency)} of {money(p.campaigns[0].goal, p.campaigns[0].currency)}
                      </small>
                    </div>
                  )}
                  <Link to={`/news/${p.slug}/support`} className="nm-btn nm-btn--red nm-btn--block">
                    Make a Donation →
                  </Link>
                </section>
              )}
              {p.requestsEnabled && (
                <section className="nm-box">
                  <header className="nm-box__head">
                    <h2 className="nm-box__title">
                      <Send /> Send a Request
                    </h2>
                    <Link to={`/news/${p.slug}/contact`} className="nm-seemore">
                      See all →
                    </Link>
                  </header>
                  <ul className="nm-reqlist">
                    {REQUEST_TYPES.slice(0, 5).map((r) => {
                      const Icon = REQUEST_ICONS[r.id] ?? MessageSquare;
                      return (
                        <li key={r.id}>
                          <Link to={`/news/${p.slug}/contact?type=${r.id}`}>
                            <Icon /> <span>{r.label}</span> <ChevronRight />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
      {toast.node}
    </NewsShell>
  );
}

export { REQUEST_ICONS };
