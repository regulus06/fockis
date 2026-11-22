/**
 * AdminArticles.tsx — newsroom CMS: article lists (all, editorial review,
 * scheduled, breaking) and the article editor with the editorial workflow,
 * distribution settings, SEO and the AI writing assistant.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Bold,
  CalendarClock,
  Check,
  CheckCircle2,
  Eye,
  FilePen,
  Heading2,
  Heading3,
  History,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Trash2,
  Underline,
  XCircle,
} from "lucide-react";

import { Empty, Modal, Skeleton, Thumb } from "../NewsParts";
import { ARTICLE_STATUS_LABELS, CATEGORY_LABELS, LANGUAGE_LABELS, compact, fmtDate, newsApi, newsError, timeAgo, type AiResult, type ArticleEditorData, type ArticleRow } from "../newsApi";
import { PageTitle, useAdmin } from "./AdminShell";

const STATUS_TONE: Record<string, string> = {
  draft: "grey",
  submitted: "amber",
  under_review: "purple",
  changes_requested: "red",
  approved: "blue",
  scheduled: "blue",
  published: "green",
  archived: "grey",
  rejected: "red",
};

export function StatusPill({ status }: { status: string }) {
  return <span className={`nma-pill nma-pill--${STATUS_TONE[status] ?? "grey"}`}>{ARTICLE_STATUS_LABELS[status] ?? status}</span>;
}

/* ============================================================================
 * Lists
 * ========================================================================== */

export function ArticlesPage({ preset = "all" }: { preset?: "all" | "review" | "scheduled" | "breaking" }) {
  const { outlet, can } = useAdmin();
  const [params, setParams] = useSearchParams();
  const status = preset === "review" ? "review" : preset === "scheduled" ? "scheduled" : params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: ArticleRow[]; total: number; counts: Record<string, number> } | null>(null);
  const [error, setError] = useState("");
  const base = `/news/admin/${outlet.id}`;

  useEffect(() => setPage(1), [status, q, mine, preset, category]);
  useEffect(() => {
    let alive = true;
    setError("");
    newsApi
      .listArticles(outlet.id, { status: status || undefined, q: q || undefined, mine: mine ? "true" : undefined, category: category || undefined, breaking: preset === "breaking" ? "true" : undefined, page })
      .then((r) => {
        if (!alive) return;
        const items = r.items;
        setData((prev) => (page > 1 && prev ? { ...r, items: [...prev.items, ...items] } : { ...r, items }));
      })
      .catch((err) => alive && setError(newsError(err)));
    return () => {
      alive = false;
    };
  }, [outlet.id, status, q, mine, page, preset, category]);

  const titles = { all: "Articles", review: "Editorial Review", scheduled: "Scheduled Articles", breaking: "Breaking News" } as const;
  const subs = {
    all: "Every article in your newsroom.",
    review: "Articles submitted by journalists and waiting for an editor.",
    scheduled: "Approved articles that will publish automatically.",
    breaking: "Stories marked as breaking news. Followers with Breaking News alerts are notified when they publish.",
  } as const;
  const tabs: [string, string][] = [
    ["", "All"],
    ["draft", "Drafts"],
    ["review", "In review"],
    ["changes_requested", "Changes requested"],
    ["approved", "Approved"],
    ["scheduled", "Scheduled"],
    ["published", "Published"],
    ["archived", "Archived"],
  ];
  const count = (k: string) => (k === "" ? Object.values(data?.counts ?? {}).reduce((a, b) => a + b, 0) : k === "review" ? (data?.counts.submitted ?? 0) + (data?.counts.under_review ?? 0) : data?.counts[k] ?? 0);

  return (
    <>
      <PageTitle
        title={titles[preset]}
        sub={subs[preset]}
        actions={
          can("write_articles") && (
            <Link to={`${base}/articles/new${preset === "breaking" ? "?breaking=1" : ""}`} className="nm-btn nm-btn--red">
              <FilePen /> Write News
            </Link>
          )
        }
      />
      {preset === "all" && (
        <div className="nm-tabs" role="tablist">
          {tabs.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={status === k}
              className={status === k ? "is-on" : ""}
              onClick={() => {
                const next = new URLSearchParams(params);
                if (k) next.set("status", k);
                else next.delete("status");
                setParams(next, { replace: true });
              }}
            >
              {l} <span>{count(k)}</span>
            </button>
          ))}
        </div>
      )}
      <div className="nma-toolbar">
        <input className="nm-input" placeholder="Search headlines…" value={q} onChange={(ev) => setQ(ev.target.value)} aria-label="Search headlines" />
        <label className="nm-check">
          <input type="checkbox" checked={mine} onChange={(ev) => setMine(ev.target.checked)} /> Only mine
        </label>
      </div>
      {error && <p className="nm-form-error">{error}</p>}
      {!data && !error && <Skeleton h={240} />}
      {data && data.items.length === 0 && <Empty title="Nothing here yet" text={preset === "review" ? "No articles are waiting for review." : "Articles you write appear here."} />}
      {data && data.items.length > 0 && (
        <section className="nm-card nm-card--flush">
          <div className="nm-tablewrap">
            <table className="nm-table nma-articles">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Status</th>
                  <th>Author</th>
                  <th>Distribution</th>
                  <th>Updated</th>
                  <th className="nm-num">Views</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={`${base}/articles/${a.id}`} className="nma-artcell">
                        <Thumb src={a.imageUrl} className="nma-artcell__img" />
                        <span>
                          <b>{a.headline}</b>
                          <small>
                            {CATEGORY_LABELS[a.category]} · {LANGUAGE_LABELS[a.language] ?? a.language}
                            {a.isBreaking && <span className="nm-tag-red nm-tag-red--sm">BREAKING</span>}
                            {a.aiAssisted && <span className="nma-pill nma-pill--purple">AI-assisted</span>}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <StatusPill status={a.status} />
                      {a.status === "scheduled" && a.publishedAt && <small className="nm-block">{fmtDate(a.publishedAt, true)}</small>}
                    </td>
                    <td>{a.authorName}</td>
                    <td>
                      <small className="nm-block">Website</small>
                      {a.distribution.fockisNews && <small className="nm-block nm-blue">+ Fockis News</small>}
                    </td>
                    <td>{timeAgo(a.updatedAt)}</td>
                    <td className="nm-num">{compact(a.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.items.length < data.total && (
            <button type="button" className="nm-btn nm-btn--ghost nm-more" onClick={() => setPage((p) => p + 1)}>
              Load more
            </button>
          )}
        </section>
      )}
    </>
  );
}

