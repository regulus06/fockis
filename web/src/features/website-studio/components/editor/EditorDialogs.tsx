import React, { useEffect, useState } from "react";
import { Icon } from "../../renderer/icons";
import { websiteStudioApi, apiError } from "../../services/websiteStudioApi";
import { useEditorStore } from "../../store/websiteEditorStore";
import type { AiAssistAction, SwitchReport, WebsiteTemplate, WebsiteVersion } from "../../types/studio";
import TemplateThumb from "../marketplace/TemplateThumb";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="wse-modal" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div className={`wse-modal__panel${wide ? " wse-modal__panel--wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="wse-modal__head">
          <h3>{title}</h3>
          <button type="button" className="wse-icon-btn" onClick={onClose} aria-label="Close"><Icon name="X" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ==================================================================== */
/* CHANGE DESIGN                                                        */
/* ==================================================================== */
export function ChangeDesignModal({ websiteId, categorySlug, currentTemplate, onClose, onSwitched, ensureSaved }: { websiteId: string; categorySlug: string | null; currentTemplate: string | null; onClose: () => void; onSwitched: (backupVersionId: string, report: SwitchReport) => void; ensureSaved: () => Promise<boolean> }) {
  const flush = useEditorStore((s) => s.saveState);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [all, setAll] = useState(false);
  const [chosen, setChosen] = useState<WebsiteTemplate | null>(null);
  const [compare, setCompare] = useState<string[]>([]);
  const [report, setReport] = useState<SwitchReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    websiteStudioApi.templates(all || !categorySlug ? {} : { category: categorySlug }).then(setTemplates).catch((e) => setError(apiError(e)));
  }, [all, categorySlug]);

  useEffect(() => {
    setReport(null);
    if (!chosen) return;
    websiteStudioApi.previewSwitch(websiteId, chosen.slug).then(setReport).catch((e) => setError(apiError(e)));
  }, [chosen, websiteId]);

  const apply = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      // The switch runs on the server copy, so make sure the latest edits are saved first.
      if (!(await ensureSaved())) throw new Error("Your latest changes could not be saved, so the design was not changed.");
      const res = await websiteStudioApi.switchTemplate(websiteId, chosen.slug);
      useEditorStore.getState().replaceContent(res.content, res.revision);
      onSwitched(res.backupVersionId, res.report);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Change Design" onClose={onClose} wide>
      <div className="wse-design">
        <div className="wse-design__list">
          <label className="wse-toggle"><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /><span>Show designs from all categories</span></label>
          <div className="wse-design__grid">
            {templates.map((t) => (
              <div key={t.id} className={`wse-design__card${chosen?.id === t.id ? " is-active" : ""}`}>
                <button type="button" onClick={() => setChosen(t)} className="wse-design__pick">
                  <TemplateThumb template={t} />
                  <strong>{t.name}{t.slug === currentTemplate ? " (current)" : ""}</strong>
                  <small>{t.isOfficial && t.isDefault ? "Original Fockis design" : t.description}</small>
                </button>
                <label className="wse-toggle wse-toggle--sm">
                  <input type="checkbox" checked={compare.includes(t.slug)} onChange={(e) => setCompare((c) => (e.target.checked ? [...c, t.slug].slice(-3) : c.filter((x) => x !== t.slug)))} />
                  <span>Compare</span>
                </label>
              </div>
            ))}
          </div>
          {compare.length > 1 ? (
            <a className="wse-btn wse-btn--ghost wse-btn--sm" href={`/website-studio/templates/compare?slugs=${compare.join(",")}`} target="_blank" rel="noreferrer">
              Compare {compare.length} designs side by side
            </a>
          ) : null}
        </div>
        <aside className="wse-design__side">
          {!chosen ? <p className="wse-muted">Choose a design to see what will be kept.</p> : (
            <>
              <h4>{chosen.name}</h4>
              <a className="wse-btn wse-btn--ghost wse-btn--sm" href={`/website-studio/templates/${chosen.slug}`} target="_blank" rel="noreferrer"><Icon name="Search" size={14} /> Full preview</a>
              {report ? (
                <>
                  <h5>Kept</h5>
                  <ul className="wse-report wse-report--ok">{report.preserved.map((x) => <li key={x}><Icon name="Check" size={14} /> {x}</li>)}{report.keptPages.length ? <li><Icon name="Check" size={14} /> Your pages: {report.keptPages.join(", ")}</li> : null}</ul>
                  <h5>Will change</h5>
                  <ul className="wse-report">{report.notTransferred.map((x) => <li key={x}>{x}</li>)}</ul>
                  {report.warnings.map((w) => <p key={w} className="wse-warning">{w}</p>)}
                </>
              ) : <p className="wse-muted">Checking compatibility…</p>}
              {flush === "error" || flush === "conflict" ? <p className="wse-warning">Your latest edits are not saved yet.</p> : null}
              {error ? <p className="wse-error">{error}</p> : null}
              <button type="button" className="wse-btn wse-btn--primary wse-btn--block" disabled={!report || busy || flush === "conflict"} onClick={apply}>
                {busy ? "Applying…" : "Apply this design"}
              </button>
            </>
          )}
        </aside>
      </div>
    </Modal>
  );
}

/* ==================================================================== */
/* HISTORY                                                              */
/* ==================================================================== */
export function HistoryDrawer({ websiteId, onClose }: { websiteId: string; onClose: () => void }) {
  const [versions, setVersions] = useState<WebsiteVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const saveState = useEditorStore((s) => s.saveState);
  const load = () => websiteStudioApi.versions(websiteId).then(setVersions).catch((e) => setError(apiError(e)));
  useEffect(() => void load(), [websiteId]);
  const restore = async (v: WebsiteVersion) => {
    if (!window.confirm(`Restore version ${v.versionNumber} (${v.label})? Your current draft is backed up first.`)) return;
    try {
      const res = await websiteStudioApi.restoreVersion(websiteId, v.id);
      useEditorStore.getState().replaceContent(res.content, res.revision);
      await load();
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <Modal title="Version History" onClose={onClose}>
      <div className="wse-history__new">
        <input className="wse-input" placeholder="Name this version (optional)" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button type="button" className="wse-btn wse-btn--primary wse-btn--sm" disabled={saveState !== "saved"} onClick={async () => { await websiteStudioApi.createVersion(websiteId, label || "Saved version"); setLabel(""); load(); }}>Save version</button>
      </div>
      {error ? <p className="wse-error">{error}</p> : null}
      {!versions ? <p className="wse-muted">Loading…</p> : (
        <ul className="wse-history">
          {versions.map((v) => (
            <li key={v.id}>
              <div>
                <strong>v{v.versionNumber} · {v.label}</strong>
                <small>{new Date(v.createdAt).toLocaleString()} · {v.createdByName} · {v.kind.replace(/-/g, " ")}</small>
              </div>
              <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => restore(v)}>Restore</button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ==================================================================== */
/* AI ASSISTANT                                                         */
/* ==================================================================== */
const AI_ACTIONS: { id: AiAssistAction; label: string; needsSection?: boolean; placeholder?: string }[] = [
  { id: "rewrite", label: "Rewrite selected section text", needsSection: true, placeholder: "e.g. friendlier, shorter, more luxurious" },
  { id: "improve-section", label: "Improve selected section", needsSection: true, placeholder: "What should be better?" },
  { id: "color-scheme", label: "Change color scheme", placeholder: "luxury, modern, warm, fresh, bold, calm, elegant, pink, earth" },
  { id: "add-section", label: "Add a new section", placeholder: "e.g. FAQ, testimonials, pricing, gallery, map" },
  { id: "add-page", label: "Create another page", placeholder: "e.g. Catering page" },
  { id: "improve-mobile", label: "Improve mobile layout" },
  { id: "product-descriptions", label: "Generate product descriptions" },
  { id: "improve-seo", label: "Improve SEO" },
];

export function AiAssistant({ websiteId, onClose, onSuggestDesign }: { websiteId: string; onClose: () => void; onSuggestDesign: () => void }) {
  const content = useEditorStore((s) => s.content)!;
  const selection = useEditorStore((s) => s.selection);
  const pageId = useEditorStore((s) => s.pageId);
  const [action, setAction] = useState<AiAssistAction>(selection ? "rewrite" : "color-scheme");
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const def = AI_ACTIONS.find((a) => a.id === action)!;
  const run = async () => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await websiteStudioApi.aiAssist({ websiteId, action, sectionId: selection?.sectionId, pageId: pageId ?? undefined, instruction, content });
      // Applied as a normal edit: fully undoable with Undo.
      useEditorStore.getState().mutate((d) => Object.assign(d, res.content));
      setMsg(res.summary);
    } catch (e) {
      setError(apiError(e, "The AI could not complete this request."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title="AI Assistant" onClose={onClose}>
      <div className="wse-ai">
        <div className="wse-ai__actions">
          {AI_ACTIONS.map((a) => (
            <button type="button" key={a.id} disabled={a.needsSection && !selection} className={a.id === action ? "is-active" : ""} onClick={() => setAction(a.id)}>
              {a.label}
            </button>
          ))}
          <button type="button" onClick={onSuggestDesign}>Suggest a better design</button>
        </div>
        {def.placeholder ? <textarea className="wse-input" rows={3} placeholder={def.placeholder} value={instruction} onChange={(e) => setInstruction(e.target.value)} /> : null}
        {def.needsSection && !selection ? <p className="wse-muted">Select a section on the canvas first.</p> : null}
        <p className="wse-muted">Only the selected section or page is changed. Use Undo to revert.</p>
        {msg ? <p className="wse-ok">{msg}</p> : null}
        {error ? <p className="wse-error">{error}</p> : null}
        <button type="button" className="wse-btn wse-btn--primary wse-btn--block" disabled={busy || (def.needsSection && !selection)} onClick={run}>
          <Icon name="Sparkles" size={16} /> {busy ? "Working…" : "Run"}
        </button>
      </div>
    </Modal>
  );
}

/* ==================================================================== */
/* PUBLISH                                                              */
/* ==================================================================== */
export function PublishDialog({ websiteId, onClose, ensureSaved }: { websiteId: string; onClose: () => void; ensureSaved: () => Promise<boolean> }) {
  const url = useEditorStore((s) => s.url);
  const status = useEditorStore((s) => s.status);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ url: string; versionNumber: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const publish = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!(await ensureSaved())) throw new Error("Your latest changes could not be saved. Fix the save error first.");
      const res = await websiteStudioApi.publish(websiteId);
      // Only report success after the backend confirms the website is published.
      if (res.status !== "published") throw new Error("Publishing was not confirmed by the server.");
      useEditorStore.getState().setMeta({ status: "published", url: res.url, hasUnpublishedChanges: false });
      setResult({ url: res.url, versionNumber: res.versionNumber });
    } catch (e) {
      setError(apiError(e, "Publishing failed."));
    } finally {
      setBusy(false);
    }
  };
  const unpublish = async () => {
    if (!window.confirm("Take this website offline? Visitors will no longer see it.")) return;
    try {
      await websiteStudioApi.unpublish(websiteId);
      useEditorStore.getState().setMeta({ status: "draft" });
      onClose();
    } catch (e) {
      setError(apiError(e));
    }
  };
  return (
    <Modal title={result ? "Your website is live" : "Publish website"} onClose={onClose}>
      {result ? (
        <div className="wse-publish-done">
          <span className="wse-big-check"><Icon name="Check" size={30} /></span>
          <p>Version {result.versionNumber} is now live at:</p>
          <a href={result.url} target="_blank" rel="noreferrer" className="wse-publish-url">{result.url}</a>
          <div className="wse-btnrow">
            <a className="wse-btn wse-btn--primary" href={result.url} target="_blank" rel="noreferrer">View website</a>
            <a className="wse-btn wse-btn--ghost" href={`/website-studio/websites/${websiteId}/settings?tab=domains`}>Connect a domain</a>
          </div>
        </div>
      ) : (
        <>
          <p>Publishing makes the current draft visible to everyone{url ? <> at <b>{url}</b></> : null}. A version is saved so you can roll back later.</p>
          {error ? <p className="wse-error">{error}</p> : null}
          <div className="wse-modal__actions">
            {status === "published" ? <button type="button" className="wse-btn wse-btn--ghost" onClick={unpublish}>Unpublish</button> : null}
            <button type="button" className="wse-btn wse-btn--primary" disabled={busy} onClick={publish}>{busy ? "Publishing…" : "Publish now"}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
