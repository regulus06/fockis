import React, { useState } from "react";
import { Icon, ICON_NAMES } from "../../renderer/icons";
import type { FieldDef } from "./sectionSchemas";
import type { SiteContent } from "../../types/content";
import { MediaPickerButton } from "./MediaLibrary";

export function Row({ label, children, help }: { label: string; children: React.ReactNode; help?: string }) {
  return (
    <label className="wse-row">
      <span className="wse-row__label">{label}</span>
      {children}
      {help ? <small className="wse-row__help">{help}</small> : null}
    </label>
  );
}

export function ColorInput({ value, onChange, allowEmpty = true }: { value?: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value ?? "") ? (value as string) : "#000000";
  return (
    <div className="wse-color">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label="Pick color" />
      <input type="text" value={value ?? ""} placeholder="Default" onChange={(e) => onChange(e.target.value)} spellCheck={false} />
      {allowEmpty && value ? (
        <button type="button" className="wse-icon-btn" onClick={() => onChange("")} title="Reset to default">
          <Icon name="X" size={14} />
        </button>
      ) : null}
    </div>
  );
}

export function NumberInput({ value, onChange, min, max, step = 1, placeholder }: { value?: number; onChange: (v: number | undefined) => void; min?: number; max?: number; step?: number; placeholder?: string }) {
  return (
    <input
      type="number"
      className="wse-input"
      value={value ?? ""}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder ?? "Auto"}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  );
}

