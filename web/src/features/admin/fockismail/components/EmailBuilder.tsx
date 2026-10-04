import { useCallback, useEffect, useRef, useState } from "react";
import type { EmailBlock as BlockModel, EmailBlockStyle, EmailBlockType, EmailDocument, TemplateCategory } from "../types/mailchimp.types";
import { createBlock, documentToHtml } from "../utils/emailBlocks";
import { BLOCK_LABELS, TEMPLATE_CATEGORY_LABELS } from "../utils/labels";
import { cx, downloadText, uid } from "../utils/format";
import { EmailBlock } from "./EmailBlock";
import { EmailBuilderSidebar, DRAG_MOVE, DRAG_NEW } from "./EmailBuilderSidebar";
import { EmailBuilderProperties } from "./EmailBuilderProperties";
import { Button, IconButton } from "./ui/Button";
import { Segmented } from "./ui/Tabs";
import { Modal } from "./ui/Overlay";
import { SelectField, TextArea, TextField } from "./ui/Field";
import { Notice } from "./ui/Feedback";
import { Icon } from "./ui/Icon";
import { useAction, useMailchimp } from "../hooks/useMailchimp";
import { campaignsApi } from "../services/campaignsApi";
import { templatesApi } from "../services/templatesApi";

interface History {
  past: EmailDocument[];
  present: EmailDocument;
  future: EmailDocument[];
}

export interface EmailBuilderProps {
  initial: EmailDocument;
  onChange?: (doc: EmailDocument) => void;
  onSave?: (doc: EmailDocument) => Promise<void> | void;
  campaignId?: string;
  subject?: string;
  previewText?: string;
  fromName?: string;
  /** Hide campaign-specific actions when editing a template. */
  mode?: "campaign" | "template";
  templateName?: string;
}

type Device = "desktop" | "mobile";

