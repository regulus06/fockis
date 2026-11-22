import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import SiteRenderer from "../renderer/SiteRenderer";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { SiteContent } from "../types/content";
import type { WebsiteTemplate } from "../types/studio";
import CreateWebsiteDialog from "../components/marketplace/CreateWebsiteDialog";
import "../styles/studio.scss";

const WIDTH = { desktop: "100%", tablet: "820px", mobile: "390px" } as const;

/** Live, fully navigable preview of a template — rendered from real components, not a screenshot. */
export default function TemplatePreview() {
  const { slug = "" } = useParams();
  const [params] = useSearchParams();
  const [tpl, setTpl] = useState<(WebsiteTemplate & { content: SiteContent }) | null>(null);
  const [alts, setAlts] = useState<WebsiteTemplate[]>([]);
  const [page, setPage] = useState("");
  const [query, setQuery] = useState("");
  const [device, setDevice] = useState<keyof typeof WIDTH>("desktop");
  const [error, setError] = useState<string | null>(null);
  const [use, setUse] = useState(false);

  useEffect(() => {
    setTpl(null);
    setPage("");
    websiteStudioApi.template(slug).then((t) => {
      setTpl(t);
      const cat = params.get("category") ?? t.categorySlugs[0];
      if (cat) websiteStudioApi.templates({ category: cat }).then(setAlts).catch(() => undefined);
    }).catch((e) => setError(apiError(e)));
  }, [slug, params]);

  const runtime = useMemo(() => ({ siteId: null, kind: "template" as const, basePath: "", query: new URLSearchParams(query) }), [query]);

  if (error) return <div className="wst"><p className="wst-error wst-pad">{error}</p></div>;
  if (!tpl) return <div className="wst"><p className="wst-muted wst-pad">Loading preview…</p></div>;

  return (
    <div className="wst-preview">
      <header className="wst-preview__bar">
        <Link to={`/website-studio/templates${params.get("category") ? `?category=${params.get("category")}` : ""}`} className="wst-btn wst-btn--ghost wst-btn--sm"><Icon name="ChevronLeft" size={16} /> Templates</Link>
        <strong>{tpl.name}</strong>
        <select value={page} onChange={(e) => (setPage(e.target.value), setQuery(""))} aria-label="Page">
          {tpl.content.pages.filter((p) => p.visibility === "public").map((p) => <option key={p.id} value={p.isHomepage ? "" : p.slug}>{p.title}</option>)}
        </select>
        <div className="wst-seg">
          {(["desktop", "tablet", "mobile"] as const).map((d) => <button type="button" key={d} className={device === d ? "is-active" : ""} onClick={() => setDevice(d)}>{d}</button>)}
        </div>
        {alts.length > 1 ? (
          <select value={slug} onChange={(e) => (window.location.href = `/website-studio/templates/${e.target.value}${params.get("category") ? `?category=${params.get("category")}` : ""}`)} aria-label="Change design">
            {alts.map((a) => <option key={a.id} value={a.slug}>Design: {a.name}</option>)}
          </select>
        ) : null}
        <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" onClick={() => setUse(true)}>Use this template</button>
      </header>
      <div className="wst-preview__stage">
        <div className="wst-preview__frame" style={{ width: WIDTH[device] }}>
          <SiteRenderer content={tpl.content} pageSlug={page} mode="preview" runtime={runtime} onNavigate={(s, q) => { setPage(s === "home" ? "" : s); setQuery(q.replace(/^\?/, "")); window.scrollTo({ top: 0 }); }} />
        </div>
      </div>
      {use ? <CreateWebsiteDialog template={tpl} categorySlug={params.get("category")} onClose={() => setUse(false)} /> : null}
    </div>
  );
}

/** Side-by-side comparison of up to three designs. */
export function TemplateCompare() {
  const [params] = useSearchParams();
  const slugs = (params.get("slugs") ?? "").split(",").filter(Boolean).slice(0, 3);
  const [list, setList] = useState<(WebsiteTemplate & { content: SiteContent })[]>([]);
  useEffect(() => {
    Promise.all(slugs.map((s) => websiteStudioApi.template(s))).then(setList).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const runtime = useMemo(() => ({ siteId: null, kind: "template" as const, basePath: "", query: new URLSearchParams() }), []);
  return (
    <div className="wst-compare">
      <header className="wst-preview__bar"><Link to="/website-studio/templates" className="wst-btn wst-btn--ghost wst-btn--sm"><Icon name="ChevronLeft" size={16} /> Templates</Link><strong>Compare designs</strong></header>
      <div className="wst-compare__cols" style={{ gridTemplateColumns: `repeat(${Math.max(1, list.length)}, 1fr)` }}>
        {list.map((t) => (
          <div key={t.id} className="wst-compare__col">
            <div className="wst-compare__head">
              <strong>{t.name}</strong>
              <Link to={`/website-studio/templates/${t.slug}`} className="wst-btn wst-btn--primary wst-btn--sm">Choose</Link>
            </div>
            <div className="wst-compare__frame">
              <div style={{ width: 1280, zoom: 0.36 } as React.CSSProperties}>
                <SiteRenderer content={t.content} pageSlug="" mode="preview" runtime={runtime} onNavigate={() => undefined} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