/* ============================================================================
 * Rich text
 * ========================================================================== */

const hostOfUrl = (u: string) => {
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/** A source whose name is itself a link to a different site than the link it opens. */
function sourceMismatch(s: { title: string; url: string }): { named: string; opens: string } | null {
  const t = s.title.trim();
  if (!s.url.trim() || !/^(https?:\/\/|www\.)\S+$/i.test(t)) return null;
  const named = hostOfUrl(t);
  const opens = hostOfUrl(s.url.trim());
  return named && opens && named !== opens ? { named, opens } : null;
}

function RichText({ html, onChange, disabled, onUpload }: { html: string; onChange: (html: string) => void; disabled: boolean; onUpload: () => Promise<string | null> }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const last = useRef(html);
  useEffect(() => {
    if (ref.current && html !== last.current) {
      ref.current.innerHTML = html;
      last.current = html;
    }
  }, [html]);
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const exec = (cmd: string, value?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, value);
    emit();
  };
  const emit = () => {
    const v = ref.current?.innerHTML ?? "";
    last.current = v;
    onChange(v);
  };
  const tools: [typeof Bold, string, () => void][] = [
    [Bold, "Bold", () => exec("bold")],
    [Italic, "Italic", () => exec("italic")],
    [Underline, "Underline", () => exec("underline")],
    [Heading2, "Heading", () => exec("formatBlock", "<h2>")],
    [Heading3, "Subheading", () => exec("formatBlock", "<h3>")],
    [Quote, "Quote", () => exec("formatBlock", "<blockquote>")],
    [List, "Bulleted list", () => exec("insertUnorderedList")],
    [ListOrdered, "Numbered list", () => exec("insertOrderedList")],
    [
      Link2,
      "Link",
      () => {
        const url = window.prompt("Link address (https://…)");
        if (url && /^https?:\/\//i.test(url)) exec("createLink", url);
      },
    ],
    [
      ImagePlus,
      "Insert image",
      async () => {
        const url = await onUpload();
        if (url) exec("insertImage", url);
      },
    ],
  ];
  return (
    <div className={`nma-rte${disabled ? " is-disabled" : ""}`}>
      <div className="nma-rte__bar" role="toolbar" aria-label="Formatting">
        {tools.map(([Icon, label, fn]) => (
          <button key={label} type="button" title={label} aria-label={label} onMouseDown={(ev) => ev.preventDefault()} onClick={() => void fn()} disabled={disabled}>
            <Icon />
          </button>
        ))}
        <button type="button" className="nma-rte__text" onMouseDown={(ev) => ev.preventDefault()} onClick={() => exec("formatBlock", "<p>")} disabled={disabled}>
          Paragraph
        </button>
      </div>
      <div ref={ref} className="nma-rte__area nm-article__body" contentEditable={!disabled} suppressContentEditableWarning onInput={emit} onBlur={emit} role="textbox" aria-multiline="true" aria-label="Article content" data-placeholder="Write your article…" />
    </div>
  );
}

/* ============================================================================
 * Editor
 * ========================================================================== */

type Draft = {
  headline: string;
  subtitle: string;
  body: string;
  excerpt: string;
  featuredImage: { url: string; caption: string; credit: string };
  gallery: { url: string; caption: string; credit: string }[];
  videoUrl: string;
  audioUrl: string;
  sources: { title: string; url: string }[];
  category: string;
  tags: string;
  language: string;
  country: string;
  city: string;
  seo: { title: string; description: string; canonicalUrl: string; shareImage: string };
  distribution: { fockisNews: boolean; fockisNewsAt: string };
  isBreaking: boolean;
  featureRequested: boolean;
  sponsored: boolean;
  commentsEnabled: boolean;
  aiAssisted: boolean;
};

const toLocal = (iso: string | null | undefined) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function fromArticle(a: ArticleEditorData | null, defaults: { language: string; country: string; city: string; breaking: boolean }): Draft {
  return {
    headline: a?.headline ?? "",
    subtitle: a?.subtitle ?? "",
    body: a?.body ?? "",
    excerpt: a?.excerpt ?? "",
    featuredImage: { url: a?.featuredImage?.url ?? "", caption: a?.featuredImage?.caption ?? "", credit: a?.featuredImage?.credit ?? "" },
    gallery: (a?.gallery ?? []).map((g) => ({ url: g.url, caption: g.caption ?? "", credit: g.credit ?? "" })),
    videoUrl: a?.videoUrl ?? "",
    audioUrl: a?.audioUrl ?? "",
    sources: (a?.sources ?? []).map((s) => ({ title: s.title, url: s.url ?? "" })),
    category: a?.category ?? "local",
    tags: (a?.tags ?? []).join(", "),
    language: a?.language ?? defaults.language,
    country: a?.country ?? defaults.country,
    city: a?.city ?? defaults.city,
    seo: { title: a?.seo.title ?? "", description: a?.seo.description ?? "", canonicalUrl: a?.seo.canonicalUrl ?? "", shareImage: a?.seo.shareImage ?? "" },
    distribution: { fockisNews: a?.distribution.fockisNews ?? true, fockisNewsAt: toLocal(a?.distribution.fockisNewsAt) },
    isBreaking: a?.isBreaking ?? defaults.breaking,
    featureRequested: a?.featureRequested ?? false,
    sponsored: a?.sponsored ?? false,
    commentsEnabled: a?.commentsEnabled ?? true,
    aiAssisted: a?.aiAssisted ?? false,
  };
}

function payload(d: Draft) {
  return {
    ...d,
    featuredImage: d.featuredImage.url ? d.featuredImage : null,
    tags: d.tags,
    distribution: { fockisNews: d.distribution.fockisNews, fockisNewsAt: d.distribution.fockisNewsAt ? new Date(d.distribution.fockisNewsAt).toISOString() : null },
  };
}

export function ArticleEditor() {
  const { outlet, can, notify } = useAdmin();
  const { articleId } = useParams<{ articleId?: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const base = `/news/admin/${outlet.id}`;
  const [article, setArticle] = useState<ArticleEditorData | null>(null);
  const [d, setD] = useState<Draft>(() => fromArticle(null, { language: outlet.primaryLanguage, country: outlet.country, city: outlet.city, breaking: params.get("breaking") === "1" && can("manage_breaking") }));
  const [loading, setLoading] = useState(Boolean(articleId));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [dialog, setDialog] = useState<null | { action: string } | "ai" | "history">(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const uploadResolver = useRef<((url: string | null) => void) | null>(null);
  const uploadKind = useRef<"featured" | "gallery" | "inline" | "video" | "audio" | "share">("featured");

  useEffect(() => {
    if (!articleId) return;
    setLoading(true);
    newsApi
      .getArticle(outlet.id, articleId)
      .then((a) => {
        setArticle(a);
        setD(fromArticle(a, { language: outlet.primaryLanguage, country: outlet.country, city: outlet.city, breaking: false }));
        setDirty(false);
      })
      .catch((err) => setError(newsError(err)))
      .finally(() => setLoading(false));
  }, [articleId, outlet.id, outlet.primaryLanguage, outlet.country, outlet.city]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (ev: BeforeUnloadEvent) => {
      ev.preventDefault();
      ev.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Before the first save there is no server answer yet, so use the role's own permissions.
  // (Publishing saves the article first; the server checks the permission again.)
  const perms = article?.permissions ?? { edit: can("write_articles"), submit: true, review: false, publish: can("publish_articles"), archive: false, restore: false, breaking: can("manage_breaking"), delete: false };
  const editable = perms.edit;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setDirty(true);
  };

  const pickFile = useCallback((kind: typeof uploadKind.current, accept: string) => {
    uploadKind.current = kind;
    if (fileInput.current) {
      fileInput.current.accept = accept;
      fileInput.current.click();
    }
    return new Promise<string | null>((resolve) => (uploadResolver.current = resolve));
  }, []);

  async function onFile(file: File | undefined) {
    const resolve = uploadResolver.current;
    uploadResolver.current = null;
    if (!file) return resolve?.(null);
    setBusy("upload");
    setError("");
    try {
      const url = await newsApi.uploadFile(file);
      const k = uploadKind.current;
      if (k === "featured") set("featuredImage", { ...d.featuredImage, url });
      if (k === "gallery") set("gallery", [...d.gallery, { url, caption: "", credit: "" }]);
      if (k === "video") set("videoUrl", url);
      if (k === "audio") set("audioUrl", url);
      if (k === "share") set("seo", { ...d.seo, shareImage: url });
      resolve?.(url);
    } catch (err) {
      setError(newsError(err, "The file could not be uploaded."));
      resolve?.(null);
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save(): Promise<ArticleEditorData | null> {
    if (d.headline.trim().length < 4) {
      setError("Write a headline.");
      return null;
    }
    setBusy("save");
    setError("");
    try {
      const saved = article ? await newsApi.updateArticle(outlet.id, article.id, payload(d)) : await newsApi.createArticle(outlet.id, payload(d));
      setArticle(saved);
      setDirty(false);
      if (!article) navigate(`${base}/articles/${saved.id}`, { replace: true });
      notify("ok", "Saved.");
      return saved;
    } catch (err) {
      setError(newsError(err, "The article could not be saved."));
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function act(action: string, extra: { note?: string; scheduledAt?: string; confirmAiReviewed?: boolean } = {}) {
    let current = article;
    if (dirty || !current) current = await save();
    if (!current) return;
    setBusy(action);
    setError("");
    try {
      const next = await newsApi.articleAction(outlet.id, current.id, { action, ...extra });
      setArticle(next);
      setD(fromArticle(next, { language: outlet.primaryLanguage, country: outlet.country, city: outlet.city, breaking: false }));
      setDialog(null);
      setDirty(false);
      const msg: Record<string, string> = {
        submit: "Submitted for review. Editors were notified.",
        start_review: "Review started.",
        request_changes: "Changes requested. The author was notified.",
        approve: "Approved.",
        reject: "Rejected.",
        publish: next.distribution.fockisNews ? "Published on your website and Fockis News." : "Published on your website.",
        schedule: "Scheduled.",
        archive: "Archived and removed from public pages.",
        restore: "Moved back to draft.",
      };
      notify("ok", msg[action] ?? "Done.");
    } catch (err) {
      setError(newsError(err));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!article || !window.confirm("Delete this article? This cannot be undone from the newsroom.")) return;
    setBusy("delete");
    try {
      await newsApi.deleteArticle(outlet.id, article.id);
      setDirty(false);
      notify("ok", "Article deleted.");
      navigate(`${base}/articles`);
    } catch (err) {
      setError(newsError(err));
      setBusy(null);
    }
  }

  if (loading) return <Skeleton h={500} />;

  const status = article?.status ?? "draft";
  return (
    <>
      <PageTitle
        title={article ? "Edit article" : "Write News"}
        sub={article ? undefined : "Write, then submit for review or publish if your role allows it."}
        actions={
          <>
            {article && <StatusPill status={status} />}
            {article && status === "published" && (
              <Link to={`/news/${outlet.slug}/${article.slug}`} className="nm-btn nm-btn--ghost" target="_blank">
                <Eye /> View
              </Link>
            )}
            {article && status !== "published" && (
              <Link to={`/news/${outlet.slug}/${article.slug}`} className="nm-btn nm-btn--ghost" target="_blank">
                <Eye /> Preview
              </Link>
            )}
            {article && (
              <button type="button" className="nm-btn nm-btn--ghost" onClick={() => setDialog("history")}>
                <History /> History
              </button>
            )}
          </>
        }
      />
      {article?.reviewNote && ["changes_requested", "rejected", "approved"].includes(status) && (
        <p className={`nm-note${status === "approved" ? "" : " nm-note--amber"}`}>
          <AlertTriangle /> Editor's note: {article.reviewNote}
        </p>
      )}
      {error && (
        <p className="nm-form-error" role="alert">
          {error}
        </p>
      )}
      <input ref={fileInput} type="file" hidden onChange={(ev) => onFile(ev.target.files?.[0])} />

      <div className="nma-editor">
        <div className="nma-editor__main">
          <section className="nm-card">
            <input className="nma-headline" placeholder="Headline" maxLength={220} value={d.headline} onChange={(ev) => set("headline", ev.target.value)} disabled={!editable} aria-label="Headline" />
            <input className="nma-subtitle" placeholder="Subtitle (optional)" maxLength={400} value={d.subtitle} onChange={(ev) => set("subtitle", ev.target.value)} disabled={!editable} aria-label="Subtitle" />
            <div className="nma-featured">
              {d.featuredImage.url ? (
                <div className="nma-featured__img">
                  <img src={d.featuredImage.url} alt="" />
                  {editable && (
                    <button type="button" className="nm-iconbtn" aria-label="Remove featured image" onClick={() => set("featuredImage", { url: "", caption: "", credit: "" })}>
                      <Trash2 />
                    </button>
                  )}
                </div>
              ) : (
                <button type="button" className="nma-featured__add" onClick={() => pickFile("featured", "image/*")} disabled={!editable || busy === "upload"}>
                  {busy === "upload" ? <Loader2 className="nm-spin" /> : <ImagePlus />} Add featured image
                </button>
              )}
              {d.featuredImage.url && (
                <div className="nm-form-row">
                  <input className="nm-input" placeholder="Caption" value={d.featuredImage.caption} onChange={(ev) => set("featuredImage", { ...d.featuredImage, caption: ev.target.value })} disabled={!editable} />
                  <input className="nm-input" placeholder="Image credit" value={d.featuredImage.credit} onChange={(ev) => set("featuredImage", { ...d.featuredImage, credit: ev.target.value })} disabled={!editable} />
                </div>
              )}
            </div>
            <RichText html={d.body} onChange={(v) => set("body", v)} disabled={!editable} onUpload={() => pickFile("inline", "image/*")} />
          </section>

          <section className="nm-card">
            <h2 className="nm-card__title">Gallery, video & audio</h2>
            <div className="nma-gallery">
              {d.gallery.map((g, i) => (
                <div key={g.url + i} className="nma-gallery__item">
                  <img src={g.url} alt="" />
                  <input className="nm-input" placeholder="Caption" value={g.caption} onChange={(ev) => set("gallery", d.gallery.map((x, j) => (j === i ? { ...x, caption: ev.target.value } : x)))} disabled={!editable} />
                  <input className="nm-input" placeholder="Credit" value={g.credit} onChange={(ev) => set("gallery", d.gallery.map((x, j) => (j === i ? { ...x, credit: ev.target.value } : x)))} disabled={!editable} />
                  {editable && (
                    <button type="button" className="nm-link nm-link--danger" onClick={() => set("gallery", d.gallery.filter((_, j) => j !== i))}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {editable && (
                <button type="button" className="nma-gallery__add" onClick={() => pickFile("gallery", "image/*")} disabled={busy === "upload"}>
                  <ImagePlus /> Add photo
                </button>
              )}
            </div>
            <div className="nm-form-row">
              <label className="nm-field">
                <span className="nm-field__label">Video</span>
                <span className="nma-inline">
                  <input className="nm-input" placeholder="https://… or upload" value={d.videoUrl} onChange={(ev) => set("videoUrl", ev.target.value)} disabled={!editable} />
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => pickFile("video", "video/*")} disabled={!editable}>
                    Upload
                  </button>
                </span>
              </label>
              <label className="nm-field">
                <span className="nm-field__label">Audio</span>
                <span className="nma-inline">
                  <input className="nm-input" placeholder="https://… or upload" value={d.audioUrl} onChange={(ev) => set("audioUrl", ev.target.value)} disabled={!editable} />
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => pickFile("audio", "audio/*")} disabled={!editable}>
                    Upload
                  </button>
                </span>
              </label>
            </div>
          </section>

          <section className="nm-card">
            <h2 className="nm-card__title">References & sources</h2>
            <p className="nm-muted nm-small">Name the source (for example, a newspaper or report) and paste the exact page address readers should open.</p>
            {d.sources.map((s, i) => (
              <div key={i} className="nm-source-edit">
              <div className="nm-form-row">
                <input className="nm-input" placeholder="Source name" aria-label={`Source ${i + 1} name`} value={s.title} onChange={(ev) => set("sources", d.sources.map((x, j) => (j === i ? { ...x, title: ev.target.value } : x)))} disabled={!editable} />
                <input className="nm-input" placeholder="Link (https://…)" aria-label={`Source ${i + 1} link`} value={s.url} onChange={(ev) => set("sources", d.sources.map((x, j) => (j === i ? { ...x, url: ev.target.value } : x)))} disabled={!editable} />
                {editable && (
                  <button type="button" className="nm-iconbtn" aria-label="Remove source" onClick={() => set("sources", d.sources.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </button>
                )}
              </div>
              {sourceMismatch(s) && (
                <p className="nm-field__error" role="alert">
                  The name is a link to {sourceMismatch(s)?.named}, but the link opens {sourceMismatch(s)?.opens}. Readers will be sent to {sourceMismatch(s)?.opens}. Fix one of them.
                </p>
              )}
              </div>
            ))}
            {editable && (
              <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => set("sources", [...d.sources, { title: "", url: "" }])}>
                Add source
              </button>
            )}
          </section>

          <section className="nm-card">
            <h2 className="nm-card__title">SEO & sharing</h2>
            <label className="nm-field">
              <span className="nm-field__label">SEO title ({d.seo.title.length}/70)</span>
              <input className="nm-input" maxLength={70} value={d.seo.title} onChange={(ev) => set("seo", { ...d.seo, title: ev.target.value })} disabled={!editable} />
            </label>
            <label className="nm-field">
              <span className="nm-field__label">SEO description ({d.seo.description.length}/170)</span>
              <textarea className="nm-input" rows={2} maxLength={170} value={d.seo.description} onChange={(ev) => set("seo", { ...d.seo, description: ev.target.value })} disabled={!editable} />
            </label>
            <div className="nm-form-row">
              <label className="nm-field">
                <span className="nm-field__label">Canonical URL</span>
                <input className="nm-input" placeholder="https://your-site/article" value={d.seo.canonicalUrl} onChange={(ev) => set("seo", { ...d.seo, canonicalUrl: ev.target.value })} disabled={!editable} />
              </label>
              <label className="nm-field">
                <span className="nm-field__label">Social sharing image</span>
                <span className="nma-inline">
                  <input className="nm-input" placeholder="Uses the featured image if empty" value={d.seo.shareImage} onChange={(ev) => set("seo", { ...d.seo, shareImage: ev.target.value })} disabled={!editable} />
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => pickFile("share", "image/*")} disabled={!editable}>
                    Upload
                  </button>
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className="nma-editor__side">
          <section className="nm-card">
            <h2 className="nm-card__title">Publishing</h2>
            <div className="nma-actions">
              {editable && (
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={save} disabled={Boolean(busy)}>
                  {busy === "save" ? <Loader2 className="nm-spin" /> : <Save />} Save draft
                </button>
              )}
              {(!article || perms.submit) && (
                <button type="button" className="nm-btn nm-btn--primary nm-btn--block" onClick={() => act("submit")} disabled={Boolean(busy)}>
                  <Send /> Submit for Review
                </button>
              )}
              {perms.review && status === "submitted" && (
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={() => act("start_review")} disabled={Boolean(busy)}>
                  Start review
                </button>
              )}
              {perms.review && (
                <>
                  <button type="button" className="nm-btn nm-btn--green nm-btn--block" onClick={() => setDialog({ action: "approve" })} disabled={Boolean(busy)}>
                    <CheckCircle2 /> Approve
                  </button>
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={() => setDialog({ action: "request_changes" })} disabled={Boolean(busy)}>
                    <RotateCcw /> Request changes
                  </button>
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--block nm-danger-text" onClick={() => setDialog({ action: "reject" })} disabled={Boolean(busy)}>
                    <XCircle /> Reject
                  </button>
                </>
              )}
              {perms.publish && (
                <>
                  <button type="button" className="nm-btn nm-btn--red nm-btn--block" onClick={() => setDialog({ action: "publish" })} disabled={Boolean(busy)}>
                    <Check /> Publish now
                  </button>
                  <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={() => setDialog({ action: "schedule" })} disabled={Boolean(busy)}>
                    <CalendarClock /> Schedule
                  </button>
                </>
              )}
              {perms.archive && (
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={() => window.confirm("Unpublish and archive this article?") && act("archive")} disabled={Boolean(busy)}>
                  <Archive /> Archive (unpublish)
                </button>
              )}
              {perms.restore && (
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={() => act("restore")} disabled={Boolean(busy)}>
                  <RotateCcw /> Move back to draft
                </button>
              )}
              {article && perms.delete && (
                <button type="button" className="nm-link nm-link--danger" onClick={remove} disabled={Boolean(busy)}>
                  <Trash2 /> Delete article
                </button>
              )}
            </div>
            {!can("publish_articles") && <p className="nm-muted nm-small">Your role can't publish. An editor reviews and publishes your work.</p>}
          </section>

          <section className="nm-card">
            <h2 className="nm-card__title">Distribution</h2>
            <label className="nm-radio">
              <input type="radio" name="dist" checked={!d.distribution.fockisNews} onChange={() => set("distribution", { ...d.distribution, fockisNews: false })} disabled={!editable} /> Publish on Website Only
            </label>
            <label className="nm-radio">
              <input type="radio" name="dist" checked={d.distribution.fockisNews} onChange={() => set("distribution", { ...d.distribution, fockisNews: true })} disabled={!editable} /> Publish on Website + Fockis News
            </label>
            {d.distribution.fockisNews && (
              <label className="nm-field">
                <span className="nm-field__label">Schedule Fockis News distribution (optional)</span>
                <input className="nm-input" type="datetime-local" value={d.distribution.fockisNewsAt} onChange={(ev) => set("distribution", { ...d.distribution, fockisNewsAt: ev.target.value })} disabled={!editable} />
                <small>Leave empty to appear on Fockis News when the article is published.</small>
              </label>
            )}
            {can("publish_articles") && d.distribution.fockisNews && (
              <label className="nm-check">
                <input type="checkbox" checked={d.featureRequested} onChange={(ev) => set("featureRequested", ev.target.checked)} disabled={!editable} /> Request featured placement on Fockis News
              </label>
            )}
            <p className="nm-muted nm-small">Only published articles appear on Fockis News. Drafts and reviews stay private.</p>
          </section>

          <section className="nm-card">
            <h2 className="nm-card__title">Details</h2>
            <label className="nm-field">
              <span className="nm-field__label">Category</span>
              <select className="nm-input" value={d.category} onChange={(ev) => set("category", ev.target.value)} disabled={!editable}>
                {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="nm-field">
              <span className="nm-field__label">Tags (comma separated)</span>
              <input className="nm-input" value={d.tags} onChange={(ev) => set("tags", ev.target.value)} disabled={!editable} />
            </label>
            <label className="nm-field">
              <span className="nm-field__label">Language</span>
              <select className="nm-input" value={d.language} onChange={(ev) => set("language", ev.target.value)} disabled={!editable}>
                {Object.entries(LANGUAGE_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <div className="nm-form-row">
              <label className="nm-field">
                <span className="nm-field__label">City</span>
                <input className="nm-input" value={d.city} onChange={(ev) => set("city", ev.target.value)} disabled={!editable} />
              </label>
              <label className="nm-field">
                <span className="nm-field__label">Country</span>
                <input className="nm-input" value={d.country} onChange={(ev) => set("country", ev.target.value)} disabled={!editable} />
              </label>
            </div>
            <label className="nm-field">
              <span className="nm-field__label">Summary / excerpt</span>
              <textarea className="nm-input" rows={3} maxLength={500} value={d.excerpt} onChange={(ev) => set("excerpt", ev.target.value)} disabled={!editable} />
            </label>
            {perms.breaking && (
              <label className="nm-check">
                <input type="checkbox" checked={d.isBreaking} onChange={(ev) => set("isBreaking", ev.target.checked)} disabled={!editable} /> Breaking news
              </label>
            )}
            <label className="nm-check">
              <input type="checkbox" checked={d.sponsored} onChange={(ev) => set("sponsored", ev.target.checked)} disabled={!editable} /> Sponsored content (labeled)
            </label>
            <label className="nm-check">
              <input type="checkbox" checked={d.commentsEnabled} onChange={(ev) => set("commentsEnabled", ev.target.checked)} disabled={!editable} /> Allow comments
            </label>
            <p className="nm-muted nm-small">Author: {article?.authorName ?? "You"}</p>
          </section>

          {editable && (
            <section className="nm-card nma-aicard">
              <h2 className="nm-card__title">
                <Sparkles /> AI Writing Assistant
              </h2>
              <p className="nm-muted nm-small">Drafts, headlines, grammar, summaries, translations, SEO, categories and social captions. A person must review AI content before publication.</p>
              <button type="button" className="nm-btn nm-btn--ghost nm-btn--block" onClick={() => setDialog("ai")}>
                <Sparkles /> Open assistant
              </button>
              {d.aiAssisted && <span className="nma-pill nma-pill--purple">AI-assisted</span>}
            </section>
          )}
        </aside>
      </div>

      {dialog && typeof dialog === "object" && (
        <ActionDialog
          action={dialog.action}
          aiAssisted={d.aiAssisted}
          fockisNews={d.distribution.fockisNews}
          busy={Boolean(busy)}
          onClose={() => setDialog(null)}
          onConfirm={(extra) => act(dialog.action, extra)}
        />
      )}
      {dialog === "ai" && (
        <AiDialog
          outletId={outlet.id}
          draft={d}
          onClose={() => setDialog(null)}
          onApply={(patch) => {
            setD((x) => ({ ...x, ...patch, aiAssisted: true }));
            setDirty(true);
            setDialog(null);
            notify("ok", "Suggestion applied. Review it carefully before publishing.");
          }}
        />
      )}
      {dialog === "history" && article && (
        <Modal title="Revision history" onClose={() => setDialog(null)}>
          <ol className="nma-history">
            {article.revisions.map((r, i) => (
              <li key={i}>
                <b>{r.action}</b> by {r.byName} · {fmtDate(r.at, true)}
                {r.note && <p>{r.note}</p>}
              </li>
            ))}
          </ol>
        </Modal>
      )}
    </>
  );
}

function ActionDialog({ action, aiAssisted, fockisNews, busy, onClose, onConfirm }: { action: string; aiAssisted: boolean; fockisNews: boolean; busy: boolean; onClose: () => void; onConfirm: (extra: { note?: string; scheduledAt?: string; confirmAiReviewed?: boolean }) => void }) {
  const [note, setNote] = useState("");
  const [when, setWhen] = useState("");
  const [aiOk, setAiOk] = useState(false);
  const titles: Record<string, string> = { approve: "Approve article", request_changes: "Request changes", reject: "Reject article", publish: "Publish article", schedule: "Schedule publication" };
  const needsNote = action === "request_changes" || action === "reject";
  const publishing = action === "publish" || action === "schedule";
  return (
    <Modal
      title={titles[action] ?? action}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="nm-btn nm-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={`nm-btn ${action === "reject" ? "nm-btn--danger" : publishing ? "nm-btn--red" : "nm-btn--primary"}`}
            disabled={busy || (needsNote && !note.trim()) || (action === "schedule" && !when) || (publishing && aiAssisted && !aiOk)}
            onClick={() => onConfirm({ note: note.trim() || undefined, scheduledAt: when ? new Date(when).toISOString() : undefined, confirmAiReviewed: aiOk })}
          >
            {busy && <Loader2 className="nm-spin" />} {titles[action]}
          </button>
        </>
      }
    >
      {publishing && <p>{fockisNews ? "The article will appear on your website and on central Fockis News." : "The article will appear on your website only."} Followers who turned on the matching alerts will be notified.</p>}
      {action === "schedule" && (
        <label className="nm-field">
          <span className="nm-field__label">Publication date & time</span>
          <input className="nm-input" type="datetime-local" value={when} onChange={(ev) => setWhen(ev.target.value)} />
        </label>
      )}
      {(needsNote || action === "approve") && (
        <label className="nm-field">
          <span className="nm-field__label">{needsNote ? "Note to the author (required)" : "Note (optional)"}</span>
          <textarea className="nm-input" rows={4} maxLength={2000} value={note} onChange={(ev) => setNote(ev.target.value)} />
        </label>
      )}
      {publishing && aiAssisted && (
        <label className="nm-check nm-note nm-note--amber">
          <input type="checkbox" checked={aiOk} onChange={(ev) => setAiOk(ev.target.checked)} /> This article used the AI assistant. I reviewed and verified it before publication.
        </label>
      )}
    </Modal>
  );
}

const AI_ACTIONS: [string, string][] = [
  ["draft", "Generate a draft from notes"],
  ["headline", "Improve the headline"],
  ["grammar", "Correct grammar"],
  ["summary", "Summarize"],
  ["translate", "Translate"],
  ["seo", "Write SEO title & description"],
  ["categories", "Suggest category & tags"],
  ["captions", "Social media captions"],
];

function AiDialog({ outletId, draft, onClose, onApply }: { outletId: string; draft: Draft; onClose: () => void; onApply: (patch: Partial<Draft>) => void }) {
  const [action, setAction] = useState("headline");
  const [target, setTarget] = useState(draft.language === "en" ? "fr" : "en");
  const [res, setRes] = useState<AiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    setBusy(true);
    setError("");
    setRes(null);
    try {
      setRes(await newsApi.ai(outletId, { action, headline: draft.headline, subtitle: draft.subtitle, body: draft.body, language: draft.language, targetLanguage: target }));
    } catch (err) {
      setError(newsError(err, "The assistant is not available right now."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="AI Writing Assistant" subtitle="Suggestions only — nothing is published automatically." onClose={onClose} wide busy={busy}>
      <div className="nma-ai">
        <div className="nma-ai__actions" role="radiogroup">
          {AI_ACTIONS.map(([k, l]) => (
            <button key={k} type="button" role="radio" aria-checked={action === k} className={action === k ? "is-on" : ""} onClick={() => setAction(k)}>
              {l}
            </button>
          ))}
        </div>
        {action === "translate" && (
          <label className="nm-field">
            <span className="nm-field__label">Translate to</span>
            <select className="nm-input" value={target} onChange={(ev) => setTarget(ev.target.value)}>
              {Object.entries(LANGUAGE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </label>
        )}
        {action === "draft" && <p className="nm-muted nm-small">Write your notes in the article body first. The assistant never invents facts or quotes.</p>}
        <button type="button" className="nm-btn nm-btn--primary" onClick={run} disabled={busy}>
          {busy ? <Loader2 className="nm-spin" /> : <Sparkles />} Generate
        </button>
        {error && <p className="nm-form-error">{error}</p>}
        {res && (
          <div className="nma-ai__result">
            {res.headlines.length > 0 && (
              <ul className="nma-ai__list">
                {res.headlines.map((h) => (
                  <li key={h}>
                    <span>{h}</span>
                    <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => onApply({ headline: h })}>
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {res.summary && (
              <div>
                <p>{res.summary}</p>
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => onApply({ excerpt: res.summary })}>
                  Use as summary
                </button>
              </div>
            )}
            {(res.seo.title || res.seo.description) && (
              <div>
                <p>
                  <b>{res.seo.title}</b>
                  <br />
                  {res.seo.description}
                </p>
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => onApply({ seo: { ...draft.seo, title: res.seo.title, description: res.seo.description } })}>
                  Use for SEO
                </button>
              </div>
            )}
            {res.category && (
              <div>
                <p>
                  Category: <b>{CATEGORY_LABELS[res.category]}</b> · Tags: {res.tags.join(", ")}
                </p>
                <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => onApply({ category: res.category, tags: res.tags.join(", ") })}>
                  Apply
                </button>
              </div>
            )}
            {res.captions.length > 0 && (
              <ul className="nma-ai__list">
                {res.captions.map((c) => (
                  <li key={c}>
                    <span>{c}</span>
                    <button type="button" className="nm-btn nm-btn--ghost nm-btn--sm" onClick={() => navigator.clipboard?.writeText(c)}>
                      Copy
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {res.bodyHtml && (
              <div>
                {res.headline && <h3>{res.headline}</h3>}
                {res.subtitle && <p className="nm-muted">{res.subtitle}</p>}
                <div className="nma-ai__preview nm-article__body" dangerouslySetInnerHTML={{ __html: res.bodyHtml }} />
                <button
                  type="button"
                  className="nm-btn nm-btn--primary nm-btn--sm"
                  onClick={() => onApply({ body: res.bodyHtml, ...(res.headline ? { headline: res.headline } : {}), ...(res.subtitle ? { subtitle: res.subtitle } : {}), ...(action === "translate" ? { language: target } : {}) })}
                >
                  Replace article text
                </button>
              </div>
            )}
            <p className="nm-note nm-note--amber">{res.notice}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