/** Visual block-based email editor with history, drag and drop, and previews. */
export function EmailBuilder({ initial, onChange, onSave, campaignId, subject = "", previewText = "", fromName = "Fockis", mode = "campaign", templateName }: EmailBuilderProps) {
  const { toast } = useMailchimp();
  const run = useAction();
  const [h, setH] = useState<History>({ past: [], present: initial, future: [] });
  const [selected, setSelected] = useState<string | null>(initial.blocks[0]?.id ?? null);
  const [device, setDevice] = useState<Device>("desktop");
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [testEmails, setTestEmails] = useState("");
  const [tplOpen, setTplOpen] = useState(false);
  const [tplName, setTplName] = useState(templateName ?? "");
  const [tplCat, setTplCat] = useState<TemplateCategory>("newsletter");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const doc = h.present;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    onChangeRef.current?.(doc);
  }, [doc]);

  const commit = useCallback((next: EmailDocument | ((d: EmailDocument) => EmailDocument)) => {
    setH((cur) => {
      const value = typeof next === "function" ? next(cur.present) : next;
      return { past: [...cur.past.slice(-49), cur.present], present: value, future: [] };
    });
    setDirty(true);
  }, []);

  const undo = useCallback(() => setH((cur) => (cur.past.length ? { past: cur.past.slice(0, -1), present: cur.past[cur.past.length - 1], future: [cur.present, ...cur.future] } : cur)), []);
  const redo = useCallback(() => setH((cur) => (cur.future.length ? { past: [...cur.past, cur.present], present: cur.future[0], future: cur.future.slice(1) } : cur)), []);

  const selIndex = doc.blocks.findIndex((b) => b.id === selected);
  const block = selIndex >= 0 ? doc.blocks[selIndex] : null;

  const insert = (type: EmailBlockType, index?: number) => {
    const b = createBlock(type);
    const at = index ?? (selIndex >= 0 ? selIndex + 1 : doc.blocks.length);
    commit((d) => ({ ...d, blocks: [...d.blocks.slice(0, at), b, ...d.blocks.slice(at)] }));
    setSelected(b.id);
  };

  const patchBlock = (id: string, patch: Partial<BlockModel>) =>
    commit((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const patchStyle = (id: string, patch: Partial<EmailBlockStyle>) =>
    commit((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? { ...b, style: { ...b.style, ...patch } } : b)) }));

  const move = (id: string, to: number) =>
    commit((d) => {
      const from = d.blocks.findIndex((b) => b.id === id);
      if (from < 0) return d;
      const blocks = [...d.blocks];
      const [item] = blocks.splice(from, 1);
      blocks.splice(Math.max(0, Math.min(blocks.length, to > from ? to - 1 : to)), 0, item);
      return { ...d, blocks };
    });

  const remove = (id: string) => {
    const i = doc.blocks.findIndex((b) => b.id === id);
    commit((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
    setSelected(doc.blocks[i + 1]?.id ?? doc.blocks[i - 1]?.id ?? null);
  };

  const duplicate = (id: string) => {
    const i = doc.blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    const copy: BlockModel = { ...structuredClone(doc.blocks[i]), id: uid("blk") };
    commit((d) => ({ ...d, blocks: [...d.blocks.slice(0, i + 1), copy, ...d.blocks.slice(i + 1)] }));
    setSelected(copy.id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !typing) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y" && !typing) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  const onDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const newType = e.dataTransfer.getData(DRAG_NEW) as EmailBlockType | "";
    const moveId = e.dataTransfer.getData(DRAG_MOVE);
    if (newType) insert(newType, index);
    else if (moveId) move(moveId, index);
    setDropIndex(null);
  };

  const save = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(doc);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const validEmails = testEmails.split(/[\s,;]+/).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x));

  const dropZone = (index: number) => (
    <div
      className={cx("fm-eb-drop", dropIndex === index && "is-over")}
      onDragOver={(e) => {
        e.preventDefault();
        setDropIndex(index);
      }}
      onDragLeave={() => setDropIndex((d) => (d === index ? null : d))}
      onDrop={(e) => onDrop(e, index)}
      aria-hidden
    />
  );

  return (
    <div className="fm-eb">
      <div className="fm-eb-toolbar" role="toolbar" aria-label="Email builder">
        <div className="fm-row fm-row--tight">
          <IconButton icon="undo" label="Undo (Ctrl+Z)" onClick={undo} disabled={!h.past.length} />
          <IconButton icon="redo" label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={!h.future.length} />
          <span className="fm-eb-toolbar__status" aria-live="polite">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
        <Segmented<Device>
          label="Canvas device"
          value={device}
          onChange={setDevice}
          options={[
            { id: "desktop", label: "Desktop", icon: <Icon name="monitor" size={15} /> },
            { id: "mobile", label: "Mobile", icon: <Icon name="smartphone" size={15} /> },
          ]}
        />
        <div className="fm-row fm-row--tight fm-eb-toolbar__actions">
          <Button size="sm" icon="eye" onClick={() => setPreview(true)}>Preview</Button>
          {mode === "campaign" && <Button size="sm" icon="mail" onClick={() => setTestOpen(true)}>Send test</Button>}
          <Button size="sm" icon="layout" onClick={() => setTplOpen(true)}>Save template</Button>
          {onSave && <Button size="sm" variant="primary" icon="save" loading={saving} onClick={save}>Save</Button>}
        </div>
      </div>

      <div className="fm-eb-body">
        <EmailBuilderSidebar blocks={doc.blocks} selectedId={selected} onAdd={(t) => insert(t)} onSelect={setSelected} />

        <div className="fm-eb-stage" onClick={() => setSelected(null)}>
          <div className="fm-eb-inbox" style={{ maxWidth: device === "mobile" ? 390 : doc.contentWidth }}>
            <span className="fm-eb-inbox__from">{fromName}</span>
            <span className="fm-eb-inbox__subject">{subject || "Add a subject line"}</span>
            <span className="fm-eb-inbox__preview">{previewText || "Preview text shows here in most inboxes."}</span>
          </div>
          <div
            className={cx("fm-eb-canvas", device === "mobile" && "is-mobile")}
            style={{ maxWidth: device === "mobile" ? 390 : doc.contentWidth, ["--eb-bg" as string]: doc.background }}
            onClick={(e) => e.stopPropagation()}
          >
            {doc.blocks.length === 0 && (
              <div
                className={cx("fm-eb-emptycanvas", dropIndex === 0 && "is-over")}
                onDragOver={(e) => { e.preventDefault(); setDropIndex(0); }}
                onDrop={(e) => onDrop(e, 0)}
              >
                <Icon name="layers" size={22} />
                <p>Drag a block here, or pick one from the left.</p>
              </div>
            )}
            {doc.blocks.map((b, i) => (
              <div key={b.id}>
                {dropZone(i)}
                <div
                  className={cx("fm-eb-block", b.id === selected && "is-selected")}
                  role="button"
                  tabIndex={0}
                  aria-label={`${BLOCK_LABELS[b.type]} block ${i + 1}`}
                  aria-pressed={b.id === selected}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MOVE, b.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => setSelected(b.id)}
                  onKeyDown={(e) => {
                    if ((e.target as HTMLElement).isContentEditable) return;
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(b.id); }
                    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(b.id); }
                    if (e.altKey && e.key === "ArrowUp") { e.preventDefault(); move(b.id, i - 1); }
                    if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); move(b.id, i + 2); }
                  }}
                >
                  <span className="fm-eb-block__tag">{BLOCK_LABELS[b.type]}</span>
                  <div className="fm-eb-block__tools">
                    <button type="button" aria-label="Move block up" onClick={(e) => { e.stopPropagation(); move(b.id, i - 1); }} disabled={i === 0}><Icon name="arrowUp" size={13} /></button>
                    <button type="button" aria-label="Move block down" onClick={(e) => { e.stopPropagation(); move(b.id, i + 2); }} disabled={i === doc.blocks.length - 1}><Icon name="arrowDown" size={13} /></button>
                    <button type="button" aria-label="Duplicate block" onClick={(e) => { e.stopPropagation(); duplicate(b.id); }}><Icon name="copy" size={13} /></button>
                    <button type="button" aria-label="Delete block" onClick={(e) => { e.stopPropagation(); remove(b.id); }}><Icon name="trash" size={13} /></button>
                  </div>
                  <EmailBlock block={b} editable={b.id === selected && (b.type === "text" || b.type === "heading")} onTextChange={(text) => text !== b.text && patchBlock(b.id, { text })} />
                </div>
              </div>
            ))}
            {doc.blocks.length > 0 && dropZone(doc.blocks.length)}
          </div>
        </div>

        <EmailBuilderProperties
          doc={doc}
          block={block}
          onBlock={(p) => block && patchBlock(block.id, p)}
          onStyle={(p) => block && patchStyle(block.id, p)}
          onDoc={(p) => commit((d) => ({ ...d, ...p }))}
          onDuplicate={() => block && duplicate(block.id)}
          onDelete={() => block && remove(block.id)}
          onMove={(dir) => block && move(block.id, dir < 0 ? selIndex - 1 : selIndex + 2)}
        />
      </div>

      <Modal open={preview} title="Preview" description={subject || undefined} onClose={() => setPreview(false)} size="xl"
        footer={<><Button icon="download" onClick={() => downloadText("fockis-email.html", documentToHtml(doc), "text/html")}>Download HTML</Button><Button variant="primary" onClick={() => setPreview(false)}>Close preview</Button></>}
      >
        <div className="fm-eb-preview">
          {(["desktop", "mobile"] as Device[]).map((d) => (
            <div key={d} className={cx("fm-eb-preview__frame", `is-${d}`)}>
              <p className="fm-eb-preview__label"><Icon name={d === "desktop" ? "monitor" : "smartphone"} size={14} /> {d === "desktop" ? "Desktop" : "Mobile"}</p>
              <div className="fm-eb-canvas is-static" style={{ maxWidth: d === "mobile" ? 360 : doc.contentWidth, ["--eb-bg" as string]: doc.background }}>
                {doc.blocks.map((b) => <EmailBlock key={b.id} block={b} />)}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <Modal open={testOpen} title="Send a test email" onClose={() => setTestOpen(false)} size="sm"
        footer={
          <>
            <Button onClick={() => setTestOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              icon="send"
              disabled={!validEmails.length}
              onClick={async () => {
                if (campaignId) {
                  const res = await run(() => campaignsApi.sendTest(campaignId, validEmails), `Test sent to ${validEmails.length} address${validEmails.length === 1 ? "" : "es"}.`);
                  if (res) setTestOpen(false);
                } else {
                  toast("Save the campaign first, then send a test.", "info");
                }
              }}
            >
              Send test
            </Button>
          </>
        }
      >
        <TextArea label="Send to" rows={3} value={testEmails} onChange={(e) => setTestEmails(e.target.value)} placeholder="you@fockis.com, teammate@fockis.com" hint={`${validEmails.length} valid address${validEmails.length === 1 ? "" : "es"}. Separate with commas.`} data-autofocus />
        <Notice>Test emails include a “[Test]” prefix and don't count toward reports.</Notice>
      </Modal>

      <Modal open={tplOpen} title="Save as template" onClose={() => setTplOpen(false)} size="sm"
        footer={
          <>
            <Button onClick={() => setTplOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!tplName.trim()}
              onClick={async () => {
                const t = await run(() => templatesApi.save({ name: tplName.trim(), category: tplCat, document: doc }), `Saved template “${tplName.trim()}”.`);
                if (t) setTplOpen(false);
              }}
            >
              Save template
            </Button>
          </>
        }
      >
        <TextField label="Template name" value={tplName} onChange={(e) => setTplName(e.target.value)} data-autofocus />
        <SelectField label="Category" value={tplCat} onChange={(e) => setTplCat(e.target.value as TemplateCategory)} options={Object.entries(TEMPLATE_CATEGORY_LABELS).map(([value, label]) => ({ value, label }))} />
      </Modal>
    </div>
  );
}
