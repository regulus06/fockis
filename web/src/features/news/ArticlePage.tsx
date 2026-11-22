/**
 * ArticlePage.tsx — /news/:slug/:articleSlug — reading experience.
 * The body HTML is sanitized on the server (strict allowlist) before storage.
 */

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BellRing,
  BookOpen,
  Bookmark,
  BookmarkCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  Heart,
  Home,
  Link2,
  Loader2,
  MessageCircle,
  Share2,
  Trash2,
} from "lucide-react";

import NewsShell from "./NewsShell";
import { CategoryTag, Empty, FollowControl, OutletLogo, Skeleton, Thumb, Verified, loginPath, signedIn, useToast } from "./NewsParts";
import {
  ARTICLE_STATUS_LABELS,
  CATEGORY_LABELS,
  LANGUAGE_LABELS,
  MEDIA_TYPE_LABELS,
  articlePath,
  compact,
  fmtDate,
  initials,
  newsApi,
  newsError,
  timeAgo,
  type ArticleFull,
  type Comment,
} from "./newsApi";

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * Rich-text editors leave empty paragraphs (<p><br></p>) and runs of <br>,
 * which render as large blank gaps. The body is already sanitized on the
 * server; this only removes empty blocks.
 */
function tidyBody(html: string) {
  return html
    .replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "")
    .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>")
    .replace(/^(?:\s|&nbsp;|<br\s*\/?>)+|(?:\s|&nbsp;|<br\s*\/?>)+$/gi, "");
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** A source "title" that is itself a web address. */
const isUrlText = (t: string) => /^(https?:\/\/|www\.)\S+$/i.test(t.trim());

/** Text shown for a source link: never a web address other than the one the link opens. */
function sourceLabel(s: { title: string; url?: string }) {
  if (!s.url) return s.title;
  if (!s.title || isUrlText(s.title)) return s.url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return s.title;
}

const plural = (n: number, one: string, many = `${one}s`) => `${compact(n)} ${n === 1 ? one : many}`;

