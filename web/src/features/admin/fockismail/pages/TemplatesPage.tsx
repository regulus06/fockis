import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { EmailTemplate, TemplateCategory } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { templatesApi } from "../services/templatesApi";
import { TemplateCard } from "../components/TemplateCard";
import { EmailBuilder } from "../components/EmailBuilder";
import { EmailBlock } from "../components/EmailBlock";
import { Button } from "../components/ui/Button";
import { PageHeader, Toolbar } from "../components/ui/Layout";
import { SearchInput } from "../components/ui/Field";
import { EmptyState, ErrorState, SkeletonCards } from "../components/ui/Feedback";
import { Modal } from "../components/ui/Overlay";
import { TEMPLATE_CATEGORY_LABELS } from "../utils/labels";
import { createDocument } from "../utils/emailBlocks";
import { cx } from "../utils/format";
import { useMarketingWorkspace } from "../hooks/useMarketingWorkspace";
import { BUSINESS_TYPE_LABELS } from "../utils/platformLabels";

type Cat = "all" | "fockis" | "recommended" | TemplateCategory;

export default function TemplatesPage() {
  const templates = useAsync(() => templatesApi.list(), []);
  const { currentBusiness } = useMarketingWorkspace();
  const run = useAction();
  const to = useMarketingPath();
  const navigate = useNavigate();
  const { confirm } = useMailchimp();
  const [params, setParams] = useSearchParams();
  const [cat, setCat] = useState<Cat>("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const previewId = params.get("preview");
  const preview = templates.data?.find((t) => t.id === previewId) ?? null;

  const list = useMemo(
    () =>
      (templates.data ?? []).filter((t) => {
        if (cat === "fockis" && !t.fockisSpecific) return false;
        if (cat === "recommended" && !(currentBusiness && t.businessTypes?.includes(currentBusiness.type))) return false;
        if (cat !== "all" && cat !== "fockis" && cat !== "recommended" && t.category !== cat) return false;
        return `${t.name} ${t.description}`.toLowerCase().includes(search.toLowerCase());
      }),
    [templates.data, cat, search, currentBusiness],
  );

  const use = (t: EmailTemplate) => navigate(`${to("compose")}?template=${t.id}&step=type`);

  const cats: Array<{ id: Cat; label: string }> = [
    { id: "all", label: "All" },
    ...(currentBusiness && !currentBusiness.isAgencyOwner ? [{ id: "recommended" as Cat, label: `For ${BUSINESS_TYPE_LABELS[currentBusiness.type].toLowerCase()}` }] : []),
    { id: "small_business", label: "Small business" },
    ...(currentBusiness?.isAgencyOwner ? [{ id: "fockis" as Cat, label: "Made for Fockis" }] : []),
    ...(Object.keys(TEMPLATE_CATEGORY_LABELS) as TemplateCategory[]).filter((c) => c !== "small_business").map((c) => ({ id: c as Cat, label: TEMPLATE_CATEGORY_LABELS[c] })),
  ];

  return (
    <div className="fm-page">
      <PageHeader
        title="Templates"
        description="Start from a proven layout: small-business promotions, newsletters, reminders, and templates built for Fockis."
        actions={
          <Button
            variant="primary"
            icon="plus"
            onClick={async () => {
              const t = await run(() => templatesApi.save({ name: "Untitled template", category: "minimal", document: createDocument(["logo", "heading", "text", "button", "footer"]) }), "Template created.");
              if (t) {
                templates.reload();
                setEditing(t);
              }
            }}
          >
            New template
          </Button>
        }
      />

      <div className="fm-chipfilter" role="group" aria-label="Template category">
        {cats.map((c) => (
          <button key={c.id} type="button" className={cx(cat === c.id && "is-active")} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <Toolbar><SearchInput value={search} onChange={setSearch} placeholder="Search templates" /></Toolbar>

      {templates.error ? (
        <ErrorState message={templates.error} onRetry={templates.reload} />
      ) : templates.loading ? (
        <SkeletonCards count={6} height={300} />
      ) : list.length === 0 ? (
        <EmptyState icon="layout" title="No templates here" body="Try another category, or save any email design as a template from the builder." />
      ) : (
        <div className="fm-grid fm-grid--templates">
          {list.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onUse={() => use(t)}
              onPreview={() => setParams({ preview: t.id })}
              actions={[
                { label: "Use template", icon: "send", onSelect: () => use(t) },
                { label: "Preview", icon: "eye", onSelect: () => setParams({ preview: t.id }) },
                { label: "Edit", icon: "edit", onSelect: () => setEditing(t) },
                { label: "Duplicate", icon: "copy", onSelect: async () => { if (await run(() => templatesApi.duplicate(t.id), `Duplicated “${t.name}”.`)) templates.reload(); } },
                { label: "Delete", icon: "trash", danger: true, separated: true, onSelect: async () => {
                  if (!(await confirm({ title: `Delete “${t.name}”?`, body: "Campaigns made from it keep their design.", confirmLabel: "Delete template", danger: true }))) return;
                  if ((await run(() => templatesApi.remove(t.id), "Template deleted.")) !== undefined) templates.reload();
                } },
              ]}
            />
          ))}
        </div>
      )}

      <Modal open={Boolean(preview)} title={preview?.name ?? ""} description={preview?.description} onClose={() => setParams({})} size="lg"
        footer={preview && <><Button onClick={() => { setEditing(preview); setParams({}); }}>Edit</Button><Button variant="primary" onClick={() => use(preview)}>Use template</Button></>}
      >
        {preview && (
          <div className="fm-eb-canvas is-static" style={{ maxWidth: 600, ["--eb-bg" as string]: preview.document.background }}>
            {preview.document.blocks.map((b) => <EmailBlock key={b.id} block={b} />)}
          </div>
        )}
      </Modal>

      <Modal open={Boolean(editing)} title={`Edit “${editing?.name ?? ""}”`} onClose={() => setEditing(null)} size="xl">
        {editing && (
          <EmailBuilder
            mode="template"
            templateName={editing.name}
            initial={editing.document}
            onSave={async (document) => {
              const saved = await run(() => templatesApi.save({ id: editing.id, name: editing.name, category: editing.category, document }), "Template saved.");
              if (saved) templates.reload();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
