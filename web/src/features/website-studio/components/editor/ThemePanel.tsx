import React from "react";
import { FONT_CHOICES } from "../../renderer/theme";
import { useEditorStore } from "../../store/websiteEditorStore";
import type { SiteTheme } from "../../types/content";
import { ColorInput, ImageField, NumberInput, Row } from "./FieldEditors";

const COLOR_LABELS: [keyof SiteTheme["colors"], string][] = [
  ["primary", "Brand / buttons"],
  ["primaryText", "Button text"],
  ["secondary", "Secondary"],
  ["accent", "Accent"],
  ["background", "Site background"],
  ["surface", "Soft background"],
  ["heading", "Headings"],
  ["text", "Body text"],
  ["muted", "Muted text"],
  ["border", "Borders"],
  ["headerBg", "Header background"],
  ["headerText", "Header text"],
  ["topBarBg", "Top bar background"],
  ["topBarText", "Top bar text"],
  ["footerBg", "Footer background"],
  ["footerText", "Footer text"],
];

export default function ThemePanel({ websiteId }: { websiteId: string | null }) {
  const content = useEditorStore((s) => s.content)!;
  const mutate = useEditorStore((s) => s.mutate);
  const select = useEditorStore((s) => s.select);
  const t = content.theme;
  const setTheme = (fn: (th: SiteTheme) => void, key: string) => mutate((d) => fn(d.theme), key);
  return (
    <div className="wse-tab">
      <h4 className="wse-subtitle">Brand</h4>
      <Row label="Logo image (optional — replaces the text logo)">
        <ImageField value={content.header.props.logoUrl || content.settings.logoUrl} websiteId={websiteId} onChange={(v) => mutate((d) => { d.header.props.logoUrl = v; d.settings.logoUrl = v; })} />
      </Row>
      <Row label="Favicon"><ImageField value={content.settings.faviconUrl} websiteId={websiteId} onChange={(v) => mutate((d) => (d.settings.faviconUrl = v))} /></Row>

      <h4 className="wse-subtitle">Colors</h4>
      {COLOR_LABELS.map(([k, label]) => (
        <Row key={k} label={label}><ColorInput value={t.colors[k]} allowEmpty={false} onChange={(v) => setTheme((th) => (th.colors[k] = v), `color-${k}`)} /></Row>
      ))}

      <h4 className="wse-subtitle">Fonts</h4>
      {(["heading", "body", "script", "nav"] as const).map((k) => (
        <Row key={k} label={k === "nav" ? "Navigation" : k[0].toUpperCase() + k.slice(1)}>
          <select className="wse-input" value={t.fonts[k]} onChange={(e) => setTheme((th) => (th.fonts[k] = e.target.value), `font-${k}`)} style={{ fontFamily: t.fonts[k] }}>
            {[...new Set([t.fonts[k], ...FONT_CHOICES])].map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </Row>
      ))}

      <h4 className="wse-subtitle">Buttons & layout</h4>
      <Row label="Default button shape">
        <div className="wse-seg">
          {(["square", "rounded", "pill"] as const).map((s) => <button type="button" key={s} className={t.buttonShape === s ? "is-active" : ""} onClick={() => setTheme((th) => (th.buttonShape = s), "shape")}>{s}</button>)}
        </div>
      </Row>
      <Row label="Corner radius (px)"><NumberInput value={t.radius} min={0} max={40} onChange={(v) => setTheme((th) => (th.radius = v ?? 0), "radius")} /></Row>
      <Row label="Content width (px)"><NumberInput value={t.maxWidth} min={800} max={2400} onChange={(v) => setTheme((th) => (th.maxWidth = v ?? 1280), "maxw")} /></Row>
      <h4 className="wse-subtitle">Header & footer</h4>
      <div className="wse-btnrow">
        <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => select({ sectionId: content.header.id, kind: "section" })}>Edit header</button>
        <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => select({ sectionId: content.footer.id, kind: "section" })}>Edit footer</button>
      </div>
    </div>
  );
}
