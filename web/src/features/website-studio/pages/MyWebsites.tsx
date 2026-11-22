import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { WebsiteSummary, WebsiteTemplate } from "../types/studio";
import { StudioNav } from "./WebsiteStudioHome";
import "../styles/studio.scss";

type Tab = "all" | "recent" | "published" | "draft";

export default function MyWebsites() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<WebsiteSummary[] | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<"updated" | "name" | "created">("updated");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => websiteStudioApi.myWebsites().then(setSites).catch((e) => setError(apiError(e, "Sign in to see your websites.")));
  useEffect(() => {
    void load();
    websiteStudioApi.templates({}).then((list: WebsiteTemplate[]) => setThumbs(Object.fromEntries(list.map((t) => [t.slug, t.thumbnail])))).catch(() => undefined);
  }, []);

  const list = useMemo(() => {
    let out = [...(sites ?? [])];
    if (tab === "published") out = out.filter((s) => s.status === "published");
    if (tab === "draft") out = out.filter((s) => s.status === "draft");
    if (tab === "recent") out = out.filter((s) => Date.now() - new Date(s.updatedAt).getTime() < 7 * 86400000);
    if (category) out = out.filter((s) => s.categorySlug === category);
    if (q.trim()) out = out.filter((s) => `${s.name} ${s.slug} ${s.primaryDomain ?? ""}`.toLowerCase().includes(q.toLowerCase()));
    if (sort === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else out.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return out;
  }, [sites, tab, q, category, sort]);

  const categories = useMemo(() => [...new Set((sites ?? []).map((s) => s.categorySlug).filter(Boolean))] as string[], [sites]);

  const act = async (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="wst">
      <StudioNav />
      <div className="wst-dash">
        <div className="wst-dash__head">
          <h1>My Websites</h1>
          <Link to="/website-studio" className="wst-btn wst-btn--primary"><Icon name="Plus" size={16} /> Create Website</Link>
        </div>
        <div className="wst-dash__tools">
          <div className="wst-seg">
            {([["all", "All"], ["recent", "Recently Edited"], ["published", "Published"], ["draft", "Drafts"]] as [Tab, string][]).map(([k, l]) => (
              <button type="button" key={k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>
          <input className="wst-input" placeholder="Search websites" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="wst-input" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="wst-input" value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Sort">
            <option value="updated">Last updated</option>
            <option value="name">Name</option>
          </select>
        </div>
        {error ? <p className="wst-error">{error}</p> : null}
        {!sites && !error ? <p className="wst-muted">Loading…</p> : null}
        {sites && !sites.length ? (
          <div className="wst-empty">
            <Icon name="LayoutGrid" size={40} />
            <h3>No websites yet</h3>
            <p>Choose a template, build with AI or start from scratch.</p>
            <Link to="/website-studio" className="wst-btn wst-btn--primary">Create your first website</Link>
          </div>
        ) : null}
        <div className="wst-sites">
          {list.map((s) => (
            <article key={s.id} className={`wst-site${busyId === s.id ? " is-busy" : ""}`}>
              <div className="wst-site__thumb" onClick={() => navigate(`/website-studio/editor/${s.id}`)}>
                {s.thumbnail || (s.templateSlug && thumbs[s.templateSlug]) ? <img src={s.thumbnail || thumbs[s.templateSlug!]} alt="" loading="lazy" /> : <Icon name="LayoutGrid" size={36} />}
                <span className={`wst-status wst-status--${s.status}`}>{s.status}</span>
              </div>
              <div className="wst-site__body">
                <h3>{s.name}</h3>
                <p className="wst-muted">{s.categoryName ?? s.categorySlug ?? "Website"} · {s.templateName ?? "Custom design"}</p>
                <a href={s.url} target="_blank" rel="noreferrer" className="wst-site__url">{s.url.replace(/^https?:\/\//, "")}</a>
                <small className="wst-muted">Updated {new Date(s.updatedAt).toLocaleString()}{s.role !== "owner" ? ` · ${s.role}` : ""}</small>
                <div className="wst-site__actions">
                  <Link to={`/website-studio/editor/${s.id}`} className="wst-btn wst-btn--primary wst-btn--sm">Edit</Link>
                  <Link to={`/website-studio/preview/${s.id}`} className="wst-btn wst-btn--ghost wst-btn--sm" target="_blank">Preview</Link>
                  {s.status === "published" ? (
                    <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => window.confirm("Unpublish this website?") && act(s.id, () => websiteStudioApi.unpublish(s.id))}>Unpublish</button>
                  ) : s.status === "draft" ? (
                    <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => act(s.id, () => websiteStudioApi.publish(s.id))}>Publish</button>
                  ) : null}
                  <Link to={`/website-studio/websites/${s.id}/settings?tab=domains`} className="wst-btn wst-btn--ghost wst-btn--sm">Domain</Link>
                  <Link to={`/website-studio/websites/${s.id}/settings?tab=analytics`} className="wst-btn wst-btn--ghost wst-btn--sm">Analytics</Link>
                  <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => act(s.id, () => websiteStudioApi.duplicateWebsite(s.id))}>Duplicate</button>
                  {s.role === "owner" ? (
                    <button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={() => window.prompt(`Type the website name to delete it permanently:\n${s.name}`) === s.name && act(s.id, () => websiteStudioApi.deleteWebsite(s.id))}>Delete</button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
