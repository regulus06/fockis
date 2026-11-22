import { create } from "zustand";
import type { Breakpoint, ElementStyle, Section, SectionStyle, SiteContent, SitePage, StyleBox } from "../types/content";
import type { Selection } from "../renderer/context";
import { getPath, setPath } from "../renderer/theme";

export type EditorTarget = { kind: "website" | "template"; id: string };
export type SaveState = "saved" | "dirty" | "saving" | "error" | "conflict";

const HISTORY_LIMIT = 80;

export function uid(prefix = "s"): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}-${rand.slice(0, 10)}`;
}

const clone = <T,>(v: T): T => (typeof structuredClone === "function" ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

interface EditorState {
  target: EditorTarget | null;
  name: string;
  slug: string;
  url: string;
  status: string;
  role: string;
  content: SiteContent | null;
  revision: number;
  pageId: string | null;
  selection: Selection | null;
  hoveredId: string | null;
  breakpoint: Breakpoint;
  past: SiteContent[];
  future: SiteContent[];
  lastCoalesce: { key: string; at: number } | null;
  saveState: SaveState;
  saveError: string | null;
  lastSavedAt: number | null;
  /** increments on every content change; used by autosave */
  changeCounter: number;
  hasUnpublishedChanges: boolean;

  load: (input: { target: EditorTarget; name: string; slug?: string; url?: string; status?: string; role?: string; content: SiteContent; revision: number; hasUnpublishedChanges?: boolean }) => void;
  setMeta: (patch: Partial<Pick<EditorState, "name" | "slug" | "url" | "status" | "hasUnpublishedChanges">>) => void;
  replaceContent: (content: SiteContent, revision?: number, recordHistory?: boolean) => void;
  mutate: (fn: (draft: SiteContent) => void, coalesceKey?: string) => void;
  undo: () => void;
  redo: () => void;
  select: (sel: Selection | null) => void;
  hover: (id: string | null) => void;
  setBreakpoint: (b: Breakpoint) => void;
  setPage: (pageId: string) => void;
  markSaving: () => void;
  markSaved: (revision: number) => void;
  markSaveError: (message: string, conflict?: boolean) => void;

  // section helpers
  findSection: (id: string) => { section: Section; page: SitePage | null; index: number } | null;
  updateProp: (sectionId: string, path: string, value: unknown) => void;
  updateStyle: (sectionId: string, patch: Partial<StyleBox> & Partial<SectionStyle>, scope?: Breakpoint) => void;
  updateElementStyle: (sectionId: string, path: string, patch: Partial<ElementStyle> | null) => void;
  setVariant: (sectionId: string, variant: string) => void;
  insertSection: (section: Omit<Section, "id"> | Section, index?: number, pageId?: string) => string;
  removeSection: (sectionId: string) => void;
  duplicateSection: (sectionId: string) => void;
  moveSection: (sectionId: string, toIndex: number) => void;
  toggleHidden: (sectionId: string) => void;
}

function locate(content: SiteContent, id: string): { section: Section; page: SitePage | null; index: number } | null {
  if (content.header.id === id) return { section: content.header, page: null, index: 0 };
  if (content.footer.id === id) return { section: content.footer, page: null, index: 0 };
  for (const p of content.pages) {
    const index = p.sections.findIndex((s) => s.id === id);
    if (index >= 0) return { section: p.sections[index], page: p, index };
  }
  return null;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  target: null,
  name: "",
  slug: "",
  url: "",
  status: "draft",
  role: "owner",
  content: null,
  revision: 0,
  pageId: null,
  selection: null,
  hoveredId: null,
  breakpoint: "desktop",
  past: [],
  future: [],
  lastCoalesce: null,
  saveState: "saved",
  saveError: null,
  lastSavedAt: null,
  changeCounter: 0,
  hasUnpublishedChanges: false,

  load: (input) =>
    set({
      target: input.target,
      name: input.name,
      slug: input.slug ?? "",
      url: input.url ?? "",
      status: input.status ?? "draft",
      role: input.role ?? "owner",
      content: input.content,
      revision: input.revision,
      pageId: (input.content.pages.find((p) => p.isHomepage) ?? input.content.pages[0])?.id ?? null,
      selection: null,
      past: [],
      future: [],
      saveState: "saved",
      saveError: null,
      changeCounter: 0,
      hasUnpublishedChanges: !!input.hasUnpublishedChanges,
    }),

  setMeta: (patch) => set(patch as any),

  replaceContent: (content, revision, recordHistory = true) => {
    const { content: prev, past, pageId } = get();
    set({
      content,
      revision: revision ?? get().revision,
      past: recordHistory && prev ? [...past, prev].slice(-HISTORY_LIMIT) : past,
      future: [],
      pageId: content.pages.some((p) => p.id === pageId) ? pageId : (content.pages.find((p) => p.isHomepage) ?? content.pages[0])?.id ?? null,
      selection: null,
      changeCounter: get().changeCounter + 1,
      saveState: revision !== undefined ? "saved" : "dirty",
      hasUnpublishedChanges: true,
    });
  },

  mutate: (fn, coalesceKey) => {
    const { content, past, lastCoalesce } = get();
    if (!content) return;
    const draft = clone(content);
    fn(draft);
    const now = Date.now();
    const coalesce = !!coalesceKey && lastCoalesce?.key === coalesceKey && now - lastCoalesce.at < 1200;
    set({
      content: draft,
      past: coalesce ? past : [...past, content].slice(-HISTORY_LIMIT),
      future: [],
      lastCoalesce: coalesceKey ? { key: coalesceKey, at: now } : null,
      changeCounter: get().changeCounter + 1,
      saveState: get().saveState === "conflict" ? "conflict" : "dirty",
      hasUnpublishedChanges: true,
    });
  },

  undo: () => {
    const { past, content, future } = get();
    if (!past.length || !content) return;
    const prev = past[past.length - 1];
    set({ content: prev, past: past.slice(0, -1), future: [content, ...future].slice(0, HISTORY_LIMIT), changeCounter: get().changeCounter + 1, saveState: "dirty", lastCoalesce: null });
  },

  redo: () => {
    const { past, content, future } = get();
    if (!future.length || !content) return;
    const next = future[0];
    set({ content: next, past: [...past, content], future: future.slice(1), changeCounter: get().changeCounter + 1, saveState: "dirty", lastCoalesce: null });
  },

  select: (selection) => set({ selection }),
  hover: (hoveredId) => set({ hoveredId }),
  setBreakpoint: (breakpoint) => set({ breakpoint }),
  setPage: (pageId) => set({ pageId, selection: null }),
  markSaving: () => set({ saveState: "saving", saveError: null }),
  markSaved: (revision) => set((s) => ({ revision, saveState: s.saveState === "saving" ? "saved" : s.saveState, lastSavedAt: Date.now(), saveError: null })),
  markSaveError: (message, conflict) => set({ saveState: conflict ? "conflict" : "error", saveError: message }),

  findSection: (id) => {
    const c = get().content;
    return c ? locate(c, id) : null;
  },

  updateProp: (sectionId, path, value) =>
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (!hit) return;
      hit.section.props = setPath(hit.section.props, path, value);
    }, `prop:${sectionId}:${path}`),

  updateStyle: (sectionId, patch, scope = "desktop") =>
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (!hit) return;
      const st = hit.section.style ?? (hit.section.style = {});
      if (scope === "desktop") {
        Object.entries(patch).forEach(([k, v]) => (v === undefined || v === "" ? delete (st as any)[k] : ((st as any)[k] = v)));
      } else {
        st.responsive = st.responsive ?? {};
        const box = (st.responsive[scope] = { ...(st.responsive[scope] ?? {}) });
        Object.entries(patch).forEach(([k, v]) => (v === undefined || v === "" ? delete (box as any)[k] : ((box as any)[k] = v)));
      }
    }, `style:${sectionId}:${scope}:${Object.keys(patch).join(",")}`),

  updateElementStyle: (sectionId, path, patch) =>
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (!hit) return;
      const all = (hit.section.elementStyles = hit.section.elementStyles ?? {});
      if (patch === null) {
        delete all[path];
        return;
      }
      const cur = { ...(all[path] ?? {}) };
      Object.entries(patch).forEach(([k, v]) => (v === undefined || v === "" ? delete (cur as any)[k] : ((cur as any)[k] = v)));
      all[path] = cur;
    }, `es:${sectionId}:${path}:${patch ? Object.keys(patch).join(",") : "reset"}`),

  setVariant: (sectionId, variant) =>
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (hit) hit.section.variant = variant;
    }),

  insertSection: (section, index, pageId) => {
    const id = "id" in section && section.id ? section.id : uid("s");
    get().mutate((d) => {
      const page = d.pages.find((p) => p.id === (pageId ?? get().pageId)) ?? d.pages[0];
      const s = { ...clone(section), id } as Section;
      const at = index === undefined ? page.sections.length : Math.max(0, Math.min(index, page.sections.length));
      page.sections.splice(at, 0, s);
    });
    set({ selection: { sectionId: id, kind: "section" } });
    return id;
  },

  removeSection: (sectionId) => {
    get().mutate((d) => {
      for (const p of d.pages) p.sections = p.sections.filter((s) => s.id !== sectionId);
    });
    if (get().selection?.sectionId === sectionId) set({ selection: null });
  },

  duplicateSection: (sectionId) => {
    let newId = "";
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (!hit?.page) return;
      newId = uid("s");
      hit.page.sections.splice(hit.index + 1, 0, { ...clone(hit.section), id: newId });
    });
    if (newId) set({ selection: { sectionId: newId, kind: "section" } });
  },

  moveSection: (sectionId, toIndex) =>
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (!hit?.page) return;
      const list = hit.page.sections;
      const [s] = list.splice(hit.index, 1);
      list.splice(Math.max(0, Math.min(toIndex, list.length)), 0, s);
    }),

  toggleHidden: (sectionId) =>
    get().mutate((d) => {
      const hit = locate(d, sectionId);
      if (hit) hit.section.style = { ...hit.section.style, hidden: !hit.section.style?.hidden };
    }),
}));

/** Reads the effective style value for a breakpoint (desktop base + overrides). */
export function effectiveStyle(section: Section, bp: Breakpoint): StyleBox & SectionStyle {
  const base = section.style ?? {};
  if (bp === "desktop") return base;
  const t = base.responsive?.tablet ?? {};
  const m = base.responsive?.mobile ?? {};
  return bp === "tablet" ? { ...base, ...t } : { ...base, ...t, ...m };
}

export { getPath };
