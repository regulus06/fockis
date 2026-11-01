import { useEffect, useState } from "react";
import { CircleCheck, Plus, Rocket, Save, Send, SlidersHorizontal, Undo2, X } from "lucide-react";

import { adminError } from "../../support/supportAdminApi";
import { SmEmpty, SmError, SmLoading, useAdminQuery, useConfirm } from "../../support/components/SmParts";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { CategoryPill, DiffView, StatusPill } from "../components/PolicyParts";
import { CATEGORIES, ENFORCEMENT, RULE_MODULES, policyAdminApi, type OperationalRule } from "../policyAdminApi";

const P = PERMISSIONS;
const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—");
const moduleLabel = (v: string) => RULE_MODULES.find((m) => m.value === v)?.label ?? v;
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

type Draft = Pick<OperationalRule, "title" | "slug" | "description" | "category" | "module" | "content" | "changeSummary" | "enforcement" | "enforcementNotes"> & { effectiveDate: string };
const BLANK: Draft = { title: "", slug: "", description: "", category: "community", module: "community", content: "", changeSummary: "", enforcement: "informational", enforcementNotes: "", effectiveDate: "" };

function RuleEditor({ rule, onSaved, onClose }: { rule: OperationalRule | null; onSaved: (r: OperationalRule) => void; onClose: () => void }) {
  const { can } = useAdminAccess();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();
  const [d, setD] = useState<Draft>(BLANK);
  const [busy, setBusy] = useState("");
  const editable = can([P.POLICY_RULES_MANAGE]) && (!rule || ["draft", "rejected", "published", "archived"].includes(rule.status));

  useEffect(() => {
    setD(rule ? { title: rule.title, slug: rule.slug, description: rule.description, category: rule.category, module: rule.module, content: rule.content, changeSummary: rule.status === "published" ? "" : rule.changeSummary, enforcement: rule.enforcement, enforcementNotes: rule.enforcementNotes, effectiveDate: rule.effectiveDate ? rule.effectiveDate.slice(0, 10) : "" } : BLANK);
  }, [rule]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v, ...(k === "title" && !rule ? { slug: slugify(String(v)) } : {}) }));

  async function save() {
    setBusy("save");
    try {
      const body: Record<string, unknown> = { ...d, effectiveDate: d.effectiveDate ? new Date(`${d.effectiveDate}T00:00:00Z`).toISOString() : undefined };
      if (!d.effectiveDate) delete body.effectiveDate;
      const saved = rule ? await policyAdminApi.updateRule(rule.id, body) : await policyAdminApi.createRule(body);
      toast("success", rule?.status === "published" ? "Saved as a new draft. The published rule stays in effect until this is approved and published." : "Rule saved.");
      onSaved(saved);
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy("");
    }
  }

  async function step(action: string, note = "") {
    if (!rule) return;
    setBusy(action);
    try {
      onSaved(await policyAdminApi.transitionRule(rule.id, action, note));
      toast("success", { submit: "Sent for approval.", approve: "Rule approved.", reject: "Rule rejected.", publish: "Rule published.", archive: "Rule archived.", withdraw: "Withdrawn to draft." }[action] ?? "Done.");
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy("");
    }
  }

  const status = rule?.status;
  return (
    <section className="fksm-card fkpc-rule-editor">
      <div className="fksm-card__head">
        <h2>{rule ? rule.title : "New operational rule"}</h2>
        <span className="fkpc-row-actions">
          {rule && <StatusPill status={rule.status} />}
          <button type="button" className="fksm-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </span>
      </div>
      <p className="fksm-muted fkpc-intro">Operational rules document how Fockis runs. They don't change permissions or existing business logic on their own — enforcement shows how each rule is applied.</p>
      <div className="fksm-form-grid fkpc-form fkpc-form--two">
        <label className="fksm-field">
          <span>Title *</span>
          <input className="fksm-input" value={d.title} onChange={(e) => set("title", e.target.value)} disabled={!editable} maxLength={150} />
        </label>
        <label className="fksm-field">
          <span>Slug *</span>
          <input className="fksm-input" value={d.slug} onChange={(e) => set("slug", e.target.value.toLowerCase())} disabled={!editable} maxLength={80} />
        </label>
        <label className="fksm-field">
          <span>Category</span>
          <select className="fksm-select" value={d.category} onChange={(e) => set("category", e.target.value)} disabled={!editable}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="fksm-field">
          <span>Applies to module</span>
          <select className="fksm-select" value={d.module} onChange={(e) => set("module", e.target.value)} disabled={!editable}>
            {RULE_MODULES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="fksm-field fkpc-span2">
          <span>Description</span>
          <input className="fksm-input" value={d.description} onChange={(e) => set("description", e.target.value)} disabled={!editable} maxLength={400} />
        </label>
        <label className="fksm-field fkpc-span2">
          <span>Rule content *</span>
          <textarea className="fksm-input fkpc-section__body" rows={8} value={d.content} onChange={(e) => set("content", e.target.value)} disabled={!editable} maxLength={20000} />
        </label>
        <label className="fksm-field">
          <span>Enforcement</span>
          <select className="fksm-select" value={d.enforcement} onChange={(e) => set("enforcement", e.target.value)} disabled={!editable}>
            {ENFORCEMENT.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="fksm-field">
          <span>Effective date</span>
          <input type="date" className="fksm-input" value={d.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} disabled={!editable} />
        </label>
        <label className="fksm-field fkpc-span2">
          <span>Enforcement notes</span>
          <input className="fksm-input" value={d.enforcementNotes} onChange={(e) => set("enforcementNotes", e.target.value)} disabled={!editable} maxLength={1000} placeholder="e.g. Applied by moderators using the Content Reports queue" />
        </label>
        <label className="fksm-field fkpc-span2">
          <span>Change summary {rule ? "*" : ""}</span>
          <input className="fksm-input" value={d.changeSummary} onChange={(e) => set("changeSummary", e.target.value)} disabled={!editable} maxLength={1000} />
        </label>
      </div>

      {rule?.publishedContent && rule.status !== "published" && rule.content !== rule.publishedContent && (
        <DiffView before={rule.publishedContent} after={d.content} beforeLabel={`Published v${rule.version}`} afterLabel="Draft" />
      )}

      <div className="fkpc-actionbar">
        {editable && (
          <button type="button" className="fksm-btn fksm-btn--secondary" disabled={Boolean(busy) || d.title.trim().length < 3 || !d.slug || !d.content.trim()} onClick={() => void save()}>
            <Save size={16} aria-hidden /> {busy === "save" ? "Saving…" : "Save draft"}
          </button>
        )}
        {rule && ["draft", "rejected"].includes(status!) && can([P.POLICY_RULES_MANAGE]) && (
          <button type="button" className="fksm-btn fksm-btn--primary" disabled={Boolean(busy)} onClick={() => void step("submit")}>
            <Send size={16} aria-hidden /> Submit for approval
          </button>
        )}
        {rule && ["pending_review", "approved"].includes(status!) && can([P.POLICY_RULES_MANAGE]) && (
          <button type="button" className="fksm-btn fksm-btn--secondary" disabled={Boolean(busy)} onClick={() => void step("withdraw")}>
            <Undo2 size={16} aria-hidden /> Withdraw
          </button>
        )}
        {status === "pending_review" && can([P.POLICY_REVIEW]) && (
          <>
            <button
              type="button"
              className="fksm-btn fksm-btn--danger"
              disabled={Boolean(busy)}
              onClick={() => confirm.ask({ title: "Reject this rule?", description: "The author sees your reason.", confirmLabel: "Reject", tone: "danger", reasonLabel: "Reason" }, async (reason) => step("reject", reason))}
            >
              <X size={16} aria-hidden /> Reject
            </button>
            <button type="button" className="fksm-btn fksm-btn--primary" disabled={Boolean(busy)} onClick={() => void step("approve")}>
              <CircleCheck size={16} aria-hidden /> Approve
            </button>
          </>
        )}
        {status === "approved" && can([P.POLICY_PUBLISH]) && (
          <button type="button" className="fksm-btn fksm-btn--primary" disabled={Boolean(busy)} onClick={() => void step("publish")}>
            <Rocket size={16} aria-hidden /> Publish
          </button>
        )}
        {rule && ["draft", "published", "rejected", "approved"].includes(status!) && can([P.POLICY_PUBLISH]) && (
          <button type="button" className="fksm-btn fksm-btn--danger-ghost" disabled={Boolean(busy)} onClick={() => confirm.ask({ title: "Archive this rule?", description: "It stops being listed as in effect. History is kept.", confirmLabel: "Archive", tone: "danger" }, async () => step("archive"))}>
            Archive
          </button>
        )}
      </div>

      {rule && (rule.revisions.length > 0 || rule.review.length > 0) && (
        <div className="fkpc-two-col">
          <div>
            <h3 className="fkpc-h3">Published versions</h3>
            {!rule.revisions.length ? (
              <p className="fksm-muted">Not published yet.</p>
            ) : (
              <ul className="fkpc-timeline">
                {rule.revisions.map((r) => (
                  <li key={r.version}>
                    <strong>v{r.version}</strong>
                    <span>
                      {fmt(r.publishedAt)} · {r.publishedBy?.username || "—"}
                    </span>
                    {r.changeSummary && <p>{r.changeSummary}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="fkpc-h3">Review history</h3>
            <ul className="fkpc-timeline">
              {rule.review.slice(0, 8).map((r, i) => (
                <li key={i}>
                  <strong>{r.action.replace(/_/g, " ")}</strong>
                  <span>
                    {r.actor?.username || "—"} · {fmt(r.at)}
                  </span>
                  {r.note && <p>{r.note}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {confirm.element}
    </section>
  );
}

export default function RulesPage() {
  const { can } = useAdminAccess();
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const { data, setData, loading, error, refetch } = useAdminQuery(() => policyAdminApi.rules({ module, status, search }), [module, status, search]);
  const [selected, setSelected] = useState<OperationalRule | null>(null);
  const [creating, setCreating] = useState(false);

  const onSaved = (r: OperationalRule) => {
    setCreating(false);
    setSelected(r);
    const items = data?.items ?? [];
    setData({ items: items.some((x) => x.id === r.id) ? items.map((x) => (x.id === r.id ? r : x)) : [r, ...items] });
  };

  return (
    <div className="fkpc-stack">
      <section className="fksm-card">
        <div className="fksm-card__head">
          <h2>
            <SlidersHorizontal size={22} aria-hidden /> Operational Rules
          </h2>
          {can([P.POLICY_RULES_MANAGE]) && (
            <button
              type="button"
              className="fksm-btn fksm-btn--primary"
              onClick={() => {
                setSelected(null);
                setCreating(true);
              }}
            >
              <Plus size={16} aria-hidden /> New rule
            </button>
          )}
        </div>
        <div className="fkpc-filters">
          <label className="fksm-search fkpc-filters__search">
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules" aria-label="Search rules" />
          </label>
          <select className="fksm-select" value={module} onChange={(e) => setModule(e.target.value)} aria-label="Module">
            <option value="">All modules</option>
            {RULE_MODULES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select className="fksm-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
            <option value="">All statuses</option>
            {["draft", "pending_review", "approved", "published", "archived", "rejected"].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
        {loading && !data ? (
          <SmLoading />
        ) : error ? (
          <SmError message={error} onRetry={() => void refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty icon={<SlidersHorizontal size={22} />} title="No operational rules yet" text="Document enforcement rules, reporting procedures, Fockis Shop seller requirements and more." />
        ) : (
          <div className="fksm-table-wrap">
            <table className="fksm-table">
              <thead>
                <tr>
                  <th>Rule</th>
                  <th>Category</th>
                  <th>Module</th>
                  <th>Version</th>
                  <th>Status</th>
                  <th>Effective</th>
                  <th>Enforcement</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className={selected?.id === r.id ? "is-selected" : ""}>
                    <td>
                      <button type="button" className="fkpc-linkbtn" onClick={() => { setCreating(false); setSelected(r); }}>
                        {r.title}
                      </button>
                      {r.description && <small className="fkpc-sub">{r.description}</small>}
                    </td>
                    <td>
                      <CategoryPill category={r.category} />
                    </td>
                    <td>{moduleLabel(r.module)}</td>
                    <td>{r.version ? `v${r.version}` : "—"}</td>
                    <td>
                      <StatusPill status={r.status} />
                    </td>
                    <td>{fmt(r.effectiveDate)}</td>
                    <td className="fkpc-wrap">{ENFORCEMENT.find((e) => e.value === r.enforcement)?.label ?? r.enforcement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {(creating || selected) && <RuleEditor rule={creating ? null : selected} onSaved={onSaved} onClose={() => { setCreating(false); setSelected(null); }} />}
    </div>
  );
}
