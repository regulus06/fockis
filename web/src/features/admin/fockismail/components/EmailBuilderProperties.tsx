import type { EmailBlock, EmailBlockStyle, EmailDocument, EmailProduct, TextAlign } from "../types/mailchimp.types";
import { BLOCK_LABELS } from "../utils/labels";
import { EMAIL_FONTS } from "../utils/emailBlocks";
import { ColorField, RangeField, SelectField, TextArea, TextField } from "./ui/Field";
import { Segmented } from "./ui/Tabs";
import { Button, IconButton } from "./ui/Button";
import { Icon } from "./ui/Icon";

interface Props {
  doc: EmailDocument;
  block: EmailBlock | null;
  onBlock: (patch: Partial<EmailBlock>) => void;
  onStyle: (patch: Partial<EmailBlockStyle>) => void;
  onDoc: (patch: Partial<EmailDocument>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}

const HAS_TEXT = new Set(["text", "heading", "button", "logo", "social", "coupon", "countdown", "footer", "image", "video"]);
const HAS_TYPE = new Set(["text", "heading", "button", "logo", "social", "coupon", "countdown", "footer", "columns", "product", "product_grid"]);
const HAS_LINK = new Set(["button", "image", "video"]);
const HAS_BUTTON = new Set(["button", "coupon", "countdown", "product", "product_grid"]);

export function EmailBuilderProperties({ doc, block, onBlock, onStyle, onDoc, onDuplicate, onDelete, onMove }: Props) {
  if (!block) {
    return (
      <aside className="fm-eb-props" aria-label="Email settings">
        <h3>Email settings</h3>
        <p className="fm-muted fm-small">Select a block on the canvas to edit it.</p>
        <ColorField label="Page background" value={doc.background} onChange={(v) => onDoc({ background: v })} />
        <RangeField label="Content width" value={doc.contentWidth} min={480} max={720} step={20} onChange={(v) => onDoc({ contentWidth: v })} />
      </aside>
    );
  }

  const s = block.style;
  const updateProduct = (i: number, patch: Partial<EmailProduct>) =>
    onBlock({ products: block.products.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });

  return (
    <aside className="fm-eb-props" aria-label={`${BLOCK_LABELS[block.type]} properties`}>
      <div className="fm-eb-props__head">
        <h3>{BLOCK_LABELS[block.type]}</h3>
        <div className="fm-row fm-row--tight">
          <IconButton icon="arrowUp" label="Move up" onClick={() => onMove(-1)} />
          <IconButton icon="arrowDown" label="Move down" onClick={() => onMove(1)} />
          <IconButton icon="copy" label="Duplicate block" onClick={onDuplicate} />
          <IconButton icon="trash" label="Delete block" onClick={onDelete} />
        </div>
      </div>

      <details open className="fm-eb-group">
        <summary>Content</summary>
        {HAS_TEXT.has(block.type) && (
          block.type === "text" || block.type === "footer" ? (
            <TextArea label="Text" rows={4} value={block.text} onChange={(e) => onBlock({ text: e.target.value })} />
          ) : (
            <TextField label={block.type === "image" || block.type === "video" ? "Alt text / caption" : "Text"} value={block.text} onChange={(e) => onBlock({ text: e.target.value })} />
          )
        )}
        {(block.type === "image" || block.type === "video") && (
          <TextField label={block.type === "video" ? "Thumbnail URL" : "Image URL"} value={block.imageUrl} placeholder="https://cdn.fockis.com/…" onChange={(e) => onBlock({ imageUrl: e.target.value })} hint="Use Content → Media library to copy an asset URL." />
        )}
        {HAS_LINK.has(block.type) && <TextField label="Link URL" type="url" value={block.url} onChange={(e) => onBlock({ url: e.target.value })} />}
        {block.type === "coupon" && <TextField label="Coupon code" value={block.code} onChange={(e) => onBlock({ code: e.target.value.toUpperCase() })} />}
        {block.type === "countdown" && <TextField label="Ends at" type="datetime-local" value={block.endsAt} onChange={(e) => onBlock({ endsAt: e.target.value })} />}
        {block.type === "spacer" && <RangeField label="Height" value={block.height} min={8} max={120} onChange={(v) => onBlock({ height: v })} />}
        {block.type === "columns" && (
          <>
            <TextArea label="Left column" rows={3} value={block.columns[0]} onChange={(e) => onBlock({ columns: [e.target.value, block.columns[1]] })} />
            <TextArea label="Right column" rows={3} value={block.columns[1]} onChange={(e) => onBlock({ columns: [block.columns[0], e.target.value] })} />
          </>
        )}
        {(block.type === "product" || block.type === "product_grid") && (
          <div className="fm-eb-products-edit">
            {block.products.map((p, i) => (
              <fieldset key={i}>
                <legend>Product {i + 1}</legend>
                <TextField label="Name" value={p.name} onChange={(e) => updateProduct(i, { name: e.target.value })} />
                <div className="fm-row">
                  <TextField label="Price" value={p.price} onChange={(e) => updateProduct(i, { price: e.target.value })} />
                  <TextField label="Link" value={p.url} onChange={(e) => updateProduct(i, { url: e.target.value })} />
                </div>
                <TextField label="Image URL" value={p.imageUrl} onChange={(e) => updateProduct(i, { imageUrl: e.target.value })} />
                {block.products.length > 1 && (
                  <Button size="sm" variant="ghost" icon="trash" onClick={() => onBlock({ products: block.products.filter((_, idx) => idx !== i) })}>Remove product</Button>
                )}
              </fieldset>
            ))}
            {block.type === "product_grid" && block.products.length < 6 && (
              <Button size="sm" icon="plus" onClick={() => onBlock({ products: [...block.products, { name: "New product", price: "$0.00", imageUrl: "", url: "https://fockis.com/shop" }] })}>
                Add product
              </Button>
            )}
            <p className="fm-field__hint"><Icon name="bag" size={13} /> Products will sync from Fockis Marketplace once the backend is connected.</p>
          </div>
        )}
      </details>

      {HAS_TYPE.has(block.type) && (
        <details open className="fm-eb-group">
          <summary>Typography</summary>
          <SelectField label="Font" value={s.fontFamily} onChange={(e) => onStyle({ fontFamily: e.target.value })} options={EMAIL_FONTS.map((f) => ({ value: f, label: f.split(",")[0].replace(/'/g, "") }))} />
          <RangeField label="Font size" value={s.fontSize} min={10} max={48} onChange={(v) => onStyle({ fontSize: v })} />
          <ColorField label="Text color" value={s.color} onChange={(v) => onStyle({ color: v })} />
          <div className="fm-field">
            <span className="fm-field__label">Alignment</span>
            <Segmented<TextAlign>
              label="Alignment"
              value={s.align}
              onChange={(v) => onStyle({ align: v })}
              options={[{ id: "left", label: "Left" }, { id: "center", label: "Center" }, { id: "right", label: "Right" }]}
            />
          </div>
        </details>
      )}

      {HAS_BUTTON.has(block.type) && (
        <details open className="fm-eb-group">
          <summary>Button style</summary>
          <ColorField label="Button color" value={s.buttonColor} onChange={(v) => onStyle({ buttonColor: v })} />
          <ColorField label="Button text" value={s.buttonTextColor} onChange={(v) => onStyle({ buttonTextColor: v })} />
          <RangeField label="Corner radius" value={s.borderRadius} min={0} max={28} onChange={(v) => onStyle({ borderRadius: v })} />
        </details>
      )}

      <details className="fm-eb-group" open={block.type === "divider" || block.type === "spacer"}>
        <summary>Spacing & background</summary>
        <RangeField label="Vertical padding" value={s.paddingY} min={0} max={64} onChange={(v) => onStyle({ paddingY: v })} />
        <RangeField label="Horizontal padding" value={s.paddingX} min={0} max={64} onChange={(v) => onStyle({ paddingX: v })} />
        <ColorField label="Background" value={s.background} onChange={(v) => onStyle({ background: v })} />
        <RangeField label="Border width" value={s.borderWidth} min={0} max={6} onChange={(v) => onStyle({ borderWidth: v })} />
        <ColorField label="Border color" value={s.borderColor} onChange={(v) => onStyle({ borderColor: v })} />
      </details>
    </aside>
  );
}
