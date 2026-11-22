import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import type { WebsiteCategory, WebsiteSummary, WebsiteTemplate } from "../types/studio";
import TemplateThumb from "../components/marketplace/TemplateThumb";
import { MediaPickerButton } from "../components/editor/MediaLibrary";
import { StudioNav } from "./WebsiteStudioHome";
import "../styles/studio.scss";

type Tab = "templates" | "categories" | "websites" | "reports";

function Templates({ categories }: { categories: WebsiteCategory[] }) {
  const navigate = useNavigate();
  const [list, setList] = useState<(WebsiteTemplate & { usageCount?: number })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const load = () => websiteStudioApi.admin.templates().then(setList).catch((e) => setError(apiError(e, "Administrator access required.")));
  useEffect(() => void load(), []);
  const patch = async (t: WebsiteTemplate, p: Partial<WebsiteTemplate>) => {
    try {
      await websiteStudioApi.admin.updateTemplate(t.id, p);
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };
  const create = async () => {
    const name = window.prompt("New template name");
    if (!name) return;
    const from = window.prompt("Start from which template slug? (blank = empty page)", "blank") || "blank";
    try {
      const t = await websiteStudioApi.admin.createTemplate({ name, fromTemplateSlug: from, categoryIds: [] });
      navigate(`/website-studio/admin/templates/${t.id}/edit`);
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <div>
      <div className="wst-dash__head"><h2>Templates</h2><button type="button" className="wst-btn wst-btn--primary" onClick={create}><Icon name="Plus" size={16} /> New template</button></div>
      {error ? <p className="wst-error">{error}</p> : null}
      <div className="wst-admin-list">
        {list?.map((t) => (
          <div key={t.id} className="wst-admin-row">
            <div className="wst-admin-row__thumb"><TemplateThumb template={t} /></div>
            <div className="wst-admin-row__body">
              <strong>{t.name}</strong> <code>{t.slug}</code> <span className={`wst-status wst-status--${t.status}`}>{t.status}</span>
              {t.isOfficial ? <span className="wst-badge">Official</span> : null}
              {t.isDefault ? <span className="wst-badge">Default</span> : null}
              <small className="wst-muted">v{t.version} · {t.usageCount ?? 0} websites · {t.categorySlugs.join(", ") || "no category"}</small>
              <div className="wst-btnrow">
                <Link className="wst-btn wst-btn--primary wst-btn--sm" to={`/website-studio/admin/templates/${t.id}/edit`}>Edit in visual editor</Link>
                <Link className="wst-btn wst-btn--ghost wst-btn--sm" to={`/website-studio/templates/${t.slug}`} target="_blank">Preview</Link>
                <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => patch(t, { status: t.status === "published" ? "unpublished" : "published" })}>{t.status === "published" ? "Unpublish" : "Publish"}</button>
                <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => patch(t, { isFeatured: !t.isFeatured })}>{t.isFeatured ? "Unfeature" : "Feature"}</button>
                <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => patch(t, { accessLevel: t.accessLevel === "free" ? "premium" : "free" })}>{t.accessLevel === "free" ? "Make premium" : "Make free"}</button>
                <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => patch(t, { visibility: t.visibility === "public" ? "private" : "public" })}>{t.visibility === "public" ? "Hide" : "Show"}</button>
                <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={async () => { await websiteStudioApi.admin.duplicateTemplate(t.id); load(); }}>Duplicate</button>
                <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => setEditing(editing === t.id ? null : t.id)}>Details</button>
                {!t.isOfficial ? <button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={async () => { if (window.confirm(`Delete ${t.name}?`)) { try { await websiteStudioApi.admin.deleteTemplate(t.id); load(); } catch (e) { setError(apiError(e)); } } }}>Delete</button> : null}
              </div>
              {editing === t.id ? (
                <div className="wst-admin-edit">
                  <label className="wst-field"><span>Name</span><input defaultValue={t.name} onBlur={(e) => e.target.value !== t.name && patch(t, { name: e.target.value })} /></label>
                  <label className="wst-field"><span>Description</span><textarea defaultValue={t.description} onBlur={(e) => patch(t, { description: e.target.value })} /></label>
                  <div className="wst-field"><span>Preview image</span>
                    <div className="wst-inline">{t.thumbnail ? <img src={t.thumbnail} alt="" style={{ width: 120, borderRadius: 8 }} /> : null}<MediaPickerButton websiteId={null} label="Upload preview" onPick={(url) => patch(t, { thumbnail: url, previewImages: [url] })} /></div>
                  </div>
                  <div className="wst-field"><span>Categories</span>
                    <div className="wst-chips">
                      {categories.map((c) => {
                        const on = t.categoryIds.includes(c.id);
                        return <button type="button" key={c.id} className={`wst-chip${on ? " is-active" : ""}`} onClick={() => patch(t, { categoryIds: on ? t.categoryIds.filter((x) => x !== c.id) : [...t.categoryIds, c.id] })}>{c.name}</button>;
                      })}
                    </div>
                  </div>
                  <div className="wst-field"><span>Set as default design for a category</span>
                    <select className="wst-input" defaultValue="" onChange={async (e) => { if (!e.target.value) return; try { await websiteStudioApi.admin.setDefault(t.id, e.target.value); load(); } catch (er) { setError(apiError(er)); } }}>
                      <option value="">Choose category…</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.defaultTemplateSlug === t.slug ? " (current default)" : ""}</option>)}
                    </select>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Categories({ categories, reload }: { categories: WebsiteCategory[]; reload: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [group, setGroup] = useState("Other");
  const run = async (fn: () => Promise<unknown>) => {
    try {
      setError(null);
      await fn();
      reload();
    } catch (e) {
      setError(apiError(e));
    }
  };
  const move = (i: number, d: number) => {
    const ids = categories.map((c) => c.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    run(() => websiteStudioApi.admin.reorderCategories(ids));
  };
  return (
    <div>
      <h2>Categories</h2>
      <div className="wst-inline">
        <input className="wst-input" placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="wst-input" placeholder="Group" value={group} onChange={(e) => setGroup(e.target.value)} />
        <button type="button" className="wst-btn wst-btn--primary wst-btn--sm" disabled={!name.trim()} onClick={() => run(async () => { await websiteStudioApi.admin.createCategory({ name, group }); setName(""); })}>Add category</button>
      </div>
      {error ? <p className="wst-error">{error}</p> : null}
      <table className="wst-table">
        <thead><tr><th>Order</th><th>Name</th><th>Group</th><th>Icon</th><th>Image</th><th>Templates</th><th>Default design</th><th>Status</th><th /></tr></thead>
        <tbody>
          {categories.map((c, i) => (
            <tr key={c.id}>
              <td><button type="button" className="wst-icon-btn" onClick={() => move(i, -1)}><Icon name="ChevronLeft" size={14} /></button><button type="button" className="wst-icon-btn" onClick={() => move(i, 1)}><Icon name="ChevronRight" size={14} /></button></td>
              <td><input className="wst-input" defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && run(() => websiteStudioApi.admin.updateCategory(c.id, { name: e.target.value }))} /></td>
              <td><input className="wst-input" defaultValue={c.group} onBlur={(e) => e.target.value !== c.group && run(() => websiteStudioApi.admin.updateCategory(c.id, { group: e.target.value }))} /></td>
              <td><input className="wst-input" defaultValue={c.icon} style={{ width: 110 }} onBlur={(e) => e.target.value !== c.icon && run(() => websiteStudioApi.admin.updateCategory(c.id, { icon: e.target.value }))} /> <Icon name={c.icon} size={16} /></td>
              <td>{c.image ? <img src={c.image} alt="" style={{ width: 48, borderRadius: 6 }} /> : null}<MediaPickerButton websiteId={null} label="Upload" onPick={(url) => run(() => websiteStudioApi.admin.updateCategory(c.id, { image: url }))} /></td>
              <td>{c.templateCount}</td>
              <td>{c.defaultTemplateSlug ?? "—"}</td>
              <td><button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={() => run(() => websiteStudioApi.admin.updateCategory(c.id, { status: c.status === "active" ? "hidden" : "active" }))}>{c.status}</button></td>
              <td><button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={() => window.confirm(`Delete ${c.name}?`) && run(() => websiteStudioApi.admin.deleteCategory(c.id))}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Websites() {
  const [list, setList] = useState<(WebsiteSummary & { ownerName: string; reports: number; suspendedReason?: string })[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [usage, setUsage] = useState<{ templateId: string; name: string; websites: number }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = () => websiteStudioApi.admin.websites({ q: q || undefined, status: status || undefined }).then(setList as any).catch((e) => setError(apiError(e)));
  useEffect(() => void load(), [status]);
  useEffect(() => void websiteStudioApi.admin.usage().then(setUsage).catch(() => undefined), []);
  return (
    <div>
      <h2>Websites</h2>
      <div className="wst-inline">
        <input className="wst-input" placeholder="Search name, address or domain" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <select className="wst-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="published">Published</option><option value="draft">Draft</option><option value="suspended">Suspended</option></select>
      </div>
      {error ? <p className="wst-error">{error}</p> : null}
      <table className="wst-table">
        <thead><tr><th>Website</th><th>Owner</th><th>Template</th><th>Status</th><th>Reports</th><th /></tr></thead>
        <tbody>
          {list?.map((w) => (
            <tr key={w.id}>
              <td><a href={w.url} target="_blank" rel="noreferrer">{w.name}</a><br /><small className="wst-muted">{w.url}</small></td>
              <td>{w.ownerName}</td>
              <td>{w.templateName ?? "—"}</td>
              <td><span className={`wst-status wst-status--${w.status}`}>{w.status}</span>{w.suspendedReason ? <small> {w.suspendedReason}</small> : null}</td>
              <td>{w.reports || ""}</td>
              <td>
                {w.status === "suspended" ? (
                  <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={async () => { await websiteStudioApi.admin.suspendWebsite(w.id, false); load(); }}>Restore</button>
                ) : (
                  <button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={async () => { const reason = window.prompt("Reason for suspension"); if (reason) { await websiteStudioApi.admin.suspendWebsite(w.id, true, reason); load(); } }}>Suspend</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Template usage</h3>
      <table className="wst-table"><tbody>{usage.map((u) => <tr key={u.templateId}><td>{u.name}</td><td>{u.websites} websites</td></tr>)}</tbody></table>
    </div>
  );
}

function Reports() {
  const [list, setList] = useState<{ id: string; websiteId: string; websiteName: string; reason: string; createdAt: string }[]>([]);
  const load = () => websiteStudioApi.admin.reports().then(setList).catch(() => undefined);
  useEffect(() => void load(), []);
  return (
    <div>
      <h2>Reported websites</h2>
      {!list.length ? <p className="wst-muted">No open reports.</p> : null}
      {list.map((r) => (
        <div key={r.id} className="wst-msg">
          <strong>{r.websiteName}</strong> <small className="wst-muted">{new Date(r.createdAt).toLocaleString()}</small>
          <p>{r.reason}</p>
          <div className="wst-btnrow">
            <button type="button" className="wst-btn wst-btn--danger wst-btn--sm" onClick={async () => { const reason = window.prompt("Suspension reason", r.reason.slice(0, 120)); if (reason) { await websiteStudioApi.admin.suspendWebsite(r.websiteId, true, reason); await websiteStudioApi.admin.resolveReport(r.id); load(); } }}>Suspend website</button>
            <button type="button" className="wst-btn wst-btn--ghost wst-btn--sm" onClick={async () => { await websiteStudioApi.admin.resolveReport(r.id); load(); }}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminWebsiteStudio() {
  const [tab, setTab] = useState<Tab>("templates");
  const [categories, setCategories] = useState<WebsiteCategory[]>([]);
  const [denied, setDenied] = useState<string | null>(null);
  const loadCats = () => websiteStudioApi.admin.categories().then(setCategories).catch((e) => setDenied(apiError(e, "Administrator access required.")));
  useEffect(() => void loadCats(), []);
  if (denied) return <div className="wst"><StudioNav /><p className="wst-error wst-pad">{denied}</p></div>;
  return (
    <div className="wst">
      <StudioNav />
      <div className="wst-settings">
        <aside className="wst-settings__nav">
          <h3>Website Studio Admin</h3>
          {([["templates", "Templates", "Palette"], ["categories", "Categories", "LayoutGrid"], ["websites", "Websites", "Building2"], ["reports", "Reports", "ShieldCheck"]] as [Tab, string, string][]).map(([k, l, i]) => (
            <button type="button" key={k} className={tab === k ? "is-active" : ""} onClick={() => setTab(k)}><Icon name={i} size={16} /> {l}</button>
          ))}
        </aside>
        <main className="wst-settings__panel">
          {tab === "templates" ? <Templates categories={categories} /> : null}
          {tab === "categories" ? <Categories categories={categories} reload={loadCats} /> : null}
          {tab === "websites" ? <Websites /> : null}
          {tab === "reports" ? <Reports /> : null}
        </main>
      </div>
    </div>
  );
}
