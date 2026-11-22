import React from "react";
import { Icon } from "../../renderer/icons";
import { FONT_CHOICES, getPath } from "../../renderer/theme";
import { effectiveStyle, useEditorStore } from "../../store/websiteEditorStore";
import type { Breakpoint, ElementStyle, Section } from "../../types/content";
import { ButtonEditor, ColorInput, FieldControl, IconPicker, ImageField, LinkPicker, NumberInput, Row } from "./FieldEditors";
import { SECTION_SCHEMAS } from "./sectionSchemas";

function Group({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="wse-group" open={defaultOpen}>
      <summary>{title}</summary>
      <div className="wse-group__body">{children}</div>
    </details>
  );
}

const BP_LABEL: Record<Breakpoint, string> = { desktop: "Desktop", tablet: "Tablet", mobile: "Mobile" };

function ElementStyleControls({ section, path, kind }: { section: Section; path: string; kind: "text" | "image" | "button" }) {
  const updateElementStyle = useEditorStore((s) => s.updateElementStyle);
  const es: ElementStyle = section.elementStyles?.[path] ?? {};
  const set = (patch: Partial<ElementStyle>) => updateElementStyle(section.id, path, patch);
  return (
    <>
      {kind === "text" ? (
        <>
          <Row label="Font">
            <select className="wse-input" value={es.fontFamily ?? ""} onChange={(e) => set({ fontFamily: e.target.value })}>
              <option value="">Theme default</option>
              {FONT_CHOICES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
          <div className="wse-grid2">
            <Row label="Size (px)"><NumberInput value={es.fontSize} min={6} max={240} onChange={(v) => set({ fontSize: v })} /></Row>
            <Row label="Weight">
              <select className="wse-input" value={es.fontWeight ?? ""} onChange={(e) => set({ fontWeight: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">Auto</option>
                {[300, 400, 500, 600, 700, 800, 900].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </Row>
            <Row label="Line height"><NumberInput value={es.lineHeight} min={0.6} max={4} step={0.05} onChange={(v) => set({ lineHeight: v })} /></Row>
            <Row label="Letter spacing"><NumberInput value={es.letterSpacing} min={-10} max={40} step={0.5} onChange={(v) => set({ letterSpacing: v })} /></Row>
          </div>
          <Row label="Alignment">
            <div className="wse-seg">
              {(["left", "center", "right"] as const).map((a) => (
                <button type="button" key={a} className={es.textAlign === a ? "is-active" : ""} onClick={() => set({ textAlign: es.textAlign === a ? undefined : a })}>{a}</button>
              ))}
            </div>
          </Row>
          <Row label="Color"><ColorInput value={es.color} onChange={(v) => set({ color: v })} /></Row>
        </>
      ) : null}
      {kind === "image" ? (
        <>
          <Row label="Fit">
            <div className="wse-seg">
              {(["cover", "contain"] as const).map((a) => <button type="button" key={a} className={es.objectFit === a ? "is-active" : ""} onClick={() => set({ objectFit: a })}>{a}</button>)}
            </div>
          </Row>
          <Row label="Focus / crop position" help="Choose which part of the photo stays visible.">
            <select className="wse-input" value={es.objectPosition ?? ""} onChange={(e) => set({ objectPosition: e.target.value })}>
              <option value="">Center</option>
              {["top", "bottom", "left", "right", "left top", "right top", "left bottom", "right bottom"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Row>
          <div className="wse-grid2">
            <Row label="Width (px)"><NumberInput value={es.width} min={0} max={4000} onChange={(v) => set({ width: v })} /></Row>
            <Row label="Height (px)"><NumberInput value={es.height} min={0} max={4000} onChange={(v) => set({ height: v })} /></Row>
          </div>
          <Row label="Corner radius"><NumberInput value={es.borderRadius} min={0} max={999} onChange={(v) => set({ borderRadius: v })} /></Row>
        </>
      ) : null}
      {kind === "button" ? (
        <>
          <Row label="Background"><ColorInput value={es.background} onChange={(v) => set({ background: v })} /></Row>
          <Row label="Text color"><ColorInput value={es.color} onChange={(v) => set({ color: v })} /></Row>
          <Row label="Size">
            <div className="wse-seg">{(["sm", "md", "lg"] as const).map((a) => <button type="button" key={a} className={es.size === a ? "is-active" : ""} onClick={() => set({ size: a })}>{a}</button>)}</div>
          </Row>
          <Row label="Shape">
            <div className="wse-seg">{(["square", "rounded", "pill"] as const).map((a) => <button type="button" key={a} className={es.shape === a ? "is-active" : ""} onClick={() => set({ shape: a })}>{a}</button>)}</div>
          </Row>
          <Row label="Hover effect">
            <select className="wse-input" value={es.hoverEffect ?? "none"} onChange={(e) => set({ hoverEffect: e.target.value as any })}>
              {["none", "lift", "darken", "glow"].map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </Row>
        </>
      ) : null}
      {Object.keys(es).length ? (
        <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => updateElementStyle(section.id, path, null)}>Reset element styling</button>
      ) : null}
    </>
  );
}

function SectionStyleControls({ section }: { section: Section }) {
  const bp = useEditorStore((s) => s.breakpoint);
  const updateStyle = useEditorStore((s) => s.updateStyle);
  const st = effectiveStyle(section, bp);
  const set = (patch: Record<string, unknown>) => updateStyle(section.id, patch, bp);
  const setBase = (patch: Record<string, unknown>) => updateStyle(section.id, patch, "desktop");
  return (
    <>
      <p className="wse-scope"><Icon name={bp === "desktop" ? "LayoutGrid" : "Phone"} size={14} /> Editing <b>{BP_LABEL[bp]}</b> layout{bp !== "desktop" ? " (overrides desktop)" : ""}</p>
      <div className="wse-grid2">
        <Row label="Padding top"><NumberInput value={st.paddingTop} min={0} max={600} onChange={(v) => set({ paddingTop: v })} /></Row>
        <Row label="Padding bottom"><NumberInput value={st.paddingBottom} min={0} max={600} onChange={(v) => set({ paddingBottom: v })} /></Row>
        <Row label="Margin top"><NumberInput value={st.marginTop} min={-400} max={600} onChange={(v) => set({ marginTop: v })} /></Row>
        <Row label="Margin bottom"><NumberInput value={st.marginBottom} min={-400} max={600} onChange={(v) => set({ marginBottom: v })} /></Row>
        <Row label="Max width (px)"><NumberInput value={st.maxWidth} min={200} max={4000} onChange={(v) => set({ maxWidth: v })} /></Row>
        <Row label="Min height (px)"><NumberInput value={st.minHeight} min={0} max={2000} onChange={(v) => set({ minHeight: v })} /></Row>
        <Row label="Columns"><NumberInput value={st.columns} min={1} max={12} onChange={(v) => set({ columns: v })} /></Row>
        <Row label="Text scale"><NumberInput value={st.fontScale} min={0.5} max={2.5} step={0.05} onChange={(v) => set({ fontScale: v })} /></Row>
      </div>
      <Row label="Alignment">
        <div className="wse-seg">
          {(["left", "center", "right"] as const).map((a) => <button type="button" key={a} className={st.align === a ? "is-active" : ""} onClick={() => set({ align: st.align === a ? undefined : a })}>{a}</button>)}
        </div>
      </Row>
      <Row label="Background color"><ColorInput value={st.background} onChange={(v) => set({ background: v })} /></Row>
      <Row label="Background image"><ImageField value={st.backgroundImage} websiteId={useEditorStore.getState().target?.kind === "website" ? useEditorStore.getState().target!.id : null} onChange={(v) => set({ backgroundImage: v })} /></Row>
      <Row label="Text color"><ColorInput value={st.textColor} onChange={(v) => set({ textColor: v })} /></Row>
      {bp === "desktop" ? (
        <>
          <Row label="Overlay (on background image)"><ColorInput value={section.style.overlay} onChange={(v) => setBase({ overlay: v })} /></Row>
          <label className="wse-toggle"><input type="checkbox" checked={!!section.style.fullWidth} onChange={(e) => setBase({ fullWidth: e.target.checked || undefined })} /><span>Full width</span></label>
          <Row label="Animation">
            <select className="wse-input" value={section.style.animation ?? "none"} onChange={(e) => setBase({ animation: e.target.value })}>
              {["none", "fade-up", "fade-in", "zoom"].map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </Row>
        </>
      ) : null}
      <Row label="Visible on">
        <div className="wse-seg">
          {(["desktop", "tablet", "mobile"] as const).map((b) => {
            const hidden = !!section.style.hideOn?.[b];
            return (
              <button type="button" key={b} className={!hidden ? "is-active" : ""} onClick={() => setBase({ hideOn: { ...(section.style.hideOn ?? {}), [b]: !hidden } })}>
                {BP_LABEL[b]}
              </button>
            );
          })}
        </div>
      </Row>
    </>
  );
}

export default function PropertiesPanel({ websiteId }: { websiteId: string | null }) {
  const content = useEditorStore((s) => s.content)!;
  const selection = useEditorStore((s) => s.selection);
  const pageId = useEditorStore((s) => s.pageId);
  const updateProp = useEditorStore((s) => s.updateProp);
  const setVariant = useEditorStore((s) => s.setVariant);
  const select = useEditorStore((s) => s.select);
  const mutate = useEditorStore((s) => s.mutate);
  const hit = selection ? useEditorStore.getState().findSection(selection.sectionId) : null;
  const page = content.pages.find((p) => p.id === pageId);

  if (!selection || !hit) {
    if (!page) return null;
    return (
      <aside className="wse-props">
        <h3 className="wse-props__title"><Icon name="LayoutGrid" size={16} /> Page: {page.title}</h3>
        <p className="wse-muted">Click any text, image, button or section on the canvas to edit it.</p>
        <Group title="Page SEO">
          <Row label="SEO title"><input className="wse-input" value={page.seo.title ?? ""} onChange={(e) => mutate((d) => (d.pages.find((p) => p.id === page.id)!.seo.title = e.target.value), `seo-t-${page.id}`)} /></Row>
          <Row label="Meta description"><textarea className="wse-input" rows={3} value={page.seo.description ?? ""} onChange={(e) => mutate((d) => (d.pages.find((p) => p.id === page.id)!.seo.description = e.target.value), `seo-d-${page.id}`)} /></Row>
          <Row label="Social sharing image"><ImageField value={page.seo.ogImage} websiteId={websiteId} onChange={(v) => mutate((d) => (d.pages.find((p) => p.id === page.id)!.seo.ogImage = v))} /></Row>
          <label className="wse-toggle"><input type="checkbox" checked={!!page.seo.noindex} onChange={(e) => mutate((d) => (d.pages.find((p) => p.id === page.id)!.seo.noindex = e.target.checked))} /><span>Hide this page from search engines</span></label>
        </Group>
      </aside>
    );
  }

  const { section } = hit;
  const schema = SECTION_SCHEMAS[section.type];
  const path = selection.path;
  const kind = selection.kind;

  // ---------------- element-level editing ----------------
  if (path && (kind === "text" || kind === "image" || kind === "button" || kind === "list-item")) {
    const value = getPath(section.props, path);
    const listField = kind === "list-item" ? schema.fields.find((f) => f.key === path.split(".")[0]) : undefined;
    return (
      <aside className="wse-props">
        <div className="wse-props__crumb">
          <button type="button" className="wse-link" onClick={() => select({ sectionId: section.id, kind: "section" })}><Icon name="ChevronLeft" size={14} /> {schema.label}</button>
        </div>
        <h3 className="wse-props__title">{kind === "text" ? "Text" : kind === "image" ? "Image" : kind === "button" ? "Button" : "Item"}</h3>
        {kind === "text" ? (
          <>
            <Group title="Content"><textarea className="wse-input" rows={3} value={value ?? ""} onChange={(e) => updateProp(section.id, path, e.target.value)} /></Group>
            <Group title="Typography"><ElementStyleControls section={section} path={path} kind="text" /></Group>
          </>
        ) : null}
        {kind === "image" ? (
          <>
            <Group title="Image">
              <ImageField value={value} websiteId={websiteId} onChange={(v) => updateProp(section.id, path, v)} />
              <Row label="Alt text (for accessibility & SEO)"><input className="wse-input" value={getPath(section.props, `${path}Alt`) ?? ""} onChange={(e) => updateProp(section.id, `${path}Alt`, e.target.value)} /></Row>
            </Group>
            <Group title="Size & position"><ElementStyleControls section={section} path={path} kind="image" /></Group>
          </>
        ) : null}
        {kind === "button" ? (
          <>
            <Group title="Button"><ButtonEditor value={value} content={content} onChange={(v) => updateProp(section.id, path, v)} /></Group>
            <Group title="Style"><ElementStyleControls section={section} path={path} kind="button" /></Group>
          </>
        ) : null}
        {kind === "list-item" && listField?.itemFields ? (
          <Group title="Item settings">
            {listField.itemFields.map((f) => (
              <FieldControl key={f.key} field={f} value={value?.[f.key]} content={content} websiteId={websiteId} onChange={(v) => updateProp(section.id, `${path}.${f.key}`, v)} />
            ))}
          </Group>
        ) : null}
      </aside>
    );
  }

  // ---------------- section-level editing ----------------
  return (
    <aside className="wse-props">
      <h3 className="wse-props__title"><Icon name={schema.icon} size={16} /> {schema.label}</h3>
      {schema.variants ? (
        <Group title="Design">
          <div className="wse-variants">
            {schema.variants.map((v) => (
              <button type="button" key={v.value} className={section.variant === v.value ? "is-active" : ""} onClick={() => setVariant(section.id, v.value)}>{v.label}</button>
            ))}
          </div>
        </Group>
      ) : null}
      <Group title="Content">
        {schema.fields.map((f) => (
          <FieldControl key={f.key} field={f} value={section.props[f.key]} content={content} websiteId={websiteId} onChange={(v) => updateProp(section.id, f.key, v)} />
        ))}
      </Group>
      <Group title="Layout & style" defaultOpen={false}>
        <SectionStyleControls section={section} />
      </Group>
      {section.type === "header" ? (
        <Group title="Navigation" defaultOpen={false}>
          <p className="wse-muted">Edit menu links in the Navigation tab on the left.</p>
        </Group>
      ) : null}
    </aside>
  );
}

export { IconPicker, LinkPicker };
