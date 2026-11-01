import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Archive, ArrowLeft, BookOpenText, ExternalLink, Eye, EyeOff, ImagePlus, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";

import { buildFockisUploadUrl } from "../../../../config/fockisConfig";
import { HELP_TOPICS } from "../../../support/data/helpTopics";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { Card, Pill, SmEmpty, SmError, SmLoading, StatusPill, timeAgo, useAdminQuery, useConfirm } from "../components/SmParts";
import RowMenu, { type RowMenuItem } from "../components/RowMenu";
import { adminError, supportAdminApi, type AdminArticle, type ArticleInput } from "../supportAdminApi";

const TOPIC_TITLE = Object.fromEntries(HELP_TOPICS.map((t) => [t.id, t.title])) as Record<string, string>;

const toInput = (a: AdminArticle): ArticleInput => ({
  slug: a.slug,
  kind: a.kind,
  topic: a.topic,
  title: a.title,
  summary: a.summary,
  body: a.body,
  links: a.links,
  keywords: a.keywords,
  featured: a.featured,
  order: a.order,
});

/* ============================================================================
   LIST
============================================================================ */

export function ArticlesPage() {
  const navigate = useNavigate();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const kind = params.get("kind") ?? "";
  const topic = params.get("topic") ?? "";
  const search = params.get("q") ?? "";
  const [draft, setDraft] = useState(search);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const list = useAdminQuery(
    () => supportAdminApi.articles({ status: status || undefined, kind: kind || undefined, topic: topic || undefined, search: search || undefined }),
    [status, kind, topic, search],
  );
  const counts = list.data?.counts ?? {};

  const act = async (work: Promise<unknown>, success: string) => {
    try {
      await work;
      toast("success", success);
      void list.refetch();
    } catch (error) {
      toast("error", adminError(error));
    }
  };

  const menu = (a: AdminArticle): RowMenuItem[] => {
    const items: RowMenuItem[] = [{ label: "Edit", icon: <Pencil size={15} />, onSelect: () => navigate(`/admin/support/articles/${a.id}`) }];
    if (a.status !== "published") items.push({ label: "Publish", icon: <Eye size={15} />, onSelect: () => void act(supportAdminApi.articleStatus(a.id, "published"), "Published to the Help Center.") });
    if (a.status === "published") {
      items.push({ label: "Unpublish", icon: <EyeOff size={15} />, onSelect: () => void act(supportAdminApi.articleStatus(a.id, "draft"), "Moved back to drafts.") });
      if (a.kind === "article") items.push({ label: "View in Help Center", icon: <ExternalLink size={15} />, onSelect: () => window.open(`/help/articles/${a.slug}`, "_blank", "noopener") });
    }
    items.push({
      label: a.featured ? "Remove from featured" : "Feature",
      icon: <Star size={15} />,
      onSelect: () => void act(supportAdminApi.updateArticle(a.id, { ...toInput(a), featured: !a.featured }), a.featured ? "No longer featured." : "Featured."),
    });
    if (a.status !== "archived") items.push({ label: "Archive", icon: <Archive size={15} />, onSelect: () => void act(supportAdminApi.articleStatus(a.id, "archived"), "Archived.") });
    if (a.status === "draft")
      items.push({
        label: "Delete draft",
        icon: <Trash2 size={15} />,
        danger: true,
        onSelect: () =>
          confirm.ask({ title: "Delete this draft?", description: `"${a.title}" will be removed. Only drafts can be deleted; published items are archived instead.`, confirmLabel: "Delete draft", tone: "danger" }, async () => {
            await supportAdminApi.deleteArticle(a.id);
            toast("success", "Draft deleted.");
            void list.refetch();
          }),
      });
    return items;
  };

  const tabs = [
    { value: "", label: "All", count: (counts.draft ?? 0) + (counts.published ?? 0) + (counts.archived ?? 0) },
    { value: "published", label: "Published", count: counts.published ?? 0 },
    { value: "draft", label: "Drafts", count: counts.draft ?? 0 },
    { value: "archived", label: "Archived", count: counts.archived ?? 0 },
  ];

  return (
    <Card
      title="Help Articles Manager"
      icon={<BookOpenText size={20} />}
      action={
        <Link to="/admin/support/articles/new" className="fksm-btn fksm-btn--primary fksm-btn--sm">
          <Plus size={15} /> New article
        </Link>
      }
    >
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {tabs.map((t) => (
          <button key={t.label} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set("status", t.value)}>
            {t.label}
            {list.data && <em>{t.count}</em>}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set("q", draft.trim());
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search titles…" aria-label="Search articles" />
        </form>
        <select className="fksm-select" value={kind} onChange={(e) => set("kind", e.target.value)} aria-label="Kind">
          <option value="">Articles and FAQs</option>
          <option value="article">Articles</option>
          <option value="faq">FAQs</option>
        </select>
        <select className="fksm-select" value={topic} onChange={(e) => set("topic", e.target.value)} aria-label="Topic">
          <option value="">All topics</option>
          {HELP_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<BookOpenText size={24} />} title="No articles here" action={<Link to="/admin/support/articles/new" className="fksm-btn fksm-btn--primary fksm-btn--sm"><Plus size={15} /> Write an article</Link>} />
      ) : (
        <div className="fksm-table-wrap">
          <table className="fksm-table fksm-table--cards">
            <thead>
              <tr>
                <th>Title</th>
                <th>Kind</th>
                <th>Topic</th>
                <th>Status</th>
                <th>Updated</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((a) => (
                <tr key={a.id} className="is-clickable" onClick={() => navigate(`/admin/support/articles/${a.id}`)}>
                  <td>
                    <span className="fksm-subject">
                      <strong title={a.title}>
                        {a.featured && <Star size={13} style={{ color: "#e58a00", marginRight: 5, verticalAlign: -1 }} aria-label="Featured" />}
                        {a.title}
                      </strong>
                      <span>/{a.slug}</span>
                    </span>
                  </td>
                  <td><Pill tone={a.kind === "faq" ? "teal" : "purple"}>{a.kind === "faq" ? "FAQ" : "Article"}</Pill></td>
                  <td>{TOPIC_TITLE[a.topic] ?? a.topic}</td>
                  <td><StatusPill status={a.status} /></td>
                  <td className="fksm-date">{timeAgo(a.updatedAt)}</td>
                  <td className="fksm-actions-cell"><RowMenu items={menu(a)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirm.element}
    </Card>
  );
}

/* ============================================================================
   EDITOR
============================================================================ */

const EMPTY: ArticleInput = { slug: "", kind: "article", topic: "account", title: "", summary: "", body: [{ heading: "", text: "", steps: [], imageUrl: "" }], links: [], keywords: [], featured: false, order: 0 };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);

export function ArticleEditorPage() {
  const { articleId = "new" } = useParams();
  const isNew = articleId === "new";
  const navigate = useNavigate();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const existing = useAdminQuery(() => (isNew ? Promise.resolve(null) : supportAdminApi.article(articleId)), [articleId]);
  const [form, setForm] = useState<ArticleInput>(EMPTY);
  const [keywords, setKeywords] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<number | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef(0);
  const article = existing.data;

  useEffect(() => {
    if (article) {
      setForm(toInput(article));
      setKeywords(article.keywords.join(", "));
      setSlugTouched(true);
    }
  }, [article]);

  const patch = (next: Partial<ArticleInput>) => setForm((f) => ({ ...f, ...next }));
  const patchBlock = (i: number, next: Partial<ArticleInput["body"][number]>) => setForm((f) => ({ ...f, body: f.body.map((b, j) => (j === i ? { ...b, ...next } : b)) }));

  const save = async (status?: AdminArticle["status"]) => {
    setError(null);
    const payload: ArticleInput = {
      ...form,
      slug: form.slug.trim(),
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 30),
      body: form.body
        .map((b) => ({ ...b, steps: b.steps.map((s) => s.trim()).filter(Boolean) }))
        .filter((b) => b.heading.trim() || b.text.trim() || b.steps.length || b.imageUrl),
      links: form.links.filter((l) => l.label.trim() && l.to.trim()),
    };
    if (!payload.title.trim()) return setError("Add a title.");
    if (!payload.slug) return setError("Add a URL slug.");
    if (!payload.body.length) return setError("Add at least one section with text.");
    setSaving(true);
    try {
      let saved = isNew ? await supportAdminApi.createArticle(payload) : await supportAdminApi.updateArticle(articleId, payload);
      if (status && status !== saved.status) saved = await supportAdminApi.articleStatus(saved.id, status);
      toast("success", status === "published" ? "Saved and published." : "Saved.");
      if (isNew) navigate(`/admin/support/articles/${saved.id}`, { replace: true });
      else existing.setData(saved);
    } catch (err) {
      setError(adminError(err, "Couldn't save the article."));
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file: File | undefined) => {
    if (!file) return;
    const i = uploadTarget.current;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) return toast("error", "Use a PNG, JPG, WebP or GIF image.");
    if (file.size > 5 * 1024 * 1024) return toast("error", "Images can be up to 5 MB.");
    setUploading(i);
    try {
      const { url } = await supportAdminApi.articleImage(file);
      patchBlock(i, { imageUrl: url });
    } catch (err) {
      toast("error", adminError(err, "Upload failed."));
    } finally {
      setUploading(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  if (!isNew && existing.loading && !article) return <SmLoading label="Loading article…" />;
  if (!isNew && (existing.error || !article)) return <SmError message={existing.error ?? "Article not found."} onRetry={existing.refetch} />;

  const status = article?.status ?? "draft";

  return (
    <>
      <Link to="/admin/support/articles" className="fksm-back">
        <ArrowLeft size={16} /> Back to Help Articles
      </Link>
      <div className="fksm-detail">
        <Card>
          <div className="fksm-detail-head" style={{ marginBottom: 16 }}>
            <h2>{isNew ? "New help content" : "Edit help content"}</h2>
            {!isNew && <StatusPill status={status} />}
          </div>
          <div className="fksm-form-grid">
            <label className="fksm-field is-wide">
              <span>Title <b className="fksm-required">*</b></span>
              <input
                value={form.title}
                maxLength={200}
                onChange={(e) => patch({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                placeholder={form.kind === "faq" ? "The question, e.g. How do I change my username?" : "e.g. Reset your password"}
              />
            </label>
            <label className="fksm-field">
              <span>Type</span>
              <select value={form.kind} onChange={(e) => patch({ kind: e.target.value as ArticleInput["kind"] })}>
                <option value="article">Help article</option>
                <option value="faq">FAQ</option>
              </select>
            </label>
            <label className="fksm-field">
              <span>Topic</span>
              <select value={form.topic} onChange={(e) => patch({ topic: e.target.value })}>
                {HELP_TOPICS.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </label>
            <label className="fksm-field">
              <span>URL slug <b className="fksm-required">*</b></span>
              <input
                value={form.slug}
                maxLength={80}
                onChange={(e) => {
                  setSlugTouched(true);
                  patch({ slug: e.target.value.toLowerCase() });
                }}
              />
              <small>/help/articles/{form.slug || "…"}</small>
            </label>
            <label className="fksm-field">
              <span>Order</span>
              <input type="number" min={0} max={10000} value={form.order} onChange={(e) => patch({ order: Math.max(0, Number(e.target.value) || 0) })} />
              <small>Lower numbers show first.</small>
            </label>
            <label className="fksm-field is-wide">
              <span>{form.kind === "faq" ? "Short answer" : "Summary"}</span>
              <textarea rows={2} maxLength={1000} value={form.summary} onChange={(e) => patch({ summary: e.target.value })} />
            </label>
            <label className="fksm-field is-wide">
              <span>Search keywords</span>
              <input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="password, login, reset" />
              <small>Comma-separated. Helps people find this in Help search.</small>
            </label>
            <label className="fksm-check is-wide">
              <input type="checkbox" checked={form.featured} onChange={(e) => patch({ featured: e.target.checked })} /> Feature on the Help Center home
            </label>
          </div>

          <h3 style={{ margin: "22px 0 10px", fontSize: 15, fontWeight: 800, color: "#0f1e3d" }}>Sections</h3>
          <input ref={fileInput} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => void uploadImage(e.target.files?.[0])} />
          <div className="fksm-stack">
            {form.body.map((b, i) => (
              <div key={i} className="fksm-block">
                <div className="fksm-block__head">
                  <span>Section {i + 1}</span>
                  {form.body.length > 1 && (
                    <button type="button" className="fksm-icon-btn" aria-label={`Remove section ${i + 1}`} onClick={() => patch({ body: form.body.filter((_, j) => j !== i) })}>
                      <X size={16} />
                    </button>
                  )}
                </div>
                <label className="fksm-field">
                  <span>Heading</span>
                  <input value={b.heading} maxLength={200} onChange={(e) => patchBlock(i, { heading: e.target.value })} />
                </label>
                <label className="fksm-field">
                  <span>Text</span>
                  <textarea rows={4} maxLength={5000} value={b.text} onChange={(e) => patchBlock(i, { text: e.target.value })} />
                </label>
                <label className="fksm-field">
                  <span>Steps</span>
                  <textarea rows={3} value={b.steps.join("\n")} onChange={(e) => patchBlock(i, { steps: e.target.value.split("\n") })} placeholder="One step per line" />
                </label>
                <div className="fksm-row">
                  {b.imageUrl && <img src={buildFockisUploadUrl(b.imageUrl)} alt="" />}
                  <button
                    type="button"
                    className="fksm-btn fksm-btn--secondary fksm-btn--sm"
                    disabled={uploading !== null}
                    onClick={() => {
                      uploadTarget.current = i;
                      fileInput.current?.click();
                    }}
                  >
                    <ImagePlus size={15} /> {uploading === i ? "Uploading…" : b.imageUrl ? "Replace image" : "Add image"}
                  </button>
                  {b.imageUrl && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => patchBlock(i, { imageUrl: "" })}>
                      Remove image
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              className="fksm-btn fksm-btn--secondary fksm-btn--sm"
              style={{ alignSelf: "flex-start" }}
              disabled={form.body.length >= 30}
              onClick={() => patch({ body: [...form.body, { heading: "", text: "", steps: [], imageUrl: "" }] })}
            >
              <Plus size={15} /> Add section
            </button>
          </div>

          <h3 style={{ margin: "22px 0 10px", fontSize: 15, fontWeight: 800, color: "#0f1e3d" }}>Related links</h3>
          <div className="fksm-stack">
            {form.links.map((l, i) => (
              <div key={i} className="fksm-row" style={{ flexWrap: "nowrap" }}>
                <input className="fksm-input" style={{ flex: 1, minWidth: 0 }} value={l.label} placeholder="Label" aria-label="Link label" maxLength={80} onChange={(e) => patch({ links: form.links.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
                <input className="fksm-input" style={{ flex: 1, minWidth: 0 }} value={l.to} placeholder="/settings/security" aria-label="Link path" maxLength={300} onChange={(e) => patch({ links: form.links.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)) })} />
                <button type="button" className="fksm-icon-btn" aria-label="Remove link" onClick={() => patch({ links: form.links.filter((_, j) => j !== i) })}>
                  <X size={16} />
                </button>
              </div>
            ))}
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" style={{ alignSelf: "flex-start" }} disabled={form.links.length >= 10} onClick={() => patch({ links: [...form.links, { label: "", to: "" }] })}>
              <Plus size={15} /> Add link
            </button>
          </div>
        </Card>

        <div className="fksm-stack">
          <Card title="Publish">
            <div className="fksm-stack">
              {error && <p className="fksm-notice fksm-notice--error" role="alert">{error}</p>}
              <p className="fksm-muted" style={{ fontSize: 13 }}>
                {status === "published" ? "Changes go live in the Help Center as soon as you save." : "Drafts are only visible to staff until published."}
              </p>
              <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" disabled={saving} onClick={() => void save(status === "published" ? undefined : "published")}>
                {saving ? "Saving…" : status === "published" ? "Save changes" : "Save & publish"}
              </button>
              {status !== "published" && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" disabled={saving} onClick={() => void save()}>
                  Save draft
                </button>
              )}
              {status === "published" && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" disabled={saving} onClick={() => void save("draft")}>
                  Save &amp; unpublish
                </button>
              )}
              {!isNew && status === "published" && form.kind === "article" && (
                <a className="fksm-link" href={`/help/articles/${article?.slug}`} target="_blank" rel="noreferrer">
                  View in Help Center <ExternalLink size={13} />
                </a>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
