import React, { useEffect, useState } from "react";
import { Icon } from "../../renderer/icons";
import { useEditorStore, uid } from "../../store/websiteEditorStore";
import { websiteStudioApi, apiError } from "../../services/websiteStudioApi";
import type { NavLink, Section, SitePage } from "../../types/content";
import { DND_MOVE, DND_NEW, DND_SAVED, setDragging } from "./EditorCanvas";
import { INSERTABLE, SECTION_SCHEMAS } from "./sectionSchemas";
import { LinkPicker } from "./FieldEditors";
import { MediaLibrary } from "./MediaLibrary";
import ThemePanel from "./ThemePanel";
import BusinessPanel from "./BusinessPanel";

export type LeftTab = "pages" | "layers" | "elements" | "sections" | "components" | "templates" | "media" | "navigation" | "styles" | "integrations";

const TABS: { id: LeftTab; label: string; icon: string }[] = [
  { id: "pages", label: "Pages", icon: "BookOpen" },
  { id: "layers", label: "Layers", icon: "Menu" },
  { id: "elements", label: "Elements", icon: "PenLine" },
  { id: "sections", label: "Sections", icon: "LayoutGrid" },
  { id: "components", label: "Components", icon: "Gem" },
  { id: "templates", label: "Templates", icon: "Palette" },
  { id: "media", label: "Media", icon: "Camera" },
  { id: "navigation", label: "Navigation", icon: "Network" },
  { id: "styles", label: "Global Styles", icon: "Sparkles" },
  { id: "integrations", label: "Business", icon: "Store" },
];

const slugify = (v: string) => v.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

