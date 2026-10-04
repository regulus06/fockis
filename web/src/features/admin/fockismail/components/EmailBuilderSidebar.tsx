import type { EmailBlock, EmailBlockType } from "../types/mailchimp.types";
import { BLOCK_LABELS } from "../utils/labels";
import { Icon, type IconName } from "./ui/Icon";
import { cx } from "../utils/format";

export const BLOCK_ICONS: Record<EmailBlockType, IconName> = {
  text: "text", heading: "heading", image: "image", button: "button", divider: "divider",
  spacer: "spacer", video: "video", social: "share", logo: "star", product: "bag",
  product_grid: "grid", coupon: "ticket", countdown: "clock", columns: "columns", footer: "footer",
};

const GROUPS: Array<{ title: string; types: EmailBlockType[] }> = [
  { title: "Basics", types: ["heading", "text", "image", "button", "divider", "spacer"] },
  { title: "Media & brand", types: ["logo", "video", "social", "columns"] },
  { title: "Commerce", types: ["product", "product_grid", "coupon", "countdown"] },
  { title: "Layout", types: ["footer"] },
];

export const DRAG_NEW = "application/x-fockis-block-new";
export const DRAG_MOVE = "application/x-fockis-block-move";

interface Props {
  blocks: EmailBlock[];
  selectedId: string | null;
  onAdd: (type: EmailBlockType) => void;
  onSelect: (id: string) => void;
}

export function EmailBuilderSidebar({ blocks, selectedId, onAdd, onSelect }: Props) {
  return (
    <aside className="fm-eb-side" aria-label="Content blocks">
      <div className="fm-eb-side__section">
        <h3>Add content</h3>
        <p className="fm-muted fm-small">Drag a block onto the email, or click to add it below the selection.</p>
        {GROUPS.map((g) => (
          <div key={g.title} className="fm-eb-palette">
            <h4>{g.title}</h4>
            <div className="fm-eb-palette__grid">
              {g.types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="fm-eb-tile"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_NEW, t);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={() => onAdd(t)}
                  aria-label={`Add ${BLOCK_LABELS[t]} block`}
                >
                  <Icon name={BLOCK_ICONS[t]} />
                  <span>{BLOCK_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="fm-eb-side__section">
        <h3>Layers</h3>
        <ol className="fm-eb-layers">
          {blocks.map((b, i) => (
            <li key={b.id}>
              <button type="button" className={cx(b.id === selectedId && "is-active")} onClick={() => onSelect(b.id)}>
                <span className="fm-eb-layers__n">{i + 1}</span>
                <Icon name={BLOCK_ICONS[b.type]} size={14} />
                <span className="fm-eb-layers__label">{BLOCK_LABELS[b.type]}{b.text ? `: ${b.text.slice(0, 22)}` : ""}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </aside>
  );
}
