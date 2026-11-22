import React, { createContext, useContext } from "react";
import type { Section, SiteContent, SitePage } from "../types/content";

export type RenderMode = "edit" | "preview" | "live";

export interface Selection {
  sectionId: string;
  path?: string;
  kind?: "section" | "text" | "image" | "button" | "list-item";
}

/** Bridge supplied by the visual editor. Absent on public websites. */
export interface EditBridge {
  selection: Selection | null;
  select: (sel: Selection | null) => void;
  updateProp: (sectionId: string, path: string, value: unknown) => void;
  hover: (sectionId: string | null) => void;
  hoveredId: string | null;
  breakpoint: "desktop" | "tablet" | "mobile";
}

export interface SiteRuntime {
  siteId: string | null;
  /** "website" for customer websites; "template" when previewing a master template. */
  kind: "website" | "template";
  /** prefix used for public links, e.g. "/s/my-bakery" or "" on custom domains */
  basePath: string;
  query: URLSearchParams;
}

export interface RenderContextValue {
  content: SiteContent;
  page: SitePage;
  mode: RenderMode;
  runtime: SiteRuntime;
  edit: EditBridge | null;
  navigate: (href: string) => void;
  resolveHref: (href: string) => string;
}

export const RenderContext = createContext<RenderContextValue | null>(null);

export function useRender(): RenderContextValue {
  const ctx = useContext(RenderContext);
  if (!ctx) throw new Error("Website renderer context missing");
  return ctx;
}

export const SectionContext = createContext<Section | null>(null);

export function useSection(): Section {
  const s = useContext(SectionContext);
  if (!s) throw new Error("Section context missing");
  return s;
}

export function SectionProvider({ section, children }: { section: Section; children: React.ReactNode }) {
  return <SectionContext.Provider value={section}>{children}</SectionContext.Provider>;
}
