import type { EmailTemplate } from "../types/mailchimp.types";
import { TEMPLATE_CATEGORY_LABELS } from "../utils/labels";
import { formatDate } from "../utils/format";
import { EmailBlock } from "./EmailBlock";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { ActionMenu, type MenuItem } from "./ui/Menu";

/** Scaled-down live render of a template's blocks. */
export function TemplateThumb({ template }: { template: EmailTemplate }) {
  return (
    <div className="fm-tplthumb" style={{ ["--accent" as string]: template.accent }} aria-hidden>
      <div className="fm-tplthumb__scale">
        <div className="fm-eb-canvas is-static" style={{ maxWidth: 600, ["--eb-bg" as string]: "#fff" }}>
          {template.document.blocks.slice(0, 6).map((b) => <EmailBlock key={b.id} block={b} />)}
        </div>
      </div>
    </div>
  );
}

export function TemplateCard({ template: t, onUse, onPreview, actions }: { template: EmailTemplate; onUse: () => void; onPreview: () => void; actions: MenuItem[] }) {
  return (
    <article className="fm-tplcard">
      <button type="button" className="fm-tplcard__thumb" onClick={onPreview} aria-label={`Preview ${t.name}`}>
        <TemplateThumb template={t} />
      </button>
      <div className="fm-tplcard__body">
        <div className="fm-tplcard__title">
          <h3>{t.name}</h3>
          <ActionMenu items={actions} label={`Actions for ${t.name}`} />
        </div>
        <p>{t.description}</p>
        <div className="fm-row fm-row--wrap">
          <Badge>{TEMPLATE_CATEGORY_LABELS[t.category]}</Badge>
          {t.fockisSpecific && <Badge tone="blue">Fockis</Badge>}
          <span className="fm-muted fm-small">Updated {formatDate(t.updatedAt)}</span>
        </div>
        <Button size="sm" variant="primary" onClick={onUse}>Use template</Button>
      </div>
    </article>
  );
}