/* ---------------------------------------------------------------- pages */
function PagesTab() {
  const content = useEditorStore((s) => s.content)!;
  const pageId = useEditorStore((s) => s.pageId);
  const setPage = useEditorStore((s) => s.setPage);
  const mutate = useEditorStore((s) => s.mutate);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pages = [...content.pages].sort((a, b) => a.order - b.order);

  const addPage = () => {
    const title = window.prompt("Page name", "New Page");
    if (!title) return;
    let slug = slugify(title) || "page";
    for (let i = 2; content.pages.some((p) => p.slug === slug) || slug === "product"; i++) slug = `${slugify(title)}-${i}`;
    const id = uid("p");
    mutate((d) => {
      d.pages.push({
        id, title, slug, isHomepage: false, visibility: "public", showInNav: true, parentId: null, order: d.pages.length,
        seo: { title, description: "" },
        sections: [{ ...SECTION_SCHEMAS["text-block"].create(), id: uid("s"), props: { ...SECTION_SCHEMAS["text-block"].create().props, title } } as Section],
      });
      d.navigation.push({ id: uid("n"), label: title, href: `page:${slug}` });
    });
    setPage(id);
    setEditing(id);
  };

  const updatePage = (id: string, fn: (p: SitePage, d: typeof content) => void, key?: string) => mutate((d) => {
    const p = d.pages.find((x) => x.id === id);
    if (p) fn(p, d);
  }, key);

  const changeSlug = (p: SitePage, raw: string) => {
    const slug = slugify(raw);
    if (!slug || slug === "product") return setError("Use letters, numbers and dashes.");
    if (content.pages.some((x) => x.slug === slug && x.id !== p.id)) return setError("Another page already uses this URL.");
    setError(null);
    const old = p.slug;
    updatePage(p.id, (pg, d) => {
      pg.slug = slug;
      const fix = (links: NavLink[]) => links.forEach((l) => { if (l.href === `page:${old}`) l.href = `page:${slug}`; if (l.children) fix(l.children); });
      fix(d.navigation);
    });
  };

  const toggleNav = (p: SitePage) => updatePage(p.id, (pg, d) => {
    pg.showInNav = !pg.showInNav;
    const has = d.navigation.some((l) => l.href === `page:${pg.slug}`);
    if (pg.showInNav && !has) d.navigation.push({ id: uid("n"), label: pg.title, href: `page:${pg.slug}` });
    if (!pg.showInNav) d.navigation = d.navigation.filter((l) => l.href !== `page:${pg.slug}`);
  });

  const move = (p: SitePage, dir: number) => mutate((d) => {
    const sorted = [...d.pages].sort((a, b) => a.order - b.order);
    const i = sorted.findIndex((x) => x.id === p.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
    sorted.forEach((x, k) => (d.pages.find((y) => y.id === x.id)!.order = k));
  });

  return (
    <div className="wse-tab">
      <button type="button" className="wse-btn wse-btn--primary wse-btn--block" onClick={addPage}><Icon name="Plus" size={14} /> Add page</button>
      {error ? <p className="wse-error">{error}</p> : null}
      <ul className="wse-pages">
        {pages.map((p) => (
          <li key={p.id} className={`wse-pages__item${p.id === pageId ? " is-active" : ""}${p.parentId ? " is-child" : ""}`}>
            <div className="wse-pages__head">
              <button type="button" className="wse-pages__name" onClick={() => setPage(p.id)}>
                <Icon name={p.isHomepage ? "House" : "BookOpen"} size={14} />
                <span>{p.title}</span>
                {p.visibility === "hidden" ? <small>hidden</small> : null}
                {!p.showInNav ? <small>not in menu</small> : null}
              </button>
              <button type="button" className="wse-icon-btn" title="Settings" onClick={() => setEditing(editing === p.id ? null : p.id)}><Icon name="ChevronDown" size={14} /></button>
            </div>
            {editing === p.id ? (
              <div className="wse-pages__edit">
                <label className="wse-row"><span className="wse-row__label">Name</span><input className="wse-input" value={p.title} onChange={(e) => updatePage(p.id, (pg) => (pg.title = e.target.value), `title-${p.id}`)} /></label>
                <label className="wse-row"><span className="wse-row__label">URL</span><input className="wse-input" defaultValue={p.slug} onBlur={(e) => changeSlug(p, e.target.value)} /></label>
                <label className="wse-row"><span className="wse-row__label">Parent page (nested)</span>
                  <select className="wse-input" value={p.parentId ?? ""} onChange={(e) => updatePage(p.id, (pg) => (pg.parentId = e.target.value || null))}>
                    <option value="">None (top level)</option>
                    {content.pages.filter((x) => x.id !== p.id && !x.parentId).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
                  </select>
                </label>
                <label className="wse-toggle"><input type="checkbox" checked={p.showInNav} onChange={() => toggleNav(p)} /><span>Show in navigation</span></label>
                <label className="wse-toggle"><input type="checkbox" checked={p.visibility === "public"} onChange={() => updatePage(p.id, (pg) => (pg.visibility = pg.visibility === "public" ? "hidden" : "public"))} /><span>Visible to visitors</span></label>
                <div className="wse-btnrow">
                  {!p.isHomepage ? <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => mutate((d) => d.pages.forEach((x) => (x.isHomepage = x.id === p.id)))}>Set as homepage</button> : null}
                  <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => move(p, -1)}>Move up</button>
                  <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => move(p, 1)}>Move down</button>
                  <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => {
                    const id = uid("p");
                    let slug = `${p.slug}-copy`;
                    for (let i = 2; content.pages.some((x) => x.slug === slug); i++) slug = `${p.slug}-copy-${i}`;
                    mutate((d) => d.pages.push({ ...JSON.parse(JSON.stringify(p)), id, slug, title: `${p.title} (Copy)`, isHomepage: false, order: d.pages.length, sections: p.sections.map((s) => ({ ...JSON.parse(JSON.stringify(s)), id: uid("s") })) }));
                    setPage(id);
                  }}>Duplicate</button>
                  {!p.isHomepage ? (
                    <button type="button" className="wse-btn wse-btn--danger wse-btn--sm" onClick={() => {
                      if (!window.confirm(`Delete the page "${p.title}"? You can restore it from History.`)) return;
                      mutate((d) => {
                        d.pages = d.pages.filter((x) => x.id !== p.id);
                        d.pages.forEach((x) => x.parentId === p.id && (x.parentId = null));
                        d.navigation = d.navigation.filter((l) => l.href !== `page:${p.slug}`);
                      });
                      setPage(content.pages.find((x) => x.isHomepage)!.id);
                    }}>Delete</button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- layers */
function LayersTab() {
  const content = useEditorStore((s) => s.content)!;
  const pageId = useEditorStore((s) => s.pageId);
  const selection = useEditorStore((s) => s.selection);
  const select = useEditorStore((s) => s.select);
  const moveSection = useEditorStore((s) => s.moveSection);
  const toggleHidden = useEditorStore((s) => s.toggleHidden);
  const page = content.pages.find((p) => p.id === pageId) ?? content.pages[0];
  const [over, setOver] = useState<number | null>(null);
  const row = (s: Section, i?: number) => (
    <li
      key={s.id}
      className={`wse-layer${selection?.sectionId === s.id ? " is-active" : ""}${over === i ? " is-over" : ""}${s.style?.hidden ? " is-hidden" : ""}`}
      draggable={i !== undefined}
      onDragStart={(e) => e.dataTransfer.setData(DND_MOVE, s.id)}
      onDragOver={(e) => (e.preventDefault(), i !== undefined && setOver(i))}
      onDragLeave={() => setOver(null)}
      onDrop={(e) => {
        setOver(null);
        const id = e.dataTransfer.getData(DND_MOVE);
        if (id && i !== undefined) moveSection(id, i);
      }}
      onClick={() => select({ sectionId: s.id, kind: "section" })}
    >
      {i !== undefined ? <Icon name="Menu" size={13} /> : <Icon name="LayoutGrid" size={13} />}
      <span>{s.name || SECTION_SCHEMAS[s.type]?.label || s.type}</span>
      {i !== undefined ? (
        <button type="button" className="wse-icon-btn" title={s.style?.hidden ? "Show section" : "Hide section"} onClick={(e) => (e.stopPropagation(), toggleHidden(s.id))}>
          <Icon name={s.style?.hidden ? "X" : "Check"} size={13} />
        </button>
      ) : null}
    </li>
  );
  return (
    <div className="wse-tab">
      <p className="wse-muted">Drag to reorder. Click to select.</p>
      <ul className="wse-layers">
        {row(content.header)}
        {page.sections.map((s, i) => row(s, i))}
        {row(content.footer)}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- library */
function LibraryTab({ group }: { group: "element" | "section" | "component" }) {
  const insertSection = useEditorStore((s) => s.insertSection);
  const selection = useEditorStore((s) => s.selection);
  const findSection = useEditorStore((s) => s.findSection);
  const [saved, setSaved] = useState<{ id: string; name: string; section: Section }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (group === "component") websiteStudioApi.savedSections().then(setSaved).catch(() => undefined);
  }, [group]);
  const insertAfterSelection = (s: Omit<Section, "id">) => {
    const hit = selection ? findSection(selection.sectionId) : null;
    insertSection({ ...s, id: uid("s") } as Section, hit?.page ? hit.index + 1 : undefined);
  };
  const items = INSERTABLE.filter((t) => SECTION_SCHEMAS[t].group === group);
  const selected = selection ? findSection(selection.sectionId) : null;
  return (
    <div className="wse-tab">
      <p className="wse-muted">Drag onto the page or click to add {selected?.page ? "below the selected section" : "at the end"}.</p>
      <div className="wse-library">
        {items.map((t) => {
          const sc = SECTION_SCHEMAS[t];
          return (
            <button
              type="button"
              key={t}
              className="wse-library__item"
              draggable
              onDragStart={(e) => (e.dataTransfer.setData(DND_NEW, t), setDragging(true))}
              onDragEnd={() => setDragging(false)}
              onClick={() => insertAfterSelection(sc.create())}
              title={sc.description}
            >
              <Icon name={sc.icon} size={20} />
              <strong>{sc.label}</strong>
              <small>{sc.description}</small>
            </button>
          );
        })}
      </div>
      {group === "component" ? (
        <>
          <h4 className="wse-subtitle">My saved sections</h4>
          {selected?.page ? (
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={async () => {
              const name = window.prompt("Name this reusable section", SECTION_SCHEMAS[selected.section.type].label);
              if (!name) return;
              try {
                const s = await websiteStudioApi.saveSection(name, selected.section);
                setSaved((prev) => [s, ...prev]);
                setMsg("Saved. You can reuse it on any of your websites.");
              } catch (e) {
                setMsg(apiError(e));
              }
            }}><Icon name="Plus" size={14} /> Save selected section</button>
          ) : <p className="wse-muted">Select a section to save it for reuse.</p>}
          {msg ? <p className="wse-muted">{msg}</p> : null}
          <div className="wse-library">
            {saved.map((s) => (
              <div key={s.id} className="wse-library__item" draggable onDragStart={(e) => (e.dataTransfer.setData(DND_SAVED, JSON.stringify(s.section)), setDragging(true))} onDragEnd={() => setDragging(false)} onClick={() => insertAfterSelection(s.section)}>
                <Icon name={SECTION_SCHEMAS[s.section.type]?.icon ?? "LayoutGrid"} size={20} />
                <strong>{s.name}</strong>
                <button type="button" className="wse-icon-btn" onClick={async (e) => { e.stopPropagation(); await websiteStudioApi.deleteSavedSection(s.id); setSaved((p) => p.filter((x) => x.id !== s.id)); }} title="Delete saved section"><Icon name="Trash2" size={13} /></button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------- navigation */
function NavigationTab() {
  const content = useEditorStore((s) => s.content)!;
  const mutate = useEditorStore((s) => s.mutate);
  const nav = content.navigation;
  const update = (fn: (links: NavLink[]) => void, key?: string) => mutate((d) => fn(d.navigation), key);
  return (
    <div className="wse-tab">
      <p className="wse-muted">These links appear in your header menu and mobile menu.</p>
      {nav.map((l, i) => (
        <div key={l.id} className="wse-card-lite">
          <input className="wse-input" value={l.label} onChange={(e) => update((links) => (links[i].label = e.target.value), `nav-${l.id}`)} />
          <LinkPicker value={l.href} content={content} onChange={(v) => update((links) => (links[i].href = v))} />
          {(l.children ?? []).map((c, j) => (
            <div key={c.id} className="wse-nav-child">
              <input className="wse-input" value={c.label} onChange={(e) => update((links) => (links[i].children![j].label = e.target.value), `nav-${c.id}`)} />
              <LinkPicker value={c.href} content={content} onChange={(v) => update((links) => (links[i].children![j].href = v))} />
              <button type="button" className="wse-icon-btn" onClick={() => update((links) => (links[i].children = links[i].children!.filter((_, k) => k !== j)))}><Icon name="Trash2" size={13} /></button>
            </div>
          ))}
          <div className="wse-btnrow">
            <button type="button" className="wse-icon-btn" title="Move up" disabled={i === 0} onClick={() => update((links) => ([links[i - 1], links[i]] = [links[i], links[i - 1]]))}><Icon name="ChevronLeft" size={14} /></button>
            <button type="button" className="wse-icon-btn" title="Move down" disabled={i === nav.length - 1} onClick={() => update((links) => ([links[i + 1], links[i]] = [links[i], links[i + 1]]))}><Icon name="ChevronRight" size={14} /></button>
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => update((links) => (links[i].children = [...(links[i].children ?? []), { id: uid("n"), label: "Sub link", href: "page:home" }]))}>+ Dropdown link</button>
            <button type="button" className="wse-btn wse-btn--danger wse-btn--sm" onClick={() => update((links) => links.splice(i, 1))}>Remove</button>
          </div>
        </div>
      ))}
      <button type="button" className="wse-btn wse-btn--primary wse-btn--block" onClick={() => update((links) => links.push({ id: uid("n"), label: "New link", href: "page:home" }))}><Icon name="Plus" size={14} /> Add menu link</button>
    </div>
  );
}

export default function LeftPanel({ websiteId, kind, onChangeDesign }: { websiteId: string | null; kind: "website" | "template"; onChangeDesign: () => void }) {
  const [tab, setTab] = useState<LeftTab>("pages");
  return (
    <div className="wse-left">
      <nav className="wse-left__tabs" aria-label="Editor panels">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)} title={t.label}>
            <Icon name={t.icon} size={18} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      <div className="wse-left__body">
        <h3 className="wse-left__title">{TABS.find((t) => t.id === tab)?.label}</h3>
        {tab === "pages" ? <PagesTab /> : null}
        {tab === "layers" ? <LayersTab /> : null}
        {tab === "elements" ? <LibraryTab group="element" /> : null}
        {tab === "sections" ? <LibraryTab group="section" /> : null}
        {tab === "components" ? <LibraryTab group="component" /> : null}
        {tab === "templates" ? (
          <div className="wse-tab">
            <p className="wse-muted">Switch to another design. Your text, images, products, services and pages are kept, and a backup is created so you can undo.</p>
            {kind === "website" ? <button type="button" className="wse-btn wse-btn--primary wse-btn--block" onClick={onChangeDesign}><Icon name="Palette" size={14} /> Change Design</button> : <p className="wse-muted">Not available while editing a master template.</p>}
          </div>
        ) : null}
        {tab === "media" ? <MediaLibrary websiteId={websiteId} compact /> : null}
        {tab === "navigation" ? <NavigationTab /> : null}
        {tab === "styles" ? <ThemePanel websiteId={websiteId} /> : null}
        {tab === "integrations" ? <BusinessPanel websiteId={websiteId} kind={kind} /> : null}
      </div>
    </div>
  );
}
