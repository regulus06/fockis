import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Automation } from "../types/mailchimp.types";
import { useAsync } from "../hooks/useAsync";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { automationApi } from "../services/automationApi";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { PageHeader, Panel, Stat, StatStrip } from "../components/ui/Layout";
import { EmptyState, ErrorState, SkeletonCards } from "../components/ui/Feedback";
import { ActionMenu } from "../components/ui/Menu";
import { Modal } from "../components/ui/Overlay";
import { Tabs } from "../components/ui/Tabs";
import { TextField } from "../components/ui/Field";
import { Icon } from "../components/ui/Icon";
import { automationTemplates, type AutomationTemplate } from "../data/templateMockData";
import { NODE_ICONS } from "../components/JourneyNode";
import { AUTOMATION_STATUS_TONES } from "../utils/labels";
import { cx, formatCurrency, formatNumber, formatPercent } from "../utils/format";

type Filter = "all" | Automation["status"];

export default function AutomationsPage() {
  const list = useAsync(() => automationApi.list(), []);
  const run = useAction();
  const to = useMarketingPath();
  const navigate = useNavigate();
  const { confirm, toast } = useMailchimp();
  const [filter, setFilter] = useState<Filter>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [recipe, setRecipe] = useState<AutomationTemplate>(automationTemplates[0]);
  const [name, setName] = useState(automationTemplates[0].name);

  const data = list.data ?? [];
  const visible = data.filter((a) => filter === "all" || a.status === filter);
  const active = data.filter((a) => a.status === "active");

  const setStatus = async (a: Automation, status: Automation["status"]) => {
    if (await run(() => automationApi.setStatus(a.id, status), status === "active" ? `“${a.name}” is on.` : `Paused “${a.name}”.`)) list.reload();
  };

  return (
    <div className="fm-page">
      <PageHeader
        title="Automations"
        description="Emails that send themselves when someone does something on Fockis."
        actions={<Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Create automation</Button>}
      />

      <StatStrip>
        <Stat label="Active automations" value={list.data ? active.length : "—"} sub={`${data.length} total`} />
        <Stat label="Contacts in automations" value={list.data ? formatNumber(active.reduce((s, a) => s + a.contacts, 0)) : "—"} />
        <Stat label="Automation revenue" value={list.data ? formatCurrency(data.reduce((s, a) => s + a.revenue, 0)) : "—"} sub="Last 30 days" />
      </StatStrip>

      <Tabs<Filter>
        label="Automation status"
        value={filter}
        onChange={setFilter}
        items={[
          { id: "all", label: "All", count: data.length },
          { id: "active", label: "Active", count: active.length },
          { id: "paused", label: "Paused", count: data.filter((a) => a.status === "paused").length },
          { id: "draft", label: "Drafts", count: data.filter((a) => a.status === "draft").length },
        ]}
      />

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <SkeletonCards count={6} height={180} />
      ) : visible.length === 0 ? (
        <Panel><EmptyState icon="zap" title="No automations here" body="Start from a recipe like Welcome series or Abandoned cart." action={<Button variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Create automation</Button>} /></Panel>
      ) : (
        <div className="fm-grid fm-grid--cards">
          {visible.map((a) => (
            <article key={a.id} className="fm-autocard">
              <header>
                <Badge tone={AUTOMATION_STATUS_TONES[a.status]} dot>{a.status === "active" ? "Active" : a.status === "paused" ? "Paused" : "Draft"}</Badge>
                <ActionMenu
                  label={`Actions for ${a.name}`}
                  items={[
                    { label: "Edit", icon: "edit", onSelect: () => (a.journeyId ? navigate(`${to("journeys")}?id=${a.journeyId}`) : toast("Open Journeys to build this automation's steps.", "info")) },
                    { label: "Duplicate", icon: "copy", onSelect: async () => { if (await run(() => automationApi.duplicate(a.id), `Duplicated “${a.name}”.`)) list.reload(); } },
                    a.status === "active"
                      ? { label: "Pause", icon: "pause", onSelect: () => setStatus(a, "paused") }
                      : { label: "Turn on", icon: "play", onSelect: () => setStatus(a, "active") },
                    { label: "Delete", icon: "trash", danger: true, separated: true, onSelect: async () => {
                      if (!(await confirm({ title: `Delete “${a.name}”?`, body: `${formatNumber(a.contacts)} contacts will stop receiving its emails.`, confirmLabel: "Delete automation", danger: true }))) return;
                      if ((await run(() => automationApi.remove(a.id), "Automation deleted.")) !== undefined) list.reload();
                    } },
                  ]}
                />
              </header>
              <h3>{a.name}</h3>
              <p className="fm-autocard__trigger"><Icon name="zap" size={14} /> {a.trigger}</p>
              <dl className="fm-autocard__stats">
                <div><dt>Contacts</dt><dd>{formatNumber(a.contacts)}</dd></div>
                <div><dt>Emails</dt><dd>{a.emails}</dd></div>
                <div><dt>Conversion</dt><dd>{formatPercent(a.conversionRate)}</dd></div>
                <div><dt>Revenue</dt><dd>{formatCurrency(a.revenue)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={createOpen}
        title="Create automation"
        description="Pick a template. It opens in the journey builder so you can adjust every step."
        onClose={() => setCreateOpen(false)}
        size="lg"
        footer={
          <>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              disabled={!name.trim()}
              onClick={async () => {
                const res = await run(() => automationApi.createFromTemplate(recipe, name.trim()), `Created “${name.trim()}” as a draft. Edit its steps below.`);
                if (res) {
                  setCreateOpen(false);
                  navigate(`${to("journeys")}?id=${res.journey.id}`);
                }
              }}
            >
              Create draft
            </Button>
          </>
        }
      >
        <div className="fm-recipes" role="radiogroup" aria-label="Automation recipe">
          {automationTemplates.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={recipe.id === r.id} className={cx("fm-recipe", recipe.id === r.id && "is-active")} onClick={() => { setRecipe(r); setName(r.name); }}>
              <Icon name={r.icon} />
              <strong>{r.name}</strong>
              <span>{r.description}</span>
              <small>Trigger: {r.trigger}</small>
            </button>
          ))}
        </div>
        <div className="fm-flowpreview" aria-label={`${recipe.name} steps`}>
          {recipe.steps.map((n, i) => (
            <div key={n.id} className="fm-flowpreview__step">
              {i > 0 && <Icon name="arrowDown" size={14} />}
              <span className={`fm-flowpreview__node is-${n.kind}`}><Icon name={NODE_ICONS[n.kind]} size={14} /> {n.title}</span>
              {n.yes && n.no && (
                <div className="fm-flowpreview__branches">
                  <span><b>Yes</b> {n.yes[0]?.title}</span>
                  <span><b>No</b> {n.no[0]?.title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <TextField label="Automation name" value={name} onChange={(e) => setName(e.target.value)} />
      </Modal>
    </div>
  );
}