export default function ArticlePage() {
  const { slug = "", articleSlug = "" } = useParams<{ slug: string; articleSlug: string }>();
  const toast = useToast();
  const [a, setA] = useState<ArticleFull | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [alerts, setAlerts] = useState<"idle" | "busy" | "on">("idle");

  useEffect(() => {
    let alive = true;
    setA(null);
    setError(null);
    newsApi
      .read(slug, articleSlug)
      .then((r) => {
        if (!alive) return;
        setA(r);
        window.scrollTo({ top: 0 });
      })
      .catch((err) => alive && setError(newsError(err, "This article is not available.")));
    return () => {
      alive = false;
    };
  }, [slug, articleSlug]);

  // SEO: title, description, Open Graph, canonical and NewsArticle structured data.
  useEffect(() => {
    if (!a) return;
    const prevTitle = document.title;
    const title = a.seo.title || a.headline;
    const desc = a.seo.description || a.subtitle || a.excerpt;
    const image = a.seo.shareImage || a.featuredImage?.url || "";
    const url = a.seo.canonicalUrl || `${window.location.origin}/news/${slug}/${articleSlug}`;
    document.title = `${title} · ${a.outletFull.name}`;
    setMeta("description", desc);
    setMeta("og:title", title, "property");
    setMeta("og:description", desc, "property");
    setMeta("og:type", "article", "property");
    setMeta("og:url", url, "property");
    if (image) setMeta("og:image", image, "property");
    setMeta("twitter:card", image ? "summary_large_image" : "summary");
    let canon = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanon = !canon;
    if (!canon) {
      canon = document.createElement("link");
      canon.rel = "canonical";
      document.head.appendChild(canon);
    }
    canon.href = url;
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: a.headline,
      description: desc,
      image: image ? [image] : undefined,
      datePublished: a.publishedAt,
      dateModified: a.updatedAt,
      author: a.authorName ? [{ "@type": "Person", name: a.authorName }] : undefined,
      publisher: { "@type": "Organization", name: a.outletFull.name, logo: a.outletFull.logoUrl ? { "@type": "ImageObject", url: a.outletFull.logoUrl } : undefined },
      mainEntityOfPage: url,
      inLanguage: a.language,
    });
    document.head.appendChild(ld);
    return () => {
      document.title = prevTitle;
      ld.remove();
      if (createdCanon) canon?.remove();
    };
  }, [a, slug, articleSlug]);

  useEffect(() => {
    if (!a || !a.commentsEnabled || a.preview) return;
    newsApi
      .comments(a.id)
      .then((r) => setComments(r.items))
      .catch(() => setComments([]));
  }, [a]);

  async function toggle(kind: "like" | "bookmark") {
    if (!a) return;
    if (!signedIn()) return window.location.assign(loginPath());
    const on = kind === "like" ? !a.viewer.liked : !a.viewer.bookmarked;
    setA({ ...a, likes: kind === "like" ? a.likes + (on ? 1 : -1) : a.likes, viewer: { ...a.viewer, [kind === "like" ? "liked" : "bookmarked"]: on } });
    try {
      await (kind === "like" ? newsApi.like(a.id, on) : newsApi.bookmark(a.id, on));
      if (kind === "bookmark") toast.show("ok", on ? "Saved to your bookmarks." : "Removed from bookmarks.");
    } catch (err) {
      toast.show("error", newsError(err));
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: a?.headline, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.show("ok", "Link copied.");
      }
    } catch {
      /* cancelled */
    }
  }

  const body = useMemo(() => tidyBody(a?.body ?? ""), [a?.body]);

  /** Keeps both Follow buttons (byline and publication card) and the follower count in sync. */
  function onFollowChange(following: boolean) {
    setA((cur) =>
      cur && cur.viewer.following !== following
        ? { ...cur, viewer: { ...cur.viewer, following }, outletFull: { ...cur.outletFull, followerCount: Math.max(0, cur.outletFull.followerCount + (following ? 1 : -1)) } }
        : cur,
    );
  }

  /** "Stay updated": follow the outlet and switch on breaking-news and new-article notifications. */
  async function turnOnAlerts() {
    if (!a) return;
    if (!signedIn()) return window.location.assign(loginPath());
    setAlerts("busy");
    try {
      if (!a.viewer.following) {
        await newsApi.follow(a.outletFull.id);
        onFollowChange(true);
      }
      await newsApi.setPrefs(a.outletFull.id, { prefs: { breaking: true, articles: true }, muted: false });
      setAlerts("on");
      toast.show("ok", `Alerts from ${a.outletFull.name} are on.`);
    } catch (err) {
      setAlerts("idle");
      toast.show("error", newsError(err));
    }
  }

  function copyLink() {
    void navigator.clipboard?.writeText(window.location.href);
    toast.show("ok", "Link copied.");
  }

  async function comment(ev: FormEvent) {
    ev.preventDefault();
    if (!a || !text.trim()) return;
    setBusy(true);
    try {
      const c = await newsApi.addComment(a.id, text.trim());
      setComments((list) => [c, ...(list ?? [])]);
      setText("");
    } catch (err) {
      toast.show("error", newsError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error)
    return (
      <NewsShell compactHeader plain>
        <div className="nm-read nm-read--single">
          <Empty title="Article not available" text={error} action={<Link to="/news" className="nm-btn nm-btn--primary">Back to Fockis News</Link>} />
        </div>
      </NewsShell>
    );

  const myId = localStorage.getItem("userId");

  return (
    <NewsShell compactHeader plain>
      {!a && (
        <div className="nm-read">
          <div className="nm-read__main">
            <Skeleton h={18} />
            <Skeleton h={110} />
            <Skeleton h={420} />
            <Skeleton h={220} />
          </div>
          <div className="nm-read__side">
            <Skeleton h={220} />
            <Skeleton h={320} />
          </div>
        </div>
      )}
      {a && (
        <div className="nm-read">
          <article className="nm-read__main nm-story">
            <nav className="nm-crumbs" aria-label="Breadcrumb">
              <Link to="/news" aria-label="News home">
                <Home />
              </Link>
              <ChevronRight aria-hidden="true" />
              <Link to="/news">News &amp; Media</Link>
              <ChevronRight aria-hidden="true" />
              <Link to={`/news/category/${a.category}`}>{CATEGORY_LABELS[a.category] ?? a.category}</Link>
              <ChevronRight aria-hidden="true" />
              <span aria-current="page">{a.headline}</span>
            </nav>

            {a.preview && <p className="nm-callout">Newsroom preview — this article is {ARTICLE_STATUS_LABELS[a.status]?.toLowerCase() ?? a.status} and not visible to the public.</p>}

            <header className="nm-story__head">
              <div className="nm-story__kicker">
                <CategoryTag category={a.category} solid />
                {a.isBreaking && <span className="nm-tag-red">BREAKING</span>}
                {a.sponsored && <span className="nm-sponsored">Sponsored</span>}
              </div>
              <h1 className="nm-story__title">{a.headline}</h1>
              {a.subtitle && <p className="nm-story__sub">{a.subtitle}</p>}

              <div className="nm-story__byline">
                <Link to={`/news/${a.outletFull.slug}`} className="nm-story__logo" aria-label={a.outletFull.name}>
                  <OutletLogo outlet={a.outletFull} size={38} />
                </Link>
                <div className="nm-story__meta">
                  <span className="nm-story__by">
                    By <b>{a.authorName || a.outletFull.name}</b>
                    {a.authorName && a.authorName !== a.outletFull.name && (
                      <>
                        {" · "}
                        <Link to={`/news/${a.outletFull.slug}`}>{a.outletFull.name}</Link>
                      </>
                    )}
                    {(!a.authorName || a.authorName === a.outletFull.name) && a.outletFull.verified && <Verified size={14} />}
                  </span>
                  {a.publishedAt && (
                    <span>
                      <CalendarDays aria-hidden="true" /> <time dateTime={a.publishedAt}>{fmtDate(a.publishedAt, true)}</time>
                    </span>
                  )}
                  <span>
                    <Clock aria-hidden="true" /> {a.readingMinutes} min read
                  </span>
                  <span>
                    <Eye aria-hidden="true" /> {plural(a.views, "view")}
                  </span>
                  {a.language !== "en" && <span>{LANGUAGE_LABELS[a.language] ?? a.language}</span>}
                </div>
                <div className="nm-story__follow">
                  <FollowControl outletId={a.outletFull.id} outletName={a.outletFull.name} initial={{ isFollowing: a.viewer.following }} onChange={onFollowChange} icon size="sm" notify={toast.show} />
                </div>
              </div>
            </header>

            {a.featuredImage?.url && (
              <figure className="nm-story__hero">
                <img src={a.featuredImage.url} alt={a.featuredImage.caption || a.headline} />
                {(a.featuredImage.caption || a.featuredImage.credit) && (
                  <figcaption>
                    {a.featuredImage.caption}
                    {a.featuredImage.credit && (
                      <span>
                        {a.featuredImage.caption ? " · " : ""}Photo: {a.featuredImage.credit}
                      </span>
                    )}
                  </figcaption>
                )}
              </figure>
            )}
            {a.videoUrl && (
              <div className="nm-story__media">
                <video src={a.videoUrl} controls playsInline preload="metadata" poster={a.featuredImage?.url || undefined} />
              </div>
            )}
            {a.audioUrl && (
              <div className="nm-story__media nm-story__media--audio">
                <audio src={a.audioUrl} controls preload="metadata" />
              </div>
            )}

            {body && <div className="nm-story__body" dangerouslySetInnerHTML={{ __html: body }} />}

            {a.gallery.length > 0 && (
              <section className={`nm-story__gallery${a.gallery.length === 1 ? " is-single" : ""}`} aria-label="Photo gallery">
                {a.gallery.map((g, i) => (
                  <figure key={i}>
                    <img src={g.url} alt={g.caption || ""} loading="lazy" />
                    {(g.caption || g.credit) && (
                      <figcaption>
                        {g.caption}
                        {g.credit && <span>{g.caption ? " · " : ""}{g.credit}</span>}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </section>
            )}

            {a.tags.length > 0 && (
              <div className="nm-story__tags">
                {a.tags.map((t) => (
                  <span key={t} className="nm-chip">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {a.sources.length > 0 && (
              <section className="nm-story__sources" aria-labelledby="nm-sources-h">
                <h2 id="nm-sources-h">
                  <BookOpen aria-hidden="true" /> Sources &amp; references
                </h2>
                <ol>
                  {a.sources.map((s, i) => (
                    <li key={i}>
                      {s.url ? (
                        <a href={s.url} target="_blank" rel="noopener nofollow noreferrer">
                          {sourceLabel(s)}
                          {s.title && !isUrlText(s.title) && hostOf(s.url) && <small>{hostOf(s.url)}</small>}
                          <ExternalLink aria-hidden="true" />
                        </a>
                      ) : (
                        <span>{s.title}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div className="nm-actbar" role="toolbar" aria-label="Article actions">
              <button type="button" className={`nm-actbar__btn${a.viewer.liked ? " is-on" : ""}`} onClick={() => toggle("like")} aria-pressed={a.viewer.liked} aria-label="Like">
                <Heart /> <span>{a.likes > 0 ? compact(a.likes) : "Like"}</span>
              </button>
              <button type="button" className="nm-actbar__btn" onClick={share} aria-label="Share">
                <Share2 /> <span>Share</span>
              </button>
              <button type="button" className={`nm-actbar__btn${a.viewer.bookmarked ? " is-on" : ""}`} onClick={() => toggle("bookmark")} aria-pressed={a.viewer.bookmarked} aria-label="Bookmark">
                {a.viewer.bookmarked ? <BookmarkCheck /> : <Bookmark />} <span>{a.viewer.bookmarked ? "Saved" : "Bookmark"}</span>
              </button>
              {a.originalUrl ? (
                <a href={a.originalUrl} target="_blank" rel="noreferrer" className="nm-actbar__btn" title={`Visit the ${a.outletFull.name} website`}>
                  <ExternalLink /> <span>Visit {a.outletFull.name} website</span>
                </a>
              ) : (
                <Link to={`/news/${a.outletFull.slug}`} className="nm-actbar__btn" title={`${a.outletFull.name} on Fockis News`}>
                  <ExternalLink /> <span>Visit {a.outletFull.name}</span>
                </Link>
              )}
              <button type="button" className="nm-actbar__btn" onClick={copyLink} aria-label="Copy link">
                <Link2 /> <span>Copy link</span>
              </button>
            </div>

            {a.commentsEnabled && !a.preview && (
              <section className="nm-discuss" aria-labelledby="nm-discuss-h">
                <h2 id="nm-discuss-h">
                  <MessageCircle aria-hidden="true" /> Comments {a.commentCount > 0 && <span>({compact(a.commentCount)})</span>}
                </h2>
                {signedIn() ? (
                  <form onSubmit={comment} className="nm-discuss__form">
                    <textarea className="nm-input" rows={2} maxLength={2000} value={text} onChange={(ev) => setText(ev.target.value)} placeholder="Share your thoughts respectfully…" aria-label="Write a comment" />
                    <button type="submit" className="nm-btn nm-btn--primary" disabled={busy || !text.trim()}>
                      {busy && <Loader2 className="nm-spin" />} Post comment
                    </button>
                  </form>
                ) : (
                  <p className="nm-discuss__signin">
                    <Link to={loginPath()}>Sign in</Link> to join the discussion.
                  </p>
                )}
                {!comments && <Skeleton h={56} />}
                {comments?.length === 0 && <p className="nm-discuss__empty">No comments yet. Be the first to share your thoughts.</p>}
                {comments && comments.length > 0 && (
                  <ul className="nm-discuss__list">
                    {comments.map((c) => (
                      <li key={c.id}>
                        <span className="nm-discuss__avatar" aria-hidden="true">
                          {initials(c.userName) || "?"}
                        </span>
                        <div>
                          <p className="nm-discuss__who">
                            <b>{c.userName}</b> <small>{timeAgo(c.createdAt)}</small>
                          </p>
                          <p className="nm-discuss__text">{c.body}</p>
                          {c.userId === myId && (
                            <button
                              type="button"
                              className="nm-link"
                              onClick={async () => {
                                try {
                                  await newsApi.deleteComment(c.id);
                                  setComments((list) => (list ?? []).filter((x) => x.id !== c.id));
                                } catch (err) {
                                  toast.show("error", newsError(err));
                                }
                              }}
                            >
                              <Trash2 /> Delete
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </article>

          <aside className="nm-read__side" aria-label={`About ${a.outletFull.name}`}>
            <section className="nm-sidecard nm-pub">
              <Link to={`/news/${a.outletFull.slug}`} className="nm-pub__id">
                <OutletLogo outlet={a.outletFull} size={64} />
                <span>
                  <b>
                    {a.outletFull.name} {a.outletFull.verified && <Verified size={17} />}
                  </b>
                  <small>{MEDIA_TYPE_LABELS[a.outletFull.mediaType] ?? "News & Media"}</small>
                </span>
              </Link>
              <dl className="nm-pub__stats">
                <div>
                  <dt>{a.outletFull.articleCount === 1 ? "Article" : "Articles"}</dt>
                  <dd>{compact(a.outletFull.articleCount)}</dd>
                </div>
                <div>
                  <dt>{a.outletFull.followerCount === 1 ? "Follower" : "Followers"}</dt>
                  <dd>{compact(a.outletFull.followerCount)}</dd>
                </div>
              </dl>
              <div className="nm-pub__follow">
                <FollowControl outletId={a.outletFull.id} outletName={a.outletFull.name} initial={{ isFollowing: a.viewer.following }} onChange={onFollowChange} icon withBell notify={toast.show} />
              </div>
            </section>

            {a.related.length > 0 && (
              <section className="nm-sidecard nm-related" aria-labelledby="nm-related-h">
                <header>
                  <h2 id="nm-related-h">Related Articles</h2>
                  <Link to={`/news/category/${a.category}`}>
                    See All <ChevronRight aria-hidden="true" />
                  </Link>
                </header>
                <ul>
                  {a.related.map((r) => (
                    <li key={r.id}>
                      <Link to={articlePath(r)} className="nm-related__item">
                        <Thumb src={r.imageUrl} className="nm-related__thumb" />
                        <span className="nm-related__text">
                          <b>{r.headline}</b>
                          <span>
                            <CategoryTag category={r.category} solid />
                            {r.publishedAt && <time dateTime={r.publishedAt}>{fmtDate(r.publishedAt)}</time>}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="nm-sidecard nm-stay" aria-labelledby="nm-stay-h">
              <h2 id="nm-stay-h">
                <BellRing aria-hidden="true" /> Stay Updated
              </h2>
              <p>Get breaking stories and new articles from {a.outletFull.name} in your Fockis notifications.</p>
              {alerts === "on" ? (
                <p className="nm-stay__done">
                  <Check aria-hidden="true" /> Alerts are on. Change them anytime from the Following menu.
                </p>
              ) : (
                <button type="button" className="nm-btn nm-btn--primary nm-stay__btn" onClick={turnOnAlerts} disabled={alerts === "busy"}>
                  {alerts === "busy" && <Loader2 className="nm-spin" />} {signedIn() ? "Turn on alerts" : "Sign in to get alerts"}
                </button>
              )}
            </section>
          </aside>
        </div>
      )}
      {toast.node}
    </NewsShell>
  );
}
