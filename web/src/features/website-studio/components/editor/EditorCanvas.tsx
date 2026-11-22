import React, { useEffect, useMemo, useRef, useState } from "react";
import SiteRenderer, { type SectionFrameProps } from "../../renderer/SiteRenderer";
import type { EditBridge } from "../../renderer/context";
import { Icon } from "../../renderer/icons";
import { useEditorStore, uid } from "../../store/websiteEditorStore";
import { SECTION_SCHEMAS } from "./sectionSchemas";
import type { Section, SectionType } from "../../types/content";

export const DND_NEW = "application/x-ws-new-section";
export const DND_MOVE = "application/x-ws-move-section";
export const DND_SAVED = "application/x-ws-saved-section";

const WIDTHS = { desktop: 1280, tablet: 820, mobile: 390 } as const;

function DropZone({ index, active }: { index: number; active: boolean }) {
  const [over, setOver] = useState(false);
  const insertSection = useEditorStore((s) => s.insertSection);
  const moveSection = useEditorStore((s) => s.moveSection);
  const findSection = useEditorStore((s) => s.findSection);
  if (!active) return null;
  return (
    <div
      className={`wse-drop${over ? " is-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        setDragging(false);
        const type = e.dataTransfer.getData(DND_NEW) as SectionType;
        const moveId = e.dataTransfer.getData(DND_MOVE);
        const saved = e.dataTransfer.getData(DND_SAVED);
        if (type && SECTION_SCHEMAS[type]) insertSection({ ...SECTION_SCHEMAS[type].create(), id: uid("s") } as Section, index);
        else if (saved) insertSection({ ...(JSON.parse(saved) as Section), id: uid("s") }, index);
        else if (moveId) {
          const hit = findSection(moveId);
          if (hit) moveSection(moveId, hit.index < index ? index - 1 : index);
        }
      }}
    >
      <span>Drop here</span>
    </div>
  );
}

function Frame({ section, area, index, count, children }: SectionFrameProps) {
  const selection = useEditorStore((s) => s.selection);
  const hovered = useEditorStore((s) => s.hoveredId);
  const breakpoint = useEditorStore((s) => s.breakpoint);
  const select = useEditorStore((s) => s.select);
  const hover = useEditorStore((s) => s.hover);
  const moveSection = useEditorStore((s) => s.moveSection);
  const duplicateSection = useEditorStore((s) => s.duplicateSection);
  const removeSection = useEditorStore((s) => s.removeSection);
  const toggleHidden = useEditorStore((s) => s.toggleHidden);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const dragging = useContextDragging();
  const isSelected = selection?.sectionId === section.id;
  const isHovered = hovered === section.id;
  const hiddenHere = section.style?.hidden || section.style?.hideOn?.[breakpoint];
  const schema = SECTION_SCHEMAS[section.type];
  const ref = useRef<HTMLDivElement | null>(null);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const scale = Number(ref.current?.closest<HTMLElement>(".wse-canvas__frame")?.dataset.scale ?? 1) || 1;
    const startH = (ref.current?.getBoundingClientRect().height ?? 0) / scale;
    const onMove = (ev: PointerEvent) => {
      const h = Math.max(40, Math.round((startH + (ev.clientY - startY) / scale) / 4) * 4);
      updateStyle(section.id, { minHeight: h }, breakpoint);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <>
      {area === "page" && index === 0 ? <DropZone index={0} active={dragging} /> : null}
      <div
        ref={ref}
        className={`wse-frame${isSelected ? " is-selected" : ""}${isHovered ? " is-hovered" : ""}${hiddenHere ? " is-hidden" : ""}`}
        onMouseEnter={() => hover(section.id)}
        onMouseLeave={() => hover(null)}
        onClick={() => select({ sectionId: section.id, kind: "section" })}
      >
        <div className="wse-frame__label">
          {schema?.label ?? section.type}
          {hiddenHere ? " · hidden" : ""}
        </div>
        {(isSelected || isHovered) && area === "page" ? (
          <div className="wse-frame__tools" onClick={(e) => e.stopPropagation()}>
            <span
              className="wse-frame__drag"
              draggable
              title="Drag to reorder"
              onDragStart={(e) => {
                e.dataTransfer.setData(DND_MOVE, section.id);
                e.dataTransfer.effectAllowed = "move";
                setDragging(true);
              }}
              onDragEnd={() => setDragging(false)}
            >
              <Icon name="Menu" size={14} />
            </span>
            <button type="button" title="Move up" disabled={index === 0} onClick={() => moveSection(section.id, index - 1)}><Icon name="ChevronLeft" size={14} /></button>
            <button type="button" title="Move down" disabled={index === count - 1} onClick={() => moveSection(section.id, index + 1)}><Icon name="ChevronRight" size={14} /></button>
            <button type="button" title="Duplicate" onClick={() => duplicateSection(section.id)}><Icon name="Plus" size={14} /></button>
            <button type="button" title={section.style?.hidden ? "Show" : "Hide"} onClick={() => toggleHidden(section.id)}><Icon name={section.style?.hidden ? "Search" : "X"} size={14} /></button>
            <button type="button" title="Delete" onClick={() => window.confirm("Delete this section?") && removeSection(section.id)}><Icon name="Trash2" size={14} /></button>
          </div>
        ) : null}
        {children}
        {isSelected && area === "page" ? <div className="wse-frame__resize" title="Drag to change height" onPointerDown={startResize} /> : null}
      </div>
      {area === "page" ? <DropZone index={index + 1} active={dragging} /> : null}
    </>
  );
}

/* Drag state is global so library items (left panel) can activate drop zones. */
let draggingState = false;
const listeners = new Set<(v: boolean) => void>();
export function setDragging(v: boolean) {
  draggingState = v;
  listeners.forEach((l) => l(v));
}
function useContextDragging() {
  const [v, setV] = useState(draggingState);
  useEffect(() => {
    listeners.add(setV);
    return () => void listeners.delete(setV);
  }, []);
  return v;
}

export default function EditorCanvas({ siteId, kind }: { siteId: string | null; kind: "website" | "template" }) {
  const content = useEditorStore((s) => s.content)!;
  const pageId = useEditorStore((s) => s.pageId);
  const selection = useEditorStore((s) => s.selection);
  const hoveredId = useEditorStore((s) => s.hoveredId);
  const breakpoint = useEditorStore((s) => s.breakpoint);
  const select = useEditorStore((s) => s.select);
  const hover = useEditorStore((s) => s.hover);
  const updateProp = useEditorStore((s) => s.updateProp);
  const setPage = useEditorStore((s) => s.setPage);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState(1000);

  useEffect(() => {
    const stop = () => setDragging(false);
    window.addEventListener("dragend", stop);
    window.addEventListener("drop", stop);
    return () => {
      window.removeEventListener("dragend", stop);
      window.removeEventListener("drop", stop);
    };
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAvailable(el.clientWidth - 48));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const page = content.pages.find((p) => p.id === pageId) ?? content.pages[0];
  const width = WIDTHS[breakpoint];
  const scale = Math.min(1, available / width);

  const bridge: EditBridge = useMemo(
    () => ({ selection, select, updateProp, hover, hoveredId, breakpoint }),
    [selection, select, updateProp, hover, hoveredId, breakpoint],
  );

  const runtime = useMemo(() => ({ siteId, kind, basePath: "", query: new URLSearchParams() }), [siteId, kind]);

  return (
    <div className="wse-canvas" ref={wrapRef} onClick={() => select(null)}>
      <div
        className={`wse-canvas__frame is-${breakpoint}`}
        data-scale={scale}
        style={{ width, zoom: scale } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
        onDragEnter={() => setDragging(true)}
      >
        <SiteRenderer
          content={content}
          pageSlug={page.slug}
          mode="edit"
          runtime={runtime}
          edit={bridge}
          SectionFrame={Frame}
          onNavigate={(slug) => {
            const target = content.pages.find((p) => p.slug === slug) ?? content.pages.find((p) => p.isHomepage);
            if (target) setPage(target.id);
          }}
        />
      </div>
    </div>
  );
}
