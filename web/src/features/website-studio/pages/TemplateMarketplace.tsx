import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { WebsiteCategory, WebsiteTemplate } from "../types/studio";
import TemplateThumb from "../components/marketplace/TemplateThumb";
import CreateWebsiteDialog from "../components/marketplace/CreateWebsiteDialog";
import { StudioNav, TemplateCard } from "./WebsiteStudioHome";
import "../styles/studio.scss";

export default function TemplateMarketplace() {
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "";
  const q = params.get("q") ?? "";
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [templates, setTemplates] = useState<WebsiteTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(q);
  const [use, setUse] = useState<WebsiteTemplate | null>(null);

  useEffect(() => void websiteStudioApi.categories().then(setCategories).catch(() => undefined), []);
  useEffect(() => {
    setTemplates(null);
    websiteStudioApi
      .templates({ category: category || undefined, q: q || undefined })
      .then(setTemplates)
      .catch((e) => setError(apiError(e)));
  }, [category, q]);

  const current = categories.find((c) => c.slug === category);
  const defaultTemplate = useMemo(() => (current && templates ? templates.find((t) => t.slug === current.defaultTemplateSlug) ?? templates[0] : null), [current, templates]);
  const groups = useMemo(() => {
    const m = new Map<string, WebsiteCategory[]>();
    categories.forEach((c) => m.set(c.group, [...(m.get(c.group) ?? []), c]));
    return [...m.entries()];
  }, [categories]);

  const setParam = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  return (
    <div className="wst">
      <StudioNav />
      <div className="wst-market">
        <aside className="wst-market__side">
          <form onSubmit={(e) => (e.preventDefault(), setParam("q", search))} className="wst-search wst-search--sm">
            <Icon name="Search" size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates" aria-label="Search templates" />
          </form>
          <button type="button" className={`wst-cat${!category ? " is-active" : ""}`} onClick={() => setParam("category", "")}>All templates</button>
          {groups.map(([g, list]) => (
            <div key={g} className="wst-cat-group">
              <h4>{g}</h4>
              {list.map((c) => (
                <button type="button" key={c.id} className={`wst-cat${c.slug === category ? " is-active" : ""}`} onClick={() => setParam("category", c.slug)}>
                  <Icon name={c.icon} size={15} /> {c.name}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <main className="wst-market__main">
          {error ? <p className="wst-error">{error}</p> : null}
          {current && defaultTemplate ? (
            <section className="wst-default">
              <Link to={`/website-studio/templates/${defaultTemplate.slug}?category=${current.slug}`} className="wst-default__media">
                <TemplateThumb template={defaultTemplate} tall />
              </Link>
              <div className="wst-default__body">
                <span className="wst-badge">Recommended for {current.name}</span>
                <h1>{defaultTemplate.name}</h1>
                <p>{defaultTemplate.description}</p>
                <p className="wst-muted">A complete website with real pages, sections and features. Everything is editable, and you can change the design later without losing your content.</p>
                <div className="wst-btnrow">
                  <button type="button" className="wst-btn wst-btn--primary" onClick={() => setUse(defaultTemplate)}>Start with this website</button>
                  <Link className="wst-btn wst-btn--ghost" to={`/website-studio/templates/${defaultTemplate.slug}?category=${current.slug}`}>Preview all pages</Link>
                </div>
              </div>
            </section>
          ) : (
            <h1 className="wst-market__title">{q ? `Results for “${q}”` : "All Templates"}</h1>
          )}
          {current ? <h2 className="wst-market__sub">More {current.name} designs</h2> : null}
          {!templates ? <p className="wst-muted">Loading templates…</p> : null}
          {templates && !templates.length ? <p className="wst-muted">No templates found. Try another category or search.</p> : null}
          <div className="wst-grid">
            {(templates ?? []).filter((t) => t.id !== defaultTemplate?.id).map((t) => <TemplateCard key={t.id} t={t} onUse={setUse} />)}
          </div>
        </main>
      </div>
      {use ? <CreateWebsiteDialog template={use} categorySlug={category || undefined} onClose={() => setUse(null)} /> : null}
    </div>
  );
}
