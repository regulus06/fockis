/**
 * AdminSite.tsx — Categories, Subscribers, Comments, Analytics, Advertising,
 * SEO, Website Design, Domain Management and Settings pages of the Media
 * Administration Center. Website design and domains use the existing Website
 * Studio (templates, draft/publish, versions, domain verification).
 */

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Bell, BellOff, CheckCircle2, Clock, Copy, ExternalLink, Eye, EyeOff, FolderTree, Globe, Languages, Link2, Loader2, Megaphone, MessageSquare, Palette, RefreshCw, Search, ShieldCheck, Trash2, Users } from "lucide-react";

import { websiteStudioApi } from "../../website-studio/services/websiteStudioApi";
import type { WebsiteDomain } from "../../website-studio/types/studio";
import { CATEGORY_LABELS, FOLLOW_PREF_LABELS, LANGUAGE_LABELS, MEDIA_TYPE_LABELS, compact, fmtDate, money, newsApi, newsError, timeAgo, type Analytics } from "../newsApi";
import { Empty, Field, OutletLogo, Skeleton } from "../NewsParts";
import { PageTitle, useAdmin } from "./AdminShell";
import { Stat } from "./AdminDashboard";

/* ============================================================================
 * Categories
 * ========================================================================== */

export function CategoriesPage() {
  const { outlet } = useAdmin();
  const [rows, setRows] = useState<{ category: string; total: number; published: number; views: number }[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    newsApi
      .categoryCounts(outlet.id)
      .then((r) => setRows(r.items))
      .catch((err) => setError(newsError(err)));
  }, [outlet.id]);
  const byKey = new Map((rows ?? []).map((r) => [r.category, r]));
  return (
    <>
      <PageTitle title="Categories" sub="Fockis News sections your newsroom publishes in. Readers browse and filter central news by these categories." />
      {error && <p className="nm-form-error">{error}</p>}
      {!rows && !error && <Skeleton h={260} />}
      {rows && (
        <section className="nm-card nm-card--flush">
          <div className="nm-tablewrap">
            <table className="nm-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="nm-num">Articles</th>
                  <th className="nm-num">Published</th>
                  <th className="nm-num">Views</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                  const r = byKey.get(key);
                  return (
                    <tr key={key}>
                      <td>
                        <b>{label}</b>
                      </td>
                      <td className="nm-num">{r?.total ?? 0}</td>
                      <td className="nm-num">{r?.published ?? 0}</td>
                      <td className="nm-num">{compact(r?.views ?? 0)}</td>
                      <td>
                        <Link to={`/news/admin/${outlet.id}/articles?category=${key}`} className="nm-link">
                          View articles
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <p className="nm-muted nm-small">
        <FolderTree aria-hidden="true" /> Categories are shared across Fockis News so readers can filter consistently. Use tags in the article editor for your own topics.
      </p>
    </>
  );
}

/* ============================================================================
 * Subscribers (followers)
 * ========================================================================== */

export function SubscribersPage() {
  const { outlet } = useAdmin();
  const [page, setPage] = useState(1);
  const [d, setD] = useState<Awaited<ReturnType<typeof newsApi.followers>> | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    newsApi
      .followers(outlet.id, page)
      .then(setD)
      .catch((err) => setError(newsError(err)));
  }, [outlet.id, page]);
  return (
    <>
      <PageTitle title="Subscribers" sub="People who follow your media on Fockis, and which notifications they chose. Followers' contact details are never shared with the newsroom." />
      {error && <p className="nm-form-error">{error}</p>}
      {!d && !error && <Skeleton h={260} />}
      {d && (
        <>
          <div className="nma-stats">
            <Stat icon={Users} label="Followers" value={compact(d.total)} tone="green" />
            <Stat icon={Users} label="New in the last 30 days" value={compact(d.newLast30Days)} />
            <Stat icon={BellOff} label="Muted" value={compact(d.muted)} tone="navy" />
          </div>
          <div className="nma-two">
            <section className="nm-card">
              <h2 className="nm-card__title">
                <Bell /> Notification choices
              </h2>
              <p className="nm-muted nm-small">Following does not turn notifications on. Each follower chooses what they receive.</p>
              <ul className="nm-bars">
                {FOLLOW_PREF_LABELS.map(([k, label]) => {
                  const n = d.prefs[k] ?? 0;
                  const pct = d.total ? Math.round((n / d.total) * 100) : 0;
                  return (
                    <li key={k}>
                      <span>{label}</span>
                      <i style={{ width: `${pct}%` }} />
                      <b>{compact(n)}</b>
                    </li>
                  );
                })}
              </ul>
            </section>
            <section className="nm-card">
              <h2 className="nm-card__title">
                <Users /> Recent followers
              </h2>
              {d.items.length === 0 && <p className="nm-muted">No followers yet. Share your media profile to grow your audience.</p>}
              <ul className="nma-people">
                {d.items.map((p, i) => (
                  <li key={i}>
                    <OutletLogo outlet={{ name: p.name, logoUrl: p.avatarUrl }} size={34} />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        Followed {timeAgo(p.at)}
                        {p.muted ? " · muted" : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
              {d.total > d.pageSize && (
                <div className="nm-row-actions">
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" disabled={page * d.pageSize >= d.total} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================================
 * Comments moderation
 * ========================================================================== */

export function CommentsPage() {
  const { outlet, notify } = useAdmin();
  const [status, setStatus] = useState<"visible" | "hidden">("visible");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof newsApi.adminComments>>["items"] | null>(null);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    setRows(null);
    newsApi
      .adminComments(outlet.id, status)
      .then((r) => setRows(r.items))
      .catch((err) => setError(newsError(err)));
  }, [outlet.id, status, tick]);
  async function moderate(id: string, hide: boolean) {
    try {
      await newsApi.moderate(outlet.id, id, hide);
      notify("ok", hide ? "Comment hidden." : "Comment restored.");
      setTick((t) => t + 1);
    } catch (err) {
      notify("error", newsError(err));
    }
  }
  return (
    <>
      <PageTitle
        title="Comments"
        sub="Readers' comments on your articles. Hidden comments are kept for your records but are not shown publicly."
        actions={
          <div className="nm-seg" role="tablist">
            <button type="button" className={status === "visible" ? "is-on" : ""} onClick={() => setStatus("visible")}>
              Visible
            </button>
            <button type="button" className={status === "hidden" ? "is-on" : ""} onClick={() => setStatus("hidden")}>
              Hidden
            </button>
          </div>
        }
      />
      {!outlet.settings.commentsEnabled && <p className="nm-note nm-note--amber">Comments are turned off for this media. Turn them on in Settings.</p>}
      {error && <p className="nm-form-error">{error}</p>}
      {!rows && !error && <Skeleton h={200} />}
      {rows && rows.length === 0 && <Empty icon={MessageSquare} title={status === "visible" ? "No comments yet" : "No hidden comments"} />}
      {rows && rows.length > 0 && (
        <ul className="nma-comments">
          {rows.map((c) => (
            <li key={c.id} className="nm-card">
              <div>
                <b>{c.userName}</b> <small className="nm-muted">· {timeAgo(c.createdAt)}</small>
                {c.article && (
                  <small className="nm-muted">
                    {" "}
                    on <Link to={`/news/${outlet.slug}/${c.article.slug}`}>{c.article.headline}</Link>
                  </small>
                )}
                <p className="nm-pre">{c.body}</p>
              </div>
              <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => moderate(c.id, status === "visible")}>
                {status === "visible" ? <EyeOff /> : <Eye />} {status === "visible" ? "Hide" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ============================================================================
 * Analytics
 * ========================================================================== */

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function AnalyticsPage() {
  const { outlet } = useAdmin();
  const [range, setRange] = useState({ from: iso(new Date(Date.now() - 29 * 86_400_000)), to: iso(new Date()) });
  const [a, setA] = useState<Analytics | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setA(null);
    setError("");
    newsApi
      .analytics(outlet.id, range)
      .then(setA)
      .catch((err) => setError(newsError(err)));
  }, [outlet.id, range]);
  const preset = (days: number) => setRange({ from: iso(new Date(Date.now() - (days - 1) * 86_400_000)), to: iso(new Date()) });
  const max = Math.max(1, ...(a?.byDay.map((x) => x.views) ?? [1]));
  const totalSrc = Math.max(1, ...(a?.sources.map((x) => x.views) ?? [1]));
  const totalLang = Math.max(1, ...(a?.languages.map((x) => x.views) ?? [1]));
  return (
    <>
      <PageTitle
        title="Analytics"
        sub="Audience, reading and revenue figures from Fockis records."
        actions={
          <div className="nma-toolbar">
            {[7, 30, 90].map((d) => (
              <button key={d} type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => preset(d)}>
                {d} days
              </button>
            ))}
            <input className="nm-input nm-input--sm" type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))} aria-label="From" />
            <input className="nm-input nm-input--sm" type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))} aria-label="To" />
          </div>
        }
      />
      {error && <p className="nm-form-error">{error}</p>}
      {!a && !error && <Skeleton h={300} />}
      {a && (
        <>
          <div className="nma-stats">
            <Stat icon={Eye} label="Article views" value={compact(a.totals.views)} />
            <Stat icon={Users} label="Unique readers" value={compact(a.totals.uniqueReaders)} tone="green" />
            <Stat icon={Users} label="New followers" value={compact(a.totals.newFollowers)} sub={`${compact(a.totals.followers)} in total`} tone="navy" />
            {a.donations && <Stat icon={BarChart3} label="Donations" value={a.donations.length ? a.donations.map((x) => money(x.total, x.currency)).join(" · ") : money(0)} sub={`${a.donations.reduce((s, x) => s + x.count, 0)} gifts`} tone="red" />}
            <Stat icon={MessageSquare} label="Requests received" value={Object.values(a.requests).reduce((s, n) => s + n, 0)} tone="amber" />
            {Object.entries(a.plays).map(([k, n]) => (
              <Stat key={k} icon={BarChart3} label={k === "video" ? "Video plays" : k === "podcast" ? "Podcast plays" : `${k.replace("_", " ")} plays`} value={compact(n)} />
            ))}
          </div>
          <section className="nm-card">
            <h2 className="nm-card__title">
              <BarChart3 /> Views per day
            </h2>
            {a.byDay.every((x) => x.views === 0) ? (
              <p className="nm-muted">No views in this period.</p>
            ) : (
              <div className="nma-bars nma-bars--wide" role="img" aria-label="Views per day">
                {a.byDay.map((x) => (
                  <span key={x.day} title={`${fmtDate(x.day)}: ${x.views} views · ${x.readers} readers`}>
                    <i style={{ height: `${Math.max(2, Math.round((x.views / max) * 100))}%` }} />
                    {a.byDay.length <= 31 && <small>{new Date(`${x.day}T00:00:00`).getDate()}</small>}
                  </span>
                ))}
              </div>
            )}
          </section>
          <div className="nma-two">
            <section className="nm-card">
              <h2 className="nm-card__title">Popular articles</h2>
              {a.topArticles.length === 0 && <p className="nm-muted">No article views in this period.</p>}
              <ol className="nma-top">
                {a.topArticles.map((t) => (
                  <li key={t.id}>
                    <Link to={`/news/${outlet.slug}/${t.slug}`}>{t.headline}</Link>
                    <span>
                      {compact(t.views)} views{t.readingMinutes ? ` · ${t.readingMinutes} min read` : ""}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            <section className="nm-card">
              <h2 className="nm-card__title">Traffic sources</h2>
              {a.sources.length === 0 && <p className="nm-muted">No traffic recorded in this period.</p>}
              <ul className="nm-bars">
                {a.sources.map((x) => (
                  <li key={x.source}>
                    <span>{x.source || "Direct"}</span>
                    <i style={{ width: `${Math.round((x.views / totalSrc) * 100)}%` }} />
                    <b>{compact(x.views)}</b>
                  </li>
                ))}
              </ul>
              <h2 className="nm-card__title nm-mt">
                <Languages /> Languages read
              </h2>
              <ul className="nm-bars">
                {a.languages.map((x) => (
                  <li key={x.language}>
                    <span>{LANGUAGE_LABELS[x.language] ?? (x.language || "Unknown")}</span>
                    <i style={{ width: `${Math.round((x.views / totalLang) * 100)}%` }} />
                    <b>{compact(x.views)}</b>
                  </li>
                ))}
              </ul>
            </section>
          </div>
          {a.notTracked.length > 0 && <p className="nm-muted nm-small">Not tracked yet: {a.notTracked.join(", ")}.</p>}
        </>
      )}
    </>
  );
}

/* ============================================================================
 * Advertising
 * ========================================================================== */

export function AdsPage() {
  const { outlet } = useAdmin();
  return (
    <>
      <PageTitle title="Advertisements" sub="Run campaigns with the Fockis Ads Manager and label sponsored content in your newsroom." />
      <div className="nma-two">
        <section className="nm-card">
          <h2 className="nm-card__title">
            <Megaphone /> Fockis Ads Manager
          </h2>
          <p>Create display campaigns, set budgets and see impressions, clicks and spend in the existing Fockis Ads Manager. Payments go through your Fockis account.</p>
          <Link to="/ads" className="nm-btn nm-btn--primary">
            Open Ads Manager <ExternalLink />
          </Link>
        </section>
        <section className="nm-card">
          <h2 className="nm-card__title">Sponsored content</h2>
          <p>
            When an article is paid for by an advertiser, tick <b>Sponsored</b> in the article editor. Fockis shows a clear “Sponsored” label everywhere the article appears, on {outlet.name}'s website and on Fockis News.
          </p>
          <Link to={`/news/admin/${outlet.id}/articles/new`} className="nm-btn nm-btn--ghost">
            Write a sponsored article
          </Link>
        </section>
      </div>
      <p className="nm-muted nm-small">Advertiser accounts, ad placements on your own website and advertising revenue reports for media organizations are not available yet.</p>
    </>
  );
}

/* ============================================================================
 * SEO
 * ========================================================================== */

export function SeoPage() {
  const { outlet, reload, notify, website } = useAdmin();
  const [f, setF] = useState({ seoTitle: outlet.settings.seoTitle, seoDescription: outlet.settings.seoDescription, allowIndexing: outlet.settings.allowIndexing });
  const [busy, setBusy] = useState(false);
  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy(true);
    try {
      await newsApi.updateOutlet(outlet.id, { settings: f });
      notify("ok", "SEO settings saved.");
      reload();
    } catch (err) {
      notify("error", newsError(err));
    } finally {
      setBusy(false);
    }
  }
  const title = f.seoTitle || `${outlet.name} — ${MEDIA_TYPE_LABELS[outlet.mediaType] ?? "News"}`;
  const desc = f.seoDescription || outlet.tagline || outlet.about.slice(0, 160);
  return (
    <>
      <PageTitle title="SEO" sub="How your media appears in search engines and when shared. Each article also has its own SEO title, description, canonical URL and sharing image in the editor." />
      <div className="nma-two">
        <form className="nm-card nm-form" onSubmit={save}>
          <Field label="Search title" hint={`${f.seoTitle.length}/70 characters`}>
            <input className="nm-input" maxLength={70} value={f.seoTitle} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} placeholder={`${outlet.name} — News`} />
          </Field>
          <Field label="Meta description" hint={`${f.seoDescription.length}/170 characters`}>
            <textarea className="nm-input" rows={3} maxLength={170} value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} />
          </Field>
          <label className="nm-check">
            <input type="checkbox" checked={f.allowIndexing} onChange={(e) => setF({ ...f, allowIndexing: e.target.checked })} /> Allow search engines to index the media profile and articles
          </label>
          <div className="nm-form-actions">
            <button type="submit" className="nm-btn nm-btn--primary" disabled={busy}>
              {busy && <Loader2 className="nm-spin" />} Save
            </button>
          </div>
        </form>
        <section className="nm-card">
          <h2 className="nm-card__title">
            <Search /> Search preview
          </h2>
          <div className="nma-serp">
            <small>{(website?.url ?? `fockis.com/news/${outlet.slug}`).replace(/^https?:\/\//, "")}</small>
            <b>{title}</b>
            <p>{desc || "Add a description so search engines can show a summary of your media."}</p>
          </div>
          <ul className="nm-checks">
            <li>
              <CheckCircle2 /> Article structured data (NewsArticle) and Open Graph tags are added to every published article.
            </li>
            <li>
              <CheckCircle2 /> Canonical URLs point to your own website when the article is also on Fockis News.
            </li>
            {website && (
              <li>
                <CheckCircle2 /> Website sitemap and robots.txt are generated by Website Studio.
              </li>
            )}
          </ul>
        </section>
      </div>
    </>
  );
}

/* ============================================================================
 * Website design (existing Website Studio)
 * ========================================================================== */

export function WebsiteDesignPage() {
  const { website } = useAdmin();
  return (
    <>
      <PageTitle title="Website Design" sub="Your independent website is built with Fockis Website Studio. Change the template, colors, fonts, images, navigation and sections there — your content is kept when you switch templates." />
      {!website ? (
        <CreateWebsite />
      ) : (
        <div className="nma-two">
          <section className="nm-card">
            <h2 className="nm-card__title">
              <Palette /> {website.templateName || "Current design"}
            </h2>
            <dl className="nm-dl">
              <dt>Status</dt>
              <dd>{website.status === "published" ? "Published" : website.status === "suspended" ? "Suspended" : "Draft (not public)"}</dd>
              <dt>Address</dt>
              <dd>
                <a href={website.url} target="_blank" rel="noreferrer">
                  {website.url.replace(/^https?:\/\//, "")}
                </a>
              </dd>
              <dt>Last published</dt>
              <dd>{website.publishedAt ? fmtDate(website.publishedAt, true) : "Never"}</dd>
              <dt>Unpublished changes</dt>
              <dd>{website.hasUnpublishedChanges ? "Yes — publish them in the editor" : "None"}</dd>
            </dl>
            {website.canEdit ? (
              <div className="nm-row-actions">
                <a href={`/website-studio/editor/${website.id}`} className="nm-btn nm-btn--primary">
                  <Palette /> Open the editor
                </a>
                <a href={`/website-studio/preview/${website.id}`} className="nm-btn nm-btn--ghost">
                  <Eye /> Preview draft
                </a>
              </div>
            ) : (
              <p className="nm-note nm-note--amber">Only the website owner and its managers can edit the design. Ask the owner to add you as a website manager in Website Studio.</p>
            )}
          </section>
          <section className="nm-card">
            <h2 className="nm-card__title">
              <RefreshCw /> Changing templates safely
            </h2>
            <ul className="nm-checks">
              <li>
                <CheckCircle2 /> Open the editor and choose <b>Change template</b>. You get a preview with your real content and a summary of what moves where.
              </li>
              <li>
                <CheckCircle2 /> The new design is saved as a draft and a backup version is created. Your live website doesn't change until you publish.
              </li>
              <li>
                <CheckCircle2 /> Every publish is kept in Version history so you can compare and restore a previous design.
              </li>
              <li>
                <CheckCircle2 /> Articles, videos, podcasts, followers and donations live in the newsroom, not in the template, so a design change never removes them.
              </li>
            </ul>
            {website.canEdit && (
              <a href={`/website-studio/websites/${website.id}/settings`} className="nm-btn nm-btn--ghost">
                Versions & settings
              </a>
            )}
          </section>
        </div>
      )}
    </>
  );
}

function CreateWebsite() {
  const { outlet, can, notify, reload } = useAdmin();
  const [templates, setTemplates] = useState<{ slug: string; name: string; thumbnail?: string; description?: string }[] | null>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    websiteStudioApi
      .templates({ category: "news-and-magazine" })
      .then(async (list) => (list.length ? list : await websiteStudioApi.templates({})))
      .then((list) => setTemplates(list as never))
      .catch(() => setTemplates([]));
  }, []);
  async function create() {
    setBusy(true);
    try {
      const r = await newsApi.createWebsite(outlet.id, pick || undefined);
      notify("ok", r.note || "Your website was created as a private draft. Customize it, then publish.");
      reload();
    } catch (err) {
      notify("error", newsError(err));
    } finally {
      setBusy(false);
    }
  }
  if (!can("manage_settings")) return <Empty icon={Globe} title="No website yet" text="Ask an administrator of this media organization to create the website." />;
  return (
    <section className="nm-card">
      <h2 className="nm-card__title">
        <Globe /> Create your media website
      </h2>
      <p className="nm-muted">Pick a design. The website is created as a private draft in Website Studio; nothing is public until you publish it.</p>
      {!templates && <Skeleton h={160} />}
      {templates && (
        <div className="nm-tplgrid">
          {templates.slice(0, 12).map((t) => (
            <button key={t.slug} type="button" className={`nm-tpl${pick === t.slug ? " is-on" : ""}`} onClick={() => setPick(t.slug)} aria-pressed={pick === t.slug}>
              <span className="nm-tpl__img">{t.thumbnail ? <img src={t.thumbnail} alt="" /> : <Globe />}</span>
              <b>{t.name}</b>
              {t.description && <small>{t.description}</small>}
            </button>
          ))}
        </div>
      )}
      <div className="nm-form-actions">
        <button type="button" className="nm-btn nm-btn--primary" onClick={create} disabled={busy}>
          {busy && <Loader2 className="nm-spin" />} Create website{pick ? "" : " (default design)"}
        </button>
      </div>
    </section>
  );
}

/* ============================================================================
 * Domains (existing Website Studio domains)
 * ========================================================================== */

export function DomainsPage() {
  const { outlet, website, notify, reload } = useAdmin();
  const [domains, setDomains] = useState<WebsiteDomain[] | null>(null);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!website?.canEdit) return;
    websiteStudioApi
      .domains(website.id)
      .then(setDomains)
      .catch((err) => setError(newsError(err)));
  }, [website?.id, website?.canEdit, tick]);

  async function run(key: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(key);
    try {
      await fn();
      notify("ok", ok);
      setTick((t) => t + 1);
      reload();
    } catch (err) {
      notify("error", newsError(err));
    } finally {
      setBusy(null);
    }
  }

  if (!website)
    return (
      <>
        <PageTitle title="Domain Management" />
        <Empty icon={Link2} title="No website yet" text="Create your media website first, then connect a domain." action={<Link to={`/news/admin/${outlet.id}/website`} className="nm-btn nm-btn--primary">Website Design</Link>} />
      </>
    );

  return (
    <>
      <PageTitle title="Domain Management" sub="Your Fockis address and any custom domains. A custom domain is only activated after DNS verification succeeds." />
      <section className="nm-card">
        <h2 className="nm-card__title">
          <Globe /> Fockis address
        </h2>
        <div className="nma-domainrow">
          <a href={website.url} target="_blank" rel="noreferrer">
            {website.url.replace(/^https?:\/\//, "")}
          </a>
          <span className="nm-okpill">{website.status === "published" ? "Live" : "Not published"}</span>
          <button type="button" className="nm-iconbtn" aria-label="Copy address" onClick={() => void navigator.clipboard?.writeText(website.url).then(() => notify("ok", "Address copied."))}>
            <Copy />
          </button>
        </div>
      </section>

      {!website.canEdit ? (
        <p className="nm-note nm-note--amber">Only the website owner and its managers can manage domains.</p>
      ) : (
        <section className="nm-card">
          <h2 className="nm-card__title">
            <Link2 /> Custom domains
          </h2>
          {error && <p className="nm-form-error">{error}</p>}
          <form
            className="nm-domaininput"
            onSubmit={(ev) => {
              ev.preventDefault();
              const d = value.trim().toLowerCase();
              if (!d) return;
              void run("add", () => websiteStudioApi.addDomain(website.id, d), "Domain added. Add the DNS records below, then verify.").then(() => setValue(""));
            }}
          >
            <input className="nm-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="www.yourmedia.com" aria-label="Custom domain" />
            <button type="submit" className="nm-btn nm-btn--primary" disabled={busy === "add" || !value.trim()}>
              {busy === "add" && <Loader2 className="nm-spin" />} Add domain
            </button>
          </form>
          {!domains && !error && <Skeleton h={80} />}
          {domains && domains.length === 0 && <p className="nm-muted">No custom domains yet.</p>}
          {domains?.map((d) => {
            const verified = d.verificationStatus === "verified";
            return (
              <article key={d.id} className="nma-domain">
                <header>
                  <b>{d.domain}</b>
                  <span className={verified ? "nm-okpill" : d.verificationStatus === "failed" ? "nm-badpill" : "nm-greypill"}>{verified ? "Verified" : d.verificationStatus === "failed" ? "Verification failed" : "Pending verification"}</span>
                  <span className={d.sslStatus === "active" ? "nm-okpill" : "nm-greypill"}>HTTPS {d.sslStatus === "active" ? "active" : d.sslStatus === "unavailable" ? "unavailable" : "pending"}</span>
                  {d.isPrimary && <span className="nm-okpill">Primary</span>}
                </header>
                {!verified && (
                  <div className="nm-tablewrap">
                    <table className="nm-table">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Host / name</th>
                          <th>Value</th>
                          <th>Purpose</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          [d.verificationRecord, "Proves you own the domain"],
                          [d.routingRecord, "Points the domain to Fockis"],
                        ].map(([r, purpose], i) => {
                          const rec = r as WebsiteDomain["routingRecord"] | WebsiteDomain["verificationRecord"];
                          return (
                            <tr key={i}>
                              <td>{rec.type}</td>
                              <td>
                                <code>{rec.host}</code>
                              </td>
                              <td>
                                <code>{rec.value}</code>
                              </td>
                              <td>{purpose as string}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {d.lastError && <p className="nm-form-error">{d.lastError}</p>}
                {d.lastCheckedAt && <small className="nm-muted">Last checked {timeAgo(d.lastCheckedAt)}</small>}
                <div className="nm-row-actions">
                  {!verified && (
                    <button type="button" className="nm-btn nm-btn--primary nm-btn--sm" disabled={busy === d.id} onClick={() => run(d.id, () => websiteStudioApi.verifyDomain(website.id, d.id), "Verification checked.")}>
                      {busy === d.id ? <Loader2 className="nm-spin" /> : <ShieldCheck />} Verify DNS
                    </button>
                  )}
                  <button
                    type="button"
                    className="nm-btn nm-btn--ghost nm-btn--sm"
                    disabled={busy === `rm-${d.id}`}
                    onClick={() => window.confirm(`Remove ${d.domain}?`) && run(`rm-${d.id}`, () => websiteStudioApi.removeDomain(website.id, d.id), "Domain removed.")}
                  >
                    <Trash2 /> Remove
                  </button>
                </div>
              </article>
            );
          })}
          <p className="nm-muted nm-small">
            <Clock aria-hidden="true" /> DNS changes can take up to 48 hours. HTTPS is issued by the hosting platform after verification; the status above shows what the infrastructure reports.
          </p>
        </section>
      )}
    </>
  );
}

/* ============================================================================
 * Settings
 * ========================================================================== */

export function SettingsPage() {
  const { outlet, reload, notify } = useAdmin();
  const [f, setF] = useState({
    name: outlet.name,
    tagline: outlet.tagline,
    about: outlet.about,
    country: outlet.country,
    city: outlet.city,
    address: outlet.address,
    email: outlet.email,
    phone: outlet.phone,
    primaryLanguage: outlet.primaryLanguage,
    languages: outlet.languages,
    websiteUrl: outlet.websiteUrl,
    foundedYear: outlet.foundedYear ? String(outlet.foundedYear) : "",
    logoUrl: outlet.logoUrl,
    coverUrl: outlet.coverUrl,
    socials: { facebook: "", instagram: "", x: "", youtube: "", tiktok: "", whatsapp: "", ...outlet.socials } as Record<string, string>,
  });
  const [s, setS] = useState({ ...outlet.settings });
  const [busy, setBusy] = useState<string | null>(null);

  async function upload(kind: "logoUrl" | "coverUrl", file: File) {
    if (!file.type.startsWith("image/")) return notify("error", "Choose an image.");
    setBusy(kind);
    try {
      const url = await newsApi.uploadFile(file);
      setF((x) => ({ ...x, [kind]: url }));
    } catch (err) {
      notify("error", newsError(err, "The image could not be uploaded."));
    } finally {
      setBusy(null);
    }
  }
  async function save(ev: FormEvent) {
    ev.preventDefault();
    setBusy("save");
    try {
      await newsApi.updateOutlet(outlet.id, { ...f, foundedYear: f.foundedYear ? Number(f.foundedYear) : null, settings: s });
      notify("ok", "Settings saved.");
      reload();
    } catch (err) {
      notify("error", newsError(err));
    } finally {
      setBusy(null);
    }
  }
  return (
    <form onSubmit={save}>
      <PageTitle
        title="Settings"
        sub="Media profile, contact details and reader features."
        actions={
          <button type="submit" className="nm-btn nm-btn--primary" disabled={busy === "save"}>
            {busy === "save" && <Loader2 className="nm-spin" />} Save changes
          </button>
        }
      />
      <div className="nma-two">
        <section className="nm-card nm-form">
          <h2 className="nm-card__title">Profile</h2>
          <div className="nm-imgrow">
            <label className="nm-imgpick nm-imgpick--logo">
              {f.logoUrl ? <img src={f.logoUrl} alt="" /> : <span className="nm-imgpick__ph">Logo</span>}
              {busy === "logoUrl" && <Loader2 className="nm-spin" />}
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload("logoUrl", e.target.files[0])} />
            </label>
            <label className="nm-imgpick nm-imgpick--cover">
              {f.coverUrl ? <img src={f.coverUrl} alt="" /> : <span className="nm-imgpick__ph">Cover image</span>}
              {busy === "coverUrl" && <Loader2 className="nm-spin" />}
              <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload("coverUrl", e.target.files[0])} />
            </label>
          </div>
          <Field label="Media name" required>
            <input className="nm-input" value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Short description">
            <input className="nm-input" value={f.tagline} maxLength={400} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
          </Field>
          <Field label="About">
            <textarea className="nm-input" rows={5} maxLength={6000} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} />
          </Field>
          <div className="nm-form-row">
            <Field label="Country">
              <input className="nm-input" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} />
            </Field>
            <Field label="City">
              <input className="nm-input" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            </Field>
          </div>
          <Field label="Address">
            <input className="nm-input" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          </Field>
          <div className="nm-form-row">
            <Field label="Contact email">
              <input className="nm-input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className="nm-input" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            </Field>
          </div>
          <div className="nm-form-row">
            <Field label="Primary language">
              <select className="nm-input" value={f.primaryLanguage} onChange={(e) => setF({ ...f, primaryLanguage: e.target.value })}>
                {Object.entries(LANGUAGE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Founded">
              <input className="nm-input" inputMode="numeric" value={f.foundedYear} onChange={(e) => setF({ ...f, foundedYear: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
            </Field>
          </div>
          <Field label="Other languages">
            <div className="nm-checks nm-checks--inline">
              {Object.entries(LANGUAGE_LABELS)
                .filter(([k]) => k !== f.primaryLanguage)
                .map(([k, l]) => (
                  <label key={k} className="nm-check">
                    <input type="checkbox" checked={f.languages.includes(k)} onChange={(e) => setF({ ...f, languages: e.target.checked ? [...f.languages, k] : f.languages.filter((x) => x !== k) })} /> {l}
                  </label>
                ))}
            </div>
          </Field>
          <Field label="External website (optional)">
            <input className="nm-input" value={f.websiteUrl} onChange={(e) => setF({ ...f, websiteUrl: e.target.value })} placeholder="https://" />
          </Field>
          <h3 className="nm-h3">Social media</h3>
          <div className="nm-form-row nm-form-row--3">
            {Object.keys(f.socials).map((k) => (
              <Field key={k} label={k === "x" ? "X (Twitter)" : k[0].toUpperCase() + k.slice(1)}>
                <input className="nm-input" value={f.socials[k] ?? ""} onChange={(e) => setF({ ...f, socials: { ...f.socials, [k]: e.target.value } })} placeholder="https://" />
              </Field>
            ))}
          </div>
        </section>
        <section className="nm-card nm-form">
          <h2 className="nm-card__title">Reader features</h2>
          <label className="nm-check">
            <input type="checkbox" checked={s.commentsEnabled} onChange={(e) => setS({ ...s, commentsEnabled: e.target.checked })} /> Allow comments on articles
          </label>
          <label className="nm-check">
            <input type="checkbox" checked={s.donationsEnabled} onChange={(e) => setS({ ...s, donationsEnabled: e.target.checked })} /> Accept donations (Support This Media)
          </label>
          <label className="nm-check">
            <input type="checkbox" checked={s.requestsEnabled} onChange={(e) => setS({ ...s, requestsEnabled: e.target.checked })} /> Accept requests and news tips
          </label>
          <Field label="Donation currency">
            <select className="nm-input" value={s.currency} onChange={(e) => setS({ ...s, currency: e.target.value })}>
              {["USD", "EUR", "CAD", "GBP", "HTG", "DOP"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Support message" hint="Shown on your Support page.">
            <textarea className="nm-input" rows={3} maxLength={600} value={s.supportMessage} onChange={(e) => setS({ ...s, supportMessage: e.target.value })} placeholder="Your support helps us continue independent journalism, investigate important stories, and serve our community." />
          </Field>
          <h2 className="nm-card__title nm-mt">Verification</h2>
          <p className="nm-muted">{outlet.verified ? "Your media is officially verified by Fockis." : "The verification badge is granted only through Fockis's verification review. It cannot be added from here."}</p>
          <h2 className="nm-card__title nm-mt">Media type</h2>
          <p className="nm-muted">{MEDIA_TYPE_LABELS[outlet.mediaType] ?? outlet.mediaType}</p>
        </section>
      </div>
    </form>
  );
}