export function LinkPicker({ value, onChange, content }: { value?: string; onChange: (v: string) => void; content: SiteContent }) {
  const v = value ?? "";
  const isPage = v.startsWith("page:");
  const pageSlug = isPage ? v.slice(5).split(/[?#]/)[0] : "";
  const [mode, setMode] = useState<"page" | "url">(isPage || !v ? "page" : "url");
  return (
    <div className="wse-link">
      <div className="wse-seg">
        <button type="button" className={mode === "page" ? "is-active" : ""} onClick={() => setMode("page")}>Page</button>
        <button type="button" className={mode === "url" ? "is-active" : ""} onClick={() => setMode("url")}>URL</button>
      </div>
      {mode === "page" ? (
        <select className="wse-input" value={pageSlug} onChange={(e) => onChange(`page:${e.target.value}`)}>
          <option value="">Choose a page…</option>
          {content.pages.map((p) => (
            <option key={p.id} value={p.slug}>{p.title}</option>
          ))}
        </select>
      ) : (
        <input className="wse-input" value={isPage ? "" : v} placeholder="https://… or mailto: or tel:" onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

export function IconPicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  return (
    <div className="wse-iconpick">
      <button type="button" className="wse-iconpick__btn" onClick={() => setOpen(!open)}>
        {value ? <Icon name={value} size={18} /> : <span className="wse-muted">None</span>}
        <span>{value || "Choose icon"}</span>
        <Icon name="ChevronDown" size={14} />
      </button>
      {open ? (
        <div className="wse-iconpick__pop">
          <input className="wse-input" placeholder="Search icons" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          <div className="wse-iconpick__grid">
            <button type="button" onClick={() => (onChange(""), setOpen(false))} title="No icon"><Icon name="X" size={16} /></button>
            {ICON_NAMES.filter((n) => n.toLowerCase().includes(q.toLowerCase())).map((n) => (
              <button type="button" key={n} title={n} className={n === value ? "is-active" : ""} onClick={() => (onChange(n), setOpen(false))}>
                <Icon name={n} size={18} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ImageField({ value, onChange, websiteId }: { value?: string; onChange: (v: string) => void; websiteId: string | null }) {
  return (
    <div className="wse-imagefield">
      {value ? <img src={value} alt="" /> : <div className="wse-imagefield__empty"><Icon name="Camera" size={20} /></div>}
      <div className="wse-imagefield__actions">
        <MediaPickerButton websiteId={websiteId} onPick={(url) => onChange(url)} label={value ? "Replace" : "Choose image"} />
        {value ? <button type="button" className="wse-btn wse-btn--ghost" onClick={() => onChange("")}>Remove</button> : null}
      </div>
      <input className="wse-input" value={value ?? ""} placeholder="or paste an image URL" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function StringsEditor({ value, onChange, websiteId, imageMode }: { value: any[]; onChange: (v: any[]) => void; websiteId: string | null; imageMode: boolean }) {
  const list: string[] = Array.isArray(value) ? value.map(String) : [];
  return (
    <div className="wse-strings">
      {list.map((s, i) => (
        <div key={i} className="wse-strings__row">
          {imageMode ? <ImageField value={s} websiteId={websiteId} onChange={(v) => onChange(list.map((x, j) => (j === i ? v : x)))} /> : <input className="wse-input" value={s} onChange={(e) => onChange(list.map((x, j) => (j === i ? e.target.value : x)))} />}
          <button type="button" className="wse-icon-btn" onClick={() => onChange(list.filter((_, j) => j !== i))} title="Remove"><Icon name="Trash2" size={14} /></button>
        </div>
      ))}
      <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => onChange([...list, ""])}>
        <Icon name="Plus" size={14} /> Add
      </button>
    </div>
  );
}

function LinksEditor({ value, onChange, content }: { value: [string, string][]; onChange: (v: [string, string][]) => void; content: SiteContent }) {
  const list = Array.isArray(value) ? value : [];
  return (
    <div className="wse-strings">
      {list.map(([label, href], i) => (
        <div key={i} className="wse-card-lite">
          <input className="wse-input" value={label} onChange={(e) => onChange(list.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} placeholder="Label" />
          <LinkPicker value={href} content={content} onChange={(v) => onChange(list.map((x, j) => (j === i ? [x[0], v] : x)))} />
          <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => onChange(list.filter((_, j) => j !== i))}><Icon name="Trash2" size={14} /> Remove link</button>
        </div>
      ))}
      <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => onChange([...list, ["New link", "page:home"]])}><Icon name="Plus" size={14} /> Add link</button>
    </div>
  );
}

export function ButtonEditor({ value, onChange, content }: { value: any; onChange: (v: any) => void; content: SiteContent }) {
  const b = value ?? null;
  if (!b) {
    return (
      <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => onChange({ label: "Button", href: "page:contact", icon: "", style: "primary" })}>
        <Icon name="Plus" size={14} /> Add button
      </button>
    );
  }
  return (
    <div className="wse-card-lite">
      <Row label="Text"><input className="wse-input" value={b.label ?? ""} onChange={(e) => onChange({ ...b, label: e.target.value })} /></Row>
      <Row label="Link"><LinkPicker value={b.href} content={content} onChange={(v) => onChange({ ...b, href: v })} /></Row>
      <Row label="Icon"><IconPicker value={b.icon} onChange={(v) => onChange({ ...b, icon: v })} /></Row>
      <Row label="Style">
        <select className="wse-input" value={b.style ?? "primary"} onChange={(e) => onChange({ ...b, style: e.target.value })}>
          {["primary", "outline", "accent", "outline-light", "outline-accent", "light"].map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </Row>
      <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => onChange(null)}><Icon name="Trash2" size={14} /> Remove button</button>
    </div>
  );
}

export function ListEditor({ field, value, onChange, content, websiteId, onSelectItem }: { field: FieldDef; value: any[]; onChange: (v: any[]) => void; content: SiteContent; websiteId: string | null; onSelectItem?: (i: number) => void }) {
  const list = Array.isArray(value) ? value : [];
  const [open, setOpen] = useState<number | null>(null);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="wse-list">
      {list.map((item, i) => (
        <div key={i} className={`wse-list__item${open === i ? " is-open" : ""}`}>
          <div className="wse-list__head">
            <button type="button" className="wse-list__title" onClick={() => (setOpen(open === i ? null : i), onSelectItem?.(i))}>
              <Icon name={open === i ? "ChevronDown" : "ChevronRight"} size={14} />
              <span>{String(item?.[field.itemLabel ?? "label"] ?? `Item ${i + 1}`) || `Item ${i + 1}`}</span>
            </button>
            <button type="button" className="wse-icon-btn" onClick={() => move(i, -1)} title="Move up" disabled={i === 0}><Icon name="ChevronLeft" size={14} /></button>
            <button type="button" className="wse-icon-btn" onClick={() => move(i, 1)} title="Move down" disabled={i === list.length - 1}><Icon name="ChevronRight" size={14} /></button>
            <button type="button" className="wse-icon-btn" onClick={() => onChange([...list.slice(0, i + 1), JSON.parse(JSON.stringify(item)), ...list.slice(i + 1)])} title="Duplicate"><Icon name="Plus" size={14} /></button>
            <button type="button" className="wse-icon-btn" onClick={() => onChange(list.filter((_, j) => j !== i))} title="Delete"><Icon name="Trash2" size={14} /></button>
          </div>
          {open === i ? (
            <div className="wse-list__body">
              {(field.itemFields ?? []).map((f) => (
                <FieldControl key={f.key} field={f} value={item?.[f.key]} content={content} websiteId={websiteId} onChange={(v) => onChange(list.map((x, j) => (j === i ? { ...x, [f.key]: v } : x)))} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
      <button type="button" className="wse-btn wse-btn--ghost wse-btn--sm" onClick={() => (onChange([...list, field.newItem ? field.newItem() : {}]), setOpen(list.length))}>
        <Icon name="Plus" size={14} /> Add {field.label.toLowerCase().replace(/s$/, "")}
      </button>
    </div>
  );
}

/** Renders the right control for any schema field. */
export function FieldControl({ field, value, onChange, content, websiteId }: { field: FieldDef; value: any; onChange: (v: any) => void; content: SiteContent; websiteId: string | null }) {
  switch (field.type) {
    case "text":
      return <Row label={field.label} help={field.help}><input className="wse-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Row>;
    case "textarea":
      return <Row label={field.label} help={field.help}><textarea className="wse-input" rows={4} value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Row>;
    case "html":
      return <Row label={field.label} help={field.help}><textarea className="wse-input wse-mono" rows={8} value={value ?? ""} onChange={(e) => onChange(e.target.value)} spellCheck={false} /></Row>;
    case "number":
      return <Row label={field.label}><NumberInput value={value} min={field.min} max={field.max} onChange={(v) => onChange(v)} /></Row>;
    case "toggle":
      return (
        <label className="wse-toggle">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
          <span>{field.label}</span>
        </label>
      );
    case "select":
      return (
        <Row label={field.label}>
          <select className="wse-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
            {(field.options ?? []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Row>
      );
    case "color":
      return <Row label={field.label}><ColorInput value={value} onChange={onChange} /></Row>;
    case "icon":
      return <Row label={field.label}><IconPicker value={value} onChange={onChange} /></Row>;
    case "link":
      return <Row label={field.label}><LinkPicker value={value} onChange={onChange} content={content} /></Row>;
    case "image":
      return <Row label={field.label}><ImageField value={value} onChange={onChange} websiteId={websiteId} /></Row>;
    case "date":
      return <Row label={field.label}><input type="datetime-local" className="wse-input" value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></Row>;
    case "button":
      return <Row label={field.label}><ButtonEditor value={value} onChange={onChange} content={content} /></Row>;
    case "strings":
      return <Row label={field.label} help={field.help}><StringsEditor value={value} onChange={onChange} websiteId={websiteId} imageMode={field.key === "images"} /></Row>;
    case "links":
      return <Row label={field.label}><LinksEditor value={value} onChange={onChange} content={content} /></Row>;
    case "list":
      return (
        <div className="wse-row">
          <span className="wse-row__label">{field.label}</span>
          <ListEditor field={field} value={value} onChange={onChange} content={content} websiteId={websiteId} />
        </div>
      );
    default:
      return null;
  }
}
