import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../renderer/icons";
import { useEditorStore } from "../store/websiteEditorStore";
import { websiteStudioApi, apiError } from "../services/websiteStudioApi";
import EditorCanvas from "../components/editor/EditorCanvas";
import LeftPanel from "../components/editor/LeftPanel";
import PropertiesPanel from "../components/editor/PropertiesPanel";
import { AiAssistant, ChangeDesignModal, HistoryDrawer, PublishDialog } from "../components/editor/EditorDialogs";
import type { SiteContent } from "../types/content";
import type { SwitchReport } from "../types/studio";
import "../styles/studio.scss";

const AUTOSAVE_MS = 1500;
const backupKey = (kind: string, id: string) => `fockis-ws-draft:${kind}:${id}`;

export default function WebsiteEditor({ mode = "website" }: { mode?: "website" | "template" }) {
  const { websiteId = "", templateId = "" } = useParams();
  const id = mode === "website" ? websiteId : templateId;
  const store = useEditorStore();
  const { content, saveState, saveError, changeCounter, breakpoint, past, future, name, status, revision } = store;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ categorySlug: string | null; templateSlug: string | null }>({ categorySlug: null, templateSlug: null });
  const [dialog, setDialog] = useState<null | "design" | "history" | "ai" | "publish">(null);
  const [recovery, setRecovery] = useState<{ content: SiteContent; savedAt: number } | null>(null);
  const [designUndo, setDesignUndo] = useState<{ versionId: string; report: SwitchReport } | null>(null);
  const savingRef = useRef<Promise<boolean> | null>(null);

  /* ------------------------------------------------------------ load */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (mode === "website") {
          const w = await websiteStudioApi.website(id);
          if (!active) return;
          useEditorStore.getState().load({ target: { kind: "website", id }, name: w.name, slug: w.slug, url: w.url, status: w.status, role: w.role, content: w.content, revision: w.revision, hasUnpublishedChanges: w.hasUnpublishedChanges });
          setMeta({ categorySlug: w.categorySlug, templateSlug: w.templateSlug });
          const raw = localStorage.getItem(backupKey("website", id));
          if (raw) {
            const b = JSON.parse(raw) as { revision: number; content: SiteContent; savedAt: number };
            if (b.revision === w.revision && JSON.stringify(b.content) !== JSON.stringify(w.content)) setRecovery({ content: b.content, savedAt: b.savedAt });
            else localStorage.removeItem(backupKey("website", id));
          }
        } else {
          const t = await websiteStudioApi.admin.template(id);
          if (!active) return;
          useEditorStore.getState().load({ target: { kind: "template", id }, name: t.name, slug: t.slug, status: t.status, role: "admin", content: (t.draftContent ?? t.content) as SiteContent, revision: (t as any).draftRevision ?? 0 });
        }
      } catch (e) {
        if (active) setLoadError(apiError(e, "This website could not be opened."));
      }
    })();
    return () => {
      active = false;
    };
  }, [id, mode]);

  /* ------------------------------------------------------------ save */
  const saveNow = useCallback(async (): Promise<boolean> => {
    const st = useEditorStore.getState();
    if (!st.content || !st.target) return false;
    if (st.saveState === "saved") return true;
    if (st.saveState === "conflict") return false;
    if (savingRef.current) await savingRef.current;
    const snapshotCounter = useEditorStore.getState().changeCounter;
    const run = (async () => {
      const s = useEditorStore.getState();
      s.markSaving();
      try {
        const res =
          s.target!.kind === "website"
            ? await websiteStudioApi.saveDraft(s.target!.id, s.content!, s.revision)
            : await websiteStudioApi.admin.saveTemplateDraft(s.target!.id, s.content!, s.revision);
        useEditorStore.getState().markSaved(res.revision);
        // Edits made while saving keep the editor dirty so they are saved next.
        if (useEditorStore.getState().changeCounter !== snapshotCounter) useEditorStore.setState({ saveState: "dirty" });
        else localStorage.removeItem(backupKey(s.target!.kind, s.target!.id));
        return true;
      } catch (e: any) {
        const conflict = e?.response?.status === 409;
        useEditorStore.getState().markSaveError(apiError(e, "Could not save. Your changes are kept in this browser."), conflict);
        return false;
      } finally {
        savingRef.current = null;
      }
    })();
    savingRef.current = run;
    return run;
  }, []);

  // Local backup on every change (draft recovery) + debounced autosave.
  useEffect(() => {
    if (!content || !store.target || changeCounter === 0) return;
    try {
      localStorage.setItem(backupKey(store.target.kind, store.target.id), JSON.stringify({ revision, content, savedAt: Date.now() }));
    } catch {
      /* storage full — autosave still works */
    }
    if (saveState === "conflict") return;
    const t = window.setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changeCounter]);

  // Retry failed saves periodically.
  useEffect(() => {
    if (saveState !== "error") return;
    const t = window.setTimeout(() => void saveNow(), 8000);
    return () => window.clearTimeout(t);
  }, [saveState, saveNow]);

  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      const s = useEditorStore.getState().saveState;
      if (s === "dirty" || s === "saving" || s === "error") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  /* ------------------------------------------------------------ shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable='true']");
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void manualSave();
      } else if (mod && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) useEditorStore.getState().redo();
        else useEditorStore.getState().undo();
      } else if (mod && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        useEditorStore.getState().redo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !typing) {
        const sel = useEditorStore.getState().selection;
        const hit = sel ? useEditorStore.getState().findSection(sel.sectionId) : null;
        if (hit?.page && (!sel?.path) && window.confirm("Delete the selected section?")) useEditorStore.getState().removeSection(sel!.sectionId);
      } else if (e.key === "Escape" && !typing) {
        useEditorStore.getState().select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manualSave = async () => {
    const ok = await saveNow();
    const t = useEditorStore.getState().target;
    if (ok && t?.kind === "website") {
      try {
        await websiteStudioApi.createVersion(t.id, "Manual save");
      } catch {
        /* draft is saved even if the version snapshot fails */
      }
    }
  };

  /* ------------------------------------------------------------ render */
  if (loadError) {
    return (
      <div className="wse-fullscreen-msg">
        <Icon name="X" size={30} />
        <p>{loadError}</p>
        <Link to="/website-studio/my-websites" className="wse-btn wse-btn--primary">Back to My Websites</Link>
      </div>
    );
  }
  if (!content) return <div className="wse-fullscreen-msg"><p>Loading editor…</p></div>;

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "All changes saved" : saveState === "dirty" ? "Unsaved changes" : saveState === "conflict" ? "Changed elsewhere — reload" : "Save failed — retrying";
  const pages = content.pages;
  const isWebsite = mode === "website";

  return (
    <div className="wse">
      <header className="wse-top">
        <Link to={isWebsite ? "/website-studio/my-websites" : "/website-studio/admin"} className="wse-icon-btn" title="Exit editor"><Icon name="ChevronLeft" size={18} /></Link>
        <input
          className="wse-top__name"
          value={name}
          aria-label="Website name"
          onChange={(e) => useEditorStore.getState().setMeta({ name: e.target.value })}
          onBlur={(e) => isWebsite && e.target.value.trim() && websiteStudioApi.updateWebsite(id, { name: e.target.value.trim() }).catch(() => undefined)}
        />
        <select className="wse-top__page" value={store.pageId ?? ""} onChange={(e) => store.setPage(e.target.value)} aria-label="Page">
          {pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <div className="wse-top__group">
          <button type="button" className="wse-icon-btn" title="Undo (Ctrl+Z)" disabled={!past.length} onClick={store.undo}><Icon name="RotateCcw" size={17} /></button>
          <button type="button" className="wse-icon-btn wse-flip" title="Redo (Ctrl+Shift+Z)" disabled={!future.length} onClick={store.redo}><Icon name="RotateCcw" size={17} /></button>
        </div>
        <div className="wse-top__group wse-seg">
          {(["desktop", "tablet", "mobile"] as const).map((b) => (
            <button type="button" key={b} className={breakpoint === b ? "is-active" : ""} onClick={() => store.setBreakpoint(b)} title={b}>
              <Icon name={b === "desktop" ? "LayoutGrid" : b === "tablet" ? "BookOpen" : "Phone"} size={15} /> <span>{b[0].toUpperCase() + b.slice(1)}</span>
            </button>
          ))}
        </div>
        <span className={`wse-top__status is-${saveState}`} title={saveError ?? ""}>{saveLabel}</span>
        {saveState === "conflict" ? <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => window.location.reload()}>Reload</button> : null}
        <div className="wse-top__spacer" />
        <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={manualSave}><Icon name="Check" size={15} /> Save</button>
        {isWebsite ? (
          <>
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => setDialog("ai")}><Icon name="Sparkles" size={15} /> AI</button>
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => setDialog("design")}><Icon name="Palette" size={15} /> Change Design</button>
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => setDialog("history")}><Icon name="Clock" size={15} /> History</button>
            <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={async () => { await saveNow(); window.open(`/website-studio/preview/${id}`, "_blank", "noopener"); }}><Icon name="Search" size={15} /> Preview</button>
            <Link to={`/website-studio/websites/${id}/settings`} className="wse-btn wse-btn--ghost wse-btn--sm"><Icon name="Wrench" size={15} /> Settings</Link>
            <button type="button" className="wse-btn wse-btn--primary wse-btn--sm" onClick={() => setDialog("publish")}>
              <Icon name="Plane" size={15} /> {status === "published" ? (store.hasUnpublishedChanges ? "Publish changes" : "Published") : "Publish"}
            </button>
          </>
        ) : (
          <button type="button" className="wse-btn wse-btn--primary wse-btn--sm" onClick={async () => {
            if (!(await saveNow())) return;
            await websiteStudioApi.admin.publishTemplate(id);
            alert("Template published. New websites will use this version; existing customer websites are not changed.");
          }}>Publish template</button>
        )}
      </header>

      {recovery ? (
        <div className="wse-banner">
          <span>We found unsaved changes from {new Date(recovery.savedAt).toLocaleString()} in this browser.</span>
          <button type="button" className="wse-btn wse-btn--primary wse-btn--sm" onClick={() => { useEditorStore.getState().replaceContent(recovery.content); setRecovery(null); }}>Recover changes</button>
          <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => { localStorage.removeItem(backupKey(mode, id)); setRecovery(null); }}>Discard</button>
        </div>
      ) : null}
      {designUndo ? (
        <div className="wse-banner">
          <span>Design changed to <b>{designUndo.report.templateName}</b>. Your content was kept.</span>
          <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={async () => {
            const res = await websiteStudioApi.restoreVersion(id, designUndo.versionId);
            useEditorStore.getState().replaceContent(res.content, res.revision);
            setDesignUndo(null);
          }}>Undo design change</button>
          <button type="button" className="wse-icon-btn" onClick={() => setDesignUndo(null)}><Icon name="X" size={14} /></button>
        </div>
      ) : null}

      <div className="wse-body">
        <LeftPanel websiteId={isWebsite ? id : null} kind={mode} onChangeDesign={() => setDialog("design")} />
        <EditorCanvas siteId={isWebsite ? id : null} kind={mode} />
        <PropertiesPanel websiteId={isWebsite ? id : null} />
      </div>

      {dialog === "design" && isWebsite ? (
        <ChangeDesignModal
          websiteId={id}
          categorySlug={meta.categorySlug}
          currentTemplate={meta.templateSlug}
          ensureSaved={saveNow}
          onClose={() => setDialog(null)}
          onSwitched={(versionId, report) => {
            setDesignUndo({ versionId, report });
            setMeta((m) => ({ ...m, templateSlug: report.templateSlug }));
            setDialog(null);
          }}
        />
      ) : null}
      {dialog === "history" && isWebsite ? <HistoryDrawer websiteId={id} onClose={() => setDialog(null)} /> : null}
      {dialog === "ai" && isWebsite ? <AiAssistant websiteId={id} onClose={() => setDialog(null)} onSuggestDesign={() => setDialog("design")} /> : null}
      {dialog === "publish" && isWebsite ? <PublishDialog websiteId={id} onClose={() => setDialog(null)} ensureSaved={saveNow} /> : null}
    </div>
  );
}
