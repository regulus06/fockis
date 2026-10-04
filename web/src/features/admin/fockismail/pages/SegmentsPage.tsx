import { useEffect, useState } from "react";
import type { Segment, SegmentCondition, SegmentField, SegmentOperator } from "../types/mailchimp.types";
import { useSegments, useTags } from "../hooks/useAudience";
import { useAction, useMailchimp, useMarketingPath } from "../hooks/useMailchimp";
import { audienceApi } from "../services/audienceApi";
import { Button, IconButton, LinkButton } from "../components/ui/Button";
import { PageHeader, Panel } from "../components/ui/Layout";
import { FilterSelect, TextField } from "../components/ui/Field";
import { EmptyState, ErrorState, Notice, SkeletonRows } from "../components/ui/Feedback";
import { ActionMenu } from "../components/ui/Menu";
import { Segmented } from "../components/ui/Tabs";
import { DemoBadge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import {
  FOCKIS_AUDIENCE_LABELS,
  FOCKIS_BEHAVIOR_LABELS,
  OPERATOR_LABELS,
  SEGMENT_FIELD_LABELS,
  SEGMENT_OPERATORS,
} from "../utils/labels";
import { formatDate, formatNumber, uid } from "../utils/format";

const DATE_FIELDS: SegmentField[] = ["signup_date", "last_activity"];
const NUMBER_FIELDS: SegmentField[] = ["purchase_amount", "order_count"];

function newCondition(field: SegmentField = "email"): SegmentCondition {
  return { id: uid("cond"), field, operator: SEGMENT_OPERATORS[field][0], value: "" };
}

interface Draft {
  id?: string;
  name: string;
  match: "all" | "any";
  conditions: SegmentCondition[];
}

export default function SegmentsPage() {
  const segments = useSegments();
  const tags = useTags();
  const run = useAction();
  const to = useMarketingPath();
  const { confirm, isMock } = useMailchimp();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimating, setEstimating] = useState(false);

  const valueOptions = (field: SegmentField): Array<{ value: string; label: string }> | null => {
    switch (field) {
      case "fockis_audience": return Object.entries(FOCKIS_AUDIENCE_LABELS).map(([value, label]) => ({ value, label }));
      case "fockis_behavior": return Object.entries(FOCKIS_BEHAVIOR_LABELS).map(([value, label]) => ({ value, label }));
      case "vip_status": return [{ value: "vip", label: "VIP" }];
      case "tags": return (tags.data ?? []).map((t) => ({ value: t.id, label: t.name }));
      case "campaign_opened":
      case "campaign_clicked":
        return [{ value: "any_campaign", label: "Any campaign" }, { value: "last_campaign", label: "The last campaign" }, { value: "last_30_days", label: "Any campaign in the last 30 days" }];
      default: return null;
    }
  };

  const complete = draft?.conditions.every((c) => c.value.trim().length > 0) ?? false;

  useEffect(() => {
    if (!draft || !complete) {
      setEstimate(null);
      return;
    }
    let live = true;
    setEstimating(true);
    const t = window.setTimeout(() => {
      audienceApi.previewSegment(draft.conditions, draft.match)
        .then((r) => live && setEstimate(r.estimate))
        .catch(() => live && setEstimate(null))
        .finally(() => live && setEstimating(false));
    }, 300);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [draft, complete]);

  const updateCond = (id: string, patch: Partial<SegmentCondition>) =>
    setDraft((d) => d && { ...d, conditions: d.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)) });

  const describe = (s: Segment) =>
    s.conditions.map((c) => {
      const opts = valueOptions(c.field);
      const v = opts?.find((o) => o.value === c.value)?.label ?? c.value;
      return `${SEGMENT_FIELD_LABELS[c.field]} ${OPERATOR_LABELS[c.operator]} ${v}`;
    }).join(s.match === "all" ? " and " : " or ");

  return (
    <div className="fm-page">
      <PageHeader
        title="Segments"
        description="Group contacts by who they are and what they do on Fockis."
        actions={<Button variant="primary" icon="plus" onClick={() => setDraft({ name: "", match: "all", conditions: [newCondition()] })}>Create segment</Button>}
      />

      {draft && (
        <Panel
          title={draft.id ? "Edit segment" : "New segment"}
          actions={<Button variant="ghost" size="sm" onClick={() => setDraft(null)}>Cancel</Button>}
          className="fm-segbuilder"
        >
          <TextField label="Segment name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Engaged marketplace buyers" data-autofocus />
          <div className="fm-segbuilder__match">
            <span>Contacts match</span>
            <Segmented<"all" | "any"> label="Match type" value={draft.match} onChange={(m) => setDraft({ ...draft, match: m })} options={[{ id: "all", label: "All conditions (AND)" }, { id: "any", label: "Any condition (OR)" }]} />
          </div>
          <ol className="fm-conditions">
            {draft.conditions.map((c, i) => {
              const opts = valueOptions(c.field);
              return (
                <li key={c.id}>
                  <span className="fm-conditions__join">{i === 0 ? "Where" : draft.match === "all" ? "And" : "Or"}</span>
                  <FilterSelect label="Field" value={c.field} onChange={(v) => { const f = v as SegmentField; updateCond(c.id, { field: f, operator: SEGMENT_OPERATORS[f][0], value: "" }); }} options={(Object.keys(SEGMENT_FIELD_LABELS) as SegmentField[]).map((f) => ({ value: f, label: SEGMENT_FIELD_LABELS[f] }))} />
                  <FilterSelect label="Operator" value={c.operator} onChange={(v) => updateCond(c.id, { operator: v as SegmentOperator })} options={SEGMENT_OPERATORS[c.field].map((o) => ({ value: o, label: OPERATOR_LABELS[o] }))} />
                  {opts ? (
                    <FilterSelect label="Value" value={c.value} onChange={(v) => updateCond(c.id, { value: v })} options={[{ value: "", label: "Choose…" }, ...opts]} />
                  ) : (
                    <input
                      className="fm-input fm-conditions__value"
                      aria-label="Value"
                      type={DATE_FIELDS.includes(c.field) ? "date" : NUMBER_FIELDS.includes(c.field) ? "number" : "text"}
                      value={c.value}
                      placeholder={NUMBER_FIELDS.includes(c.field) ? "0" : "Value"}
                      onChange={(e) => updateCond(c.id, { value: e.target.value })}
                    />
                  )}
                  <IconButton icon="trash" label="Remove condition" disabled={draft.conditions.length === 1} onClick={() => setDraft({ ...draft, conditions: draft.conditions.filter((x) => x.id !== c.id) })} />
                </li>
              );
            })}
          </ol>
          <div className="fm-row fm-row--wrap">
            <Button size="sm" icon="plus" disabled={draft.conditions.length >= 8} onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, newCondition()] })}>Add condition</Button>
            <Button size="sm" icon="sparkle" onClick={() => setDraft({ ...draft, conditions: [...draft.conditions, newCondition("fockis_behavior")] })}>Add Fockis activity</Button>
          </div>
          <div className="fm-segbuilder__foot">
            <div className="fm-estimate" aria-live="polite">
              <Icon name="users" />
              {!complete ? <span>Fill in every condition to see an estimate.</span> : estimating ? <span>Estimating…</span> : estimate !== null ? <span>About <strong>{formatNumber(estimate)}</strong> contacts match {isMock && <DemoBadge label="Estimate" />}</span> : <span>Couldn't estimate this segment.</span>}
            </div>
            <Button
              variant="primary"
              disabled={!draft.name.trim() || !complete}
              onClick={async () => {
                const saved = await run(() => audienceApi.saveSegment({ id: draft.id, name: draft.name.trim(), match: draft.match, conditions: draft.conditions }), `Saved segment “${draft.name.trim()}”.`);
                if (saved) {
                  setDraft(null);
                  segments.reload();
                }
              }}
            >
              Save segment
            </Button>
          </div>
          {isMock && <Notice>In demo mode, estimates are approximate. The backend evaluates segments against real contact data.</Notice>}
        </Panel>
      )}

      <Panel flush title="Saved segments">
        {segments.error ? (
          <ErrorState message={segments.error} onRetry={segments.reload} />
        ) : segments.loading || !segments.data ? (
          <SkeletonRows rows={4} cols={4} />
        ) : segments.data.length === 0 ? (
          <EmptyState icon="filter" title="No segments yet" body="Segments let you send to exactly the right people, like buyers who watched a Wave this week." />
        ) : (
          <div className="fm-tablewrap">
            <table className="fm-table">
              <thead><tr><th scope="col">Segment</th><th scope="col" className="is-num">Contacts</th><th scope="col">Updated</th><th scope="col"><span className="fm-sr">Actions</span></th></tr></thead>
              <tbody>
                {segments.data.map((s) => (
                  <tr key={s.id}>
                    <td className="fm-table__primary"><strong>{s.name}</strong><span className="fm-table__sub">{describe(s)}</span></td>
                    <td className="is-num">{formatNumber(s.contactCount)}</td>
                    <td>{formatDate(s.updatedAt)}</td>
                    <td className="is-actions">
                      <ActionMenu
                        label={`Actions for ${s.name}`}
                        items={[
                          { label: "Edit", icon: "edit", onSelect: () => setDraft({ id: s.id, name: s.name, match: s.match, conditions: structuredClone(s.conditions) }) },
                          { label: "Delete", icon: "trash", danger: true, separated: true, onSelect: async () => {
                            if (!(await confirm({ title: `Delete “${s.name}”?`, body: "Campaigns already sent to it are unaffected.", confirmLabel: "Delete segment", danger: true }))) return;
                            if ((await run(() => audienceApi.deleteSegment(s.id), "Segment deleted.")) !== undefined) segments.reload();
                          } },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="fm-muted fm-small">Ready to send? <LinkButton to={to("compose")} size="sm" variant="ghost">Create a campaign</LinkButton> and pick a segment in Setup.</p>
    </div>
  );
}
