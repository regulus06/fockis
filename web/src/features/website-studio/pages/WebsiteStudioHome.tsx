import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { websiteStudioApi } from "../services/websiteStudioApi";
import { getToken } from "../../../utils/auth";
import type { WebsiteCategory, WebsiteSummary, WebsiteTemplate } from "../types/studio";
import TemplateThumb from "../components/marketplace/TemplateThumb";
import CreateWebsiteDialog from "../components/marketplace/CreateWebsiteDialog";
import "../styles/studio.scss";

export function StudioNav() {
  return (
    <nav className="wst-nav">
      <Link to="/website-studio" className="wst-nav__brand"><Icon name="LayoutGrid" size={20} /> Fockis Website Studio</Link>
      <div className="wst-nav__links">
        <Link to="/website-studio/templates">Templates</Link>
        <Link to="/website-studio/ai">Build with AI</Link>
        <Link to="/website-studio/my-websites">My Websites</Link>
      </div>
    </nav>
  );
}

export function TemplateCard({ t, onUse }: { t: WebsiteTemplate; onUse?: (t: WebsiteTemplate) => void }) {
  return (
    <article className="wst-tcard">
      <Link to={`/website-studio/templates/${t.slug}`} className="wst-tcard__media">
        <TemplateThumb template={t} />
        {t.isOfficial && t.isDefault ? <span className="wst-badge">Original</span> : null}
        {t.accessLevel === "premium" ? <span className="wst-badge wst-badge--gold">Premium</span> : null}
      </Link>
      <div className="wst-tcard__body">
        <h3>{t.name}</h3>
        <p>{t.description}</p>
        <div className="wst-tcard__actions">
          <Link to={`/website-studio/templates/${t.slug}`} className="wst-btn wst-btn--ghost wst-btn--sm">Preview</Link>
          {onUse ? <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" onClick={() => onUse(t)}>Use template</button> : null}
        </div>
      </div>
    </article>
  );
}

export default function WebsiteStudioHome() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [featured, setFeatured] = useState<WebsiteTemplate[]>([]);
  const [recommended, setRecommended] = useState<WebsiteTemplate[]>([]);
  const [mine, setMine] = useState<WebsiteSummary[]>([]);
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<null | { mode: "template" | "scratch" | "import"; template?: WebsiteTemplate }>(null);
  const loggedIn = Boolean(getToken());

  useEffect(() => {
    websiteStudioApi.categories().then(setCategories).catch(() => undefined);
    websiteStudioApi.templates({ featured: true }).then(setFeatured).catch(() => undefined);
    websiteStudioApi.templates({}).then((all) => setRecommended(all.filter((t) => t.isOfficial).slice(0, 8))).catch(() => undefined);
    if (loggedIn) websiteStudioApi.myWebsites().then(setMine).catch(() => undefined);
  }, [loggedIn]);

  const popular = useMemo(() => [...categories].sort((a, b) => (b.templateCount ?? 0) - (a.templateCount ?? 0)).slice(0, 12), [categories]);
  const groups = useMemo(() => {
    const m = new Map<string, WebsiteCategory[]>();
    categories.forEach((c) => m.set(c.group, [...(m.get(c.group) ?? []), c]));
    return [...m.entries()];
  }, [categories]);

  const options = [
    { icon: "LayoutGrid", title: "Choose a Template", text: "Start with a complete, professional website for your industry.", action: () => navigate("/website-studio/templates") },
    { icon: "Sparkles", title: "Build with AI", text: "Describe your business and get a ready-to-edit website.", action: () => navigate("/website-studio/ai") },
    { icon: "PenLine", title: "Start from Scratch", text: "Begin with a blank page and add sections your way.", action: () => setDialog({ mode: "scratch" }) },
    { icon: "Repeat", title: "Import a Design", text: "Bring in a design exported from Fockis Website Studio.", action: () => setDialog({ mode: "import" }) },
  ];

  return (
    <div className="wst">
      <StudioNav />
      <section className="wst-hero">
        <h1>What would you like to create?</h1>
        <p>Create a professional website for your business, organization, or personal brand. Choose a template, use AI, or start from scratch.</p>
        <form className="wst-search" onSubmit={(e) => (e.preventDefault(), navigate(`/website-studio/templates?q=${encodeURIComponent(q)}`))}>
          <Icon name="Search" size={20} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates: bakery, salon, church, store…" aria-label="Search templates" />
          <button type="submit" className="wst-btn wst-btn--primary">Search</button>
        </form>
        <div className="wst-options">
          {options.map((o) => (
            <button type="button" key={o.title} className="wst-option" onClick={o.action}>
              <span className="wst-option__icon"><Icon name={o.icon} size={26} /></span>
              <strong>{o.title}</strong>
              <span>{o.text}</span>
            </button>
          ))}
        </div>
      </section>

      {mine.length ? (
        <section className="wst-section">
          <div className="wst-section__head">
            <h2>My Websites · Recently Edited</h2>
            <Link to="/website-studio/my-websites">View all</Link>
          </div>
          <div className="wst-mine">
            {mine.slice(0, 4).map((w) => (
              <Link key={w.id} to={`/website-studio/editor/${w.id}`} className="wst-mine__item">
                <strong>{w.name}</strong>
                <small>{w.templateName ?? "Custom"} · {w.status} · edited {new Date(w.updatedAt).toLocaleDateString()}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="wst-section">
        <div className="wst-section__head"><h2>Popular Categories</h2><Link to="/website-studio/templates">Browse all templates</Link></div>
        <div className="wst-chips">
          {popular.map((c) => (
            <Link key={c.id} to={`/website-studio/templates?category=${c.slug}`} className="wst-chip"><Icon name={c.icon} size={16} /> {c.name}</Link>
          ))}
        </div>
      </section>

      <section className="wst-section">
        <div className="wst-section__head"><h2>Featured Templates</h2></div>
        <div className="wst-grid">
          {featured.map((t) => <TemplateCard key={t.id} t={t} onUse={(tt) => setDialog({ mode: "template", template: tt })} />)}
        </div>
      </section>

      <section className="wst-section">
        <div className="wst-section__head"><h2>Recommended Templates</h2></div>
        <div className="wst-grid">
          {recommended.filter((t) => !featured.some((f) => f.id === t.id)).map((t) => <TemplateCard key={t.id} t={t} onUse={(tt) => setDialog({ mode: "template", template: tt })} />)}
        </div>
      </section>

      <section className="wst-section">
        <div className="wst-section__head"><h2>Every kind of website</h2></div>
        <div className="wst-groups">
          {groups.map(([g, list]) => (
            <div key={g} className="wst-group">
              <h3>{g}</h3>
              {list.map((c) => <Link key={c.id} to={`/website-studio/templates?category=${c.slug}`}>{c.name}</Link>)}
            </div>
          ))}
        </div>
      </section>

      {dialog ? <CreateWebsiteDialog mode={dialog.mode} template={dialog.template} onClose={() => setDialog(null)} /> : null}
    </div>
  );
}
