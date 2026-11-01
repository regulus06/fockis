import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  CircleCheck,
  ExternalLink,
  Eye,
  GitCompare,
  History,
  List,
  ListOrdered,
  Paperclip,
  PenLine,
  Plus,
  Rocket,
  Save,
  Send,
  Trash2,
  Undo2,
  X,
} from "lucide-react";

import { adminError } from "../../support/supportAdminApi";
import { SmError, SmLoading, useConfirm } from "../../support/components/SmParts";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { useAdminNotificationStore } from "../../store/adminNotificationStore";
import { DiffView, PolicyPreview, StatusPill, Workflow, sectionsToText } from "../components/PolicyParts";
import { PC_BASE, usePolicyContext } from "../PolicyLayout";
import { AUDIENCES, CATEGORIES, policyAdminApi, type PolicyDetail, type PolicyDraftInput, type Section } from "../policyAdminApi";

const P = PERMISSIONS;
const VERSION = /^\d{1,3}(\.\d{1,3}){1,2}$/;

interface Form {
  title: string;
  slug: string;
  category: string;
  audience: string;
  description: string;
  version: string;
  effectiveDate: string;
  reviewDate: string;
  requiredAcceptance: boolean;
  changeSummary: string;
  sections: Section[];
  documents: { label: string; url: string }[];
}

const EMPTY: Form = {
  title: "",
  slug: "",
  category: "legal",
  audience: "everyone",
  description: "",
  version: "1.0",
  effectiveDate: "",
  reviewDate: "",
  requiredAcceptance: false,
  changeSummary: "",
  sections: [{ heading: "1. Introduction", body: "" }],
  documents: [],
};

const toDate = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");
const fmt = (iso?: string | null, time = false) =>
  iso ? new Date(iso).toLocaleString(undefined, time ? { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" } : { month: "short", day: "numeric", year: "numeric" }) : "—";
const slugify = (s: string) => s.toLowerCase().trim().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

function nextVersion(v?: string | null) {
  if (!v) return "1.0";
  const parts = v.split(".").map(Number);
  parts[1] = (parts[1] ?? 0) + 1;
  return parts.slice(0, Math.max(2, parts.length)).join(".");
}

function formFrom(p: PolicyDetail): Form {
  const v = p.workingVersion ?? p.publishedVersionDetail;
  return {
    title: v?.title ?? p.title,
    slug: p.slug,
    category: p.category,
    audience: p.audience,
    description: v?.description ?? p.description,
    version: p.workingVersion ? p.workingVersion.version : nextVersion(p.publishedVersion),
    effectiveDate: p.workingVersion ? toDate(p.workingVersion.effectiveDate) : "",
    reviewDate: toDate(p.reviewDate),
    requiredAcceptance: v?.requiredAcceptance ?? p.requiredAcceptance,
    changeSummary: p.workingVersion?.changeSummary ?? "",
    sections: v?.sections?.length ? v.sections : EMPTY.sections,
    documents: p.documents ?? [],
  };
}

/* ---------------- section editor ---------------- */

function SectionEditor({ sections, onChange, disabled }: { sections: Section[]; onChange: (s: Section[]) => void; disabled: boolean }) {
  const refs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const update = (i: number, patch: Partial<Section>) => onChange(sections.map((s, k) => (k === i ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => {
    const next = [...sections];
    const [s] = next.splice(i, 1);
    next.splice(i + d, 0, s);
    onChange(next);
  };
  const format = (i: number, kind: "bullet" | "number") => {
    const el = refs.current[i];
    const body = sections[i].body;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    const block = body.slice(lineStart, end).split("\n");
    const formatted = block.map((line, k) => {
      const clean = line.replace(/^([-•]|\d+[.)])\s+/, "");
      return kind === "bullet" ? `- ${clean}` : `${k + 1}. ${clean}`;
    });
    update(i, { body: body.slice(0, lineStart) + formatted.join("\n") + body.slice(end) });
    window.setTimeout(() => el?.focus(), 0);
  };

  return (
    <div className="fkpc-sections">
      {sections.map((s, i) => (
        <div key={i} className="fkpc-section">
          <div className="fkpc-section__head">
            <span className="fkpc-section__num">{i + 1}</span>
            <input className="fksm-input" value={s.heading} onChange={(e) => update(i, { heading: e.target.value })} placeholder="Section heading" aria-label={`Section ${i + 1} heading`} disabled={disabled} maxLength={200} />
            {!disabled && (
              <span className="fkpc-section__tools">
                <button type="button" className="fksm-icon-btn" title="Bulleted list" aria-label="Bulleted list" onClick={() => format(i, "bullet")}>
                  <List size={16} />
                </button>
                <button type="button" className="fksm-icon-btn" title="Numbered list" aria-label="Numbered list" onClick={() => format(i, "number")}>
                  <ListOrdered size={16} />
                </button>
                <button type="button" className="fksm-icon-btn" title="Move up" aria-label="Move section up" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp size={16} />
                </button>
                <button type="button" className="fksm-icon-btn" title="Move down" aria-label="Move section down" disabled={i === sections.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown size={16} />
                </button>
                <button type="button" className="fksm-icon-btn" title="Remove section" aria-label="Remove section" disabled={sections.length === 1} onClick={() => onChange(sections.filter((_, k) => k !== i))}>
                  <Trash2 size={16} />
                </button>
              </span>
            )}
          </div>
          <textarea
            ref={(el) => {
              refs.current[i] = el;
            }}
            className="fksm-input fkpc-section__body"
            rows={Math.min(18, Math.max(5, s.body.split("\n").length + 1))}
            value={s.body}
            onChange={(e) => update(i, { body: e.target.value })}
            placeholder={"Write the policy text. Start a line with “- ” for a bullet or “1. ” for a numbered step."}
            aria-label={`Section ${i + 1} text`}
            disabled={disabled}
            maxLength={20000}
          />
        </div>
      ))}
      {!disabled && (
        <button type="button" className="fksm-btn fksm-btn--secondary" onClick={() => onChange([...sections, { heading: `${sections.length + 1}. `, body: "" }])}>
          <Plus size={16} aria-hidden /> Add section
        </button>
      )}
    </div>
  );
}

function Field({ label, children, hint, required }: { label: string; children: ReactNode; hint?: string; required?: boolean }) {
  return (
    <label className="fksm-field">
      <span>
        {label}
        {required && <b className="fksm-required"> *</b>}
      </span>
      {children}
      {hint && <small className="fksm-muted">{hint}</small>}
    </label>
  );
}

/* ---------------- page ---------------- */

export default function PolicyEditorPage() {
  const { policyId = "new" } = useParams();
  const isNew = policyId === "new";
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") ?? "edit";
  const { can } = useAdminAccess();
  const { refresh } = usePolicyContext();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const confirm = useConfirm();

  const [policy, setPolicy] = useState<PolicyDetail | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [compareText, setCompareText] = useState<{ label: string; text: string } | null>(null);

  const load = async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const p = await policyAdminApi.get(policyId);
      setPolicy(p);
      setForm(formFrom(p));
      setDirty(false);
    } catch (e) {
      setError(adminError(e, "Couldn't load this policy."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [policyId]);

  const working = policy?.workingVersion ?? null;
  const editable = can([P.POLICY_EDIT]) && (isNew || !working || ["draft", "rejected"].includes(working.status)) && policy?.status !== "archived";
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value, ...(key === "title" && isNew && !slugTouched ? { slug: slugify(String(value)) } : {}) }));
    setDirty(true);
  };

  // Compare: working draft vs. another version (published by default).
  const baseOptions = useMemo(() => (policy?.versions ?? []).filter((v) => v.id !== working?.id), [policy, working]);
  useEffect(() => {
    if (tab !== "compare" || !policy) return;
    const id = compareWith || policy.publishedVersionDetail?.id || baseOptions[0]?.id;
    if (!id) {
      setCompareText(null);
      return;
    }
    if (id === policy.publishedVersionDetail?.id) {
      setCompareText({ label: `v${policy.publishedVersionDetail.version} (published)`, text: sectionsToText(policy.publishedVersionDetail.sections) });
      return;
    }
    policyAdminApi
      .version(id)
      .then((v) => setCompareText({ label: `v${v.version}`, text: sectionsToText(v.sections) }))
      .catch((e) => toast("error", adminError(e)));
  }, [tab, compareWith, policy, baseOptions, toast]);

  function validate(forSubmit: boolean) {
    const out: string[] = [];
    if (form.title.trim().length < 3) out.push("Add a title (at least 3 characters).");
    if (isNew && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) out.push("The slug can only use lowercase letters, numbers and dashes.");
    if (!VERSION.test(form.version)) out.push("Use a version like 1.0 or 2.3.1.");
    if (forSubmit) {
      if (!form.sections.some((s) => s.body.trim())) out.push("Add the policy text.");
      if (!form.changeSummary.trim()) out.push("Add a change summary.");
      if (!form.effectiveDate) out.push("Set an effective date.");
    }
    if (form.documents.some((d) => !d.label.trim() || !/^(\/\S*|https:\/\/\S+)$/.test(d.url.trim()))) out.push("Each supporting document needs a name and a Fockis path or https link.");
    setProblems(out);
    return out.length === 0;
  }

  function payload(): PolicyDraftInput {
    const body: PolicyDraftInput = {
      title: form.title.trim(),
      category: form.category,
      audience: form.audience,
      description: form.description.trim(),
      requiredAcceptance: form.requiredAcceptance,
      version: form.version.trim(),
      sections: form.sections.map((s) => ({ heading: s.heading.trim(), body: s.body })),
      changeSummary: form.changeSummary.trim(),
      documents: form.documents.map((d) => ({ label: d.label.trim(), url: d.url.trim() })),
    };
    if (form.effectiveDate) body.effectiveDate = new Date(`${form.effectiveDate}T00:00:00Z`).toISOString();
    if (form.reviewDate) body.reviewDate = new Date(`${form.reviewDate}T00:00:00Z`).toISOString();
    if (isNew) body.slug = form.slug;
    return body;
  }

  async function save(): Promise<PolicyDetail | null> {
    if (!validate(false)) return null;
    setBusy("save");
    try {
      if (isNew) {
        const created = await policyAdminApi.create(payload());
        toast("success", "Draft created.");
        refresh();
        navigate(`${PC_BASE}/policies/${created.id}`, { replace: true });
        return created;
      }
      const updated = await policyAdminApi.saveDraft(policyId, payload());
      setPolicy(updated);
      setForm(formFrom(updated));
      setDirty(false);
      toast("success", "Draft saved.");
      refresh();
      return updated;
    } catch (e) {
      toast("error", adminError(e, "Couldn't save the draft."));
      return null;
    } finally {
      setBusy("");
    }
  }

  async function run(label: string, action: () => Promise<PolicyDetail>, success: string) {
    setBusy(label);
    try {
      const p = await action();
      setPolicy(p);
      setForm(formFrom(p));
      setDirty(false);
      toast("success", success);
      refresh();
    } catch (e) {
      toast("error", adminError(e));
    } finally {
      setBusy("");
    }
  }

  async function submit() {
    if (!validate(true)) return;
    if (dirty || !working) {
      const saved = await save();
      if (!saved) return;
    }
    await run("submit", () => policyAdminApi.submit(policyId), "Sent for approval. Approvers have been notified.");
  }

  const decide = (kind: "reject" | "changes") =>
    confirm.ask(
      kind === "reject"
        ? { title: "Reject this version?", description: "The author will see your reason. A rejected version can be edited and submitted again.", confirmLabel: "Reject version", tone: "danger", reasonLabel: "Reason for rejection" }
        : { title: "Request changes?", description: "The version goes back to draft so the author can make your changes.", confirmLabel: "Request changes", reasonLabel: "What needs to change" },
      async (reason) => {
        const p = kind === "reject" ? await policyAdminApi.reject(policyId, reason) : await policyAdminApi.requestChanges(policyId, reason);
        setPolicy(p);
        setForm(formFrom(p));
        toast("success", kind === "reject" ? "Version rejected." : "Changes requested.");
        refresh();
      },
    );

  const publishNow = () =>
    confirm.ask(
      {
        title: `Publish v${working?.version}?`,
        description: working?.requiredAcceptance ? "This version replaces the current one for everyone. Members will be asked to accept it and get a notification." : "This version replaces the current one for everyone straight away.",
        confirmLabel: "Publish now",
      },
      async () => {
        const p = await policyAdminApi.publish(policyId);
        setPolicy(p);
        setForm(formFrom(p));
        toast("success", "Published. Members now see the new version.");
        refresh();
      },
    );

  const archive = () =>
    confirm.ask(
      { title: `Archive ${policy?.title}?`, description: "Archived policies are hidden from members. Versions and acceptance records are kept.", confirmLabel: "Archive", tone: "danger", reasonLabel: "Reason" },
      async (reason) => {
        const p = await policyAdminApi.archive(policyId, reason);
        setPolicy(p);
        toast("success", "Policy archived.");
        refresh();
      },
    );

  if (loading) return <div className="fksm-card"><SmLoading label="Loading policy…" /></div>;
  if (error) return <div className="fksm-card"><SmError message={error} onRetry={() => void load()} /></div>;

  const status = working?.status ?? policy?.status ?? "draft";
  const flowStep = policy?.status === "archived" ? undefined : working ? (working.status === "rejected" ? "draft" : working.status) : policy?.publishedVersion ? "published" : "draft";
  const setTab = (t: string) => setParams(t === "edit" ? {} : { tab: t }, { replace: true });

  /* ---------- action bar ---------- */
  const actions: ReactNode[] = [];
  if (editable) {
    actions.push(
      <button key="save" type="button" className="fksm-btn fksm-btn--secondary" disabled={Boolean(busy)} onClick={() => void save()}>
        <Save size={16} aria-hidden /> {busy === "save" ? "Saving…" : isNew ? "Create draft" : "Save draft"}
      </button>,
    );
    if (!isNew)
      actions.push(
        <button key="submit" type="button" className="fksm-btn fksm-btn--primary" disabled={Boolean(busy)} onClick={() => void submit()}>
          <Send size={16} aria-hidden /> {busy === "submit" ? "Submitting…" : "Submit for approval"}
        </button>,
      );
  }
  if (working && ["pending_review", "approved", "scheduled"].includes(working.status) && can([P.POLICY_EDIT]))
    actions.push(
      <button key="withdraw" type="button" className="fksm-btn fksm-btn--secondary" disabled={Boolean(busy)} onClick={() => void run("withdraw", () => policyAdminApi.withdraw(policyId), "Withdrawn. The version is back in draft.")}>
        <Undo2 size={16} aria-hidden /> Withdraw
      </button>,
    );
  if (working?.status === "pending_review" && can([P.POLICY_REVIEW])) {
    actions.push(
      <button key="changes" type="button" className="fksm-btn fksm-btn--secondary" disabled={Boolean(busy)} onClick={() => decide("changes")}>
        <PenLine size={16} aria-hidden /> Request changes
      </button>,
      <button key="reject" type="button" className="fksm-btn fksm-btn--danger" disabled={Boolean(busy)} onClick={() => decide("reject")}>
        <X size={16} aria-hidden /> Reject
      </button>,
      <button key="approve" type="button" className="fksm-btn fksm-btn--primary" disabled={Boolean(busy)} onClick={() => void run("approve", () => policyAdminApi.approve(policyId), "Version approved.")}>
        <CircleCheck size={16} aria-hidden /> Approve
      </button>,
    );
  }
  if (working && ["approved", "scheduled"].includes(working.status) && can([P.POLICY_PUBLISH])) {
    actions.push(
      <span key="schedule" className="fkpc-schedule">
        <input type="datetime-local" className="fksm-input" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} aria-label="Publish at" />
        <button type="button" className="fksm-btn fksm-btn--secondary" disabled={!scheduleAt || Boolean(busy)} onClick={() => void run("schedule", () => policyAdminApi.schedule(policyId, new Date(scheduleAt).toISOString()), "Publication scheduled.")}>
          <CalendarClock size={16} aria-hidden /> {working.status === "scheduled" ? "Reschedule" : "Schedule"}
        </button>
      </span>,
      <button key="publish" type="button" className="fksm-btn fksm-btn--primary" disabled={Boolean(busy)} onClick={publishNow}>
        <Rocket size={16} aria-hidden /> Publish now
      </button>,
    );
  }
  if (policy && can([P.POLICY_PUBLISH]))
    actions.push(
      policy.status === "archived" ? (
        <button key="unarchive" type="button" className="fksm-btn fksm-btn--secondary" disabled={Boolean(busy)} onClick={() => void run("unarchive", () => policyAdminApi.unarchive(policyId), "Policy restored.")}>
          <Undo2 size={16} aria-hidden /> Restore policy
        </button>
      ) : (
        <button key="archive" type="button" className="fksm-btn fksm-btn--danger-ghost" disabled={Boolean(busy)} onClick={archive}>
          Archive
        </button>
      ),
    );

  const lastNote = [...(working?.review ?? [])].reverse().find((r) => ["rejected", "changes_requested"].includes(r.action) && r.note);

  return (
    <div className="fkpc-editor">
      <section className="fksm-card fkpc-editor__head">
        <Link to={`${PC_BASE}/policies`} className="fksm-link fkpc-back">
          <ArrowLeft size={15} aria-hidden /> Policy Library
        </Link>
        <div className="fkpc-editor__title">
          <div>
            <h2>{isNew ? "Create Policy" : policy?.title}</h2>
            <p className="fksm-muted">
              {isNew ? "New policies start as a draft." : `/${policy?.slug}`}
              {policy?.publishedVersion ? ` · Live: v${policy.publishedVersion}` : ""}
              {working ? ` · Working on v${working.version}` : ""}
              {policy?.acceptanceCount ? ` · ${policy.acceptanceCount.toLocaleString()} acceptances of the live version` : ""}
            </p>
          </div>
          {!isNew && <StatusPill status={status} />}
          {policy?.status === "published" && (
            <a className="fksm-link" href={`/policies/${policy.slug}`} target="_blank" rel="noreferrer">
              Public page <ExternalLink size={14} aria-hidden />
            </a>
          )}
        </div>
        {!isNew && <Workflow current={flowStep} compact />}
        {working?.status === "scheduled" && working.scheduledFor && <p className="fksm-notice fksm-notice--info">Scheduled to publish {fmt(working.scheduledFor, true)}.</p>}
        {lastNote && working?.status !== "pending_review" && (
          <p className="fksm-notice fksm-notice--error">
            {lastNote.action === "rejected" ? "Rejected" : "Changes requested"} by {lastNote.actor?.username || lastNote.actor?.name || "a reviewer"}: {lastNote.note}
          </p>
        )}
        {!editable && !isNew && working && ["pending_review", "approved", "scheduled"].includes(working.status) && <p className="fksm-notice fksm-notice--info">This version is in the approval workflow, so it can't be edited. Withdraw it to make changes.</p>}
        {problems.length > 0 && (
          <ul className="fksm-notice fksm-notice--error fkpc-problems" role="alert">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {actions.length > 0 && <div className="fkpc-actionbar">{actions}</div>}
      </section>

      {!isNew && (
        <div className="fksm-tabs fkpc-subtabs" role="tablist">
          {[
            { id: "edit", label: "Editor", icon: PenLine },
            { id: "preview", label: "Preview", icon: Eye },
            { id: "compare", label: "Compare versions", icon: GitCompare },
            { id: "history", label: "History", icon: History },
          ].map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>
              <t.icon size={15} aria-hidden /> {t.label}
            </button>
          ))}
        </div>
      )}

      {(isNew || tab === "edit") && (
        <div className="fkpc-editor__grid">
          <section className="fksm-card">
            <h3 className="fkpc-h3">Policy content</h3>
            {!working && policy?.publishedVersion && editable && (
              <p className="fksm-notice fksm-notice--info">You're starting a new version from the published v{policy.publishedVersion}. The live policy doesn't change until the new version is approved and published.</p>
            )}
            <SectionEditor sections={form.sections} onChange={(s) => set("sections", s)} disabled={!editable} />
          </section>

          <aside className="fkpc-editor__side">
            <section className="fksm-card">
              <h3 className="fkpc-h3">Details</h3>
              <div className="fksm-form-grid fkpc-form">
                <Field label="Policy title" required>
                  <input className="fksm-input" value={form.title} onChange={(e) => set("title", e.target.value)} disabled={!editable} maxLength={150} />
                </Field>
                <Field label="Slug" required hint={isNew ? `Public address: /policies/${form.slug || "…"}` : "The address can't change after creation."}>
                  <input
                    className="fksm-input"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set("slug", e.target.value.toLowerCase());
                    }}
                    disabled={!isNew}
                    maxLength={80}
                  />
                </Field>
                <Field label="Category" required>
                  <select className="fksm-select" value={form.category} onChange={(e) => set("category", e.target.value)} disabled={!editable}>
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Applies to">
                  <select className="fksm-select" value={form.audience} onChange={(e) => set("audience", e.target.value)} disabled={!editable}>
                    {AUDIENCES.map((a) => (
                      <option key={a.value} value={a.value}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Description" hint="Shown in policy lists.">
                  <textarea className="fksm-input" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} disabled={!editable} maxLength={400} />
                </Field>
                <Field label="Version" required hint={policy?.publishedVersion ? `Must be higher than v${policy.publishedVersion}.` : undefined}>
                  <input className="fksm-input" value={form.version} onChange={(e) => set("version", e.target.value)} disabled={!editable} maxLength={11} />
                </Field>
                <Field label="Effective date" required>
                  <input type="date" className="fksm-input" value={form.effectiveDate} onChange={(e) => set("effectiveDate", e.target.value)} disabled={!editable} />
                </Field>
                <Field label="Next review date">
                  <input type="date" className="fksm-input" value={form.reviewDate} onChange={(e) => set("reviewDate", e.target.value)} disabled={!editable} />
                </Field>
                <label className="fksm-check">
                  <input type="checkbox" checked={form.requiredAcceptance} onChange={(e) => set("requiredAcceptance", e.target.checked)} disabled={!editable} />
                  <span>Members must accept this version</span>
                </label>
                <Field label="Change summary" required hint="Shown to members with the update.">
                  <textarea className="fksm-input" rows={3} value={form.changeSummary} onChange={(e) => set("changeSummary", e.target.value)} disabled={!editable} maxLength={1000} />
                </Field>
              </div>
            </section>

            <section className="fksm-card">
              <h3 className="fkpc-h3">
                <Paperclip size={16} aria-hidden /> Supporting documents
              </h3>
              {form.documents.length === 0 && <p className="fksm-muted">None.</p>}
              {form.documents.map((d, i) => (
                <div key={i} className="fkpc-doc-row">
                  <input className="fksm-input" value={d.label} placeholder="Name" aria-label="Document name" onChange={(e) => set("documents", form.documents.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} disabled={!editable} />
                  <input className="fksm-input" value={d.url} placeholder="https://… or /help/…" aria-label="Document link" onChange={(e) => set("documents", form.documents.map((x, k) => (k === i ? { ...x, url: e.target.value } : x)))} disabled={!editable} />
                  {editable && (
                    <button type="button" className="fksm-icon-btn" aria-label="Remove document" onClick={() => set("documents", form.documents.filter((_, k) => k !== i))}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              {editable && form.documents.length < 10 && (
                <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => set("documents", [...form.documents, { label: "", url: "" }])}>
                  <Plus size={15} aria-hidden /> Add document
                </button>
              )}
            </section>
          </aside>
        </div>
      )}

      {!isNew && tab === "preview" && (
        <section className="fksm-card">
          <div className="fkpc-preview-head">
            <h3>{form.title}</h3>
            <span className="fksm-muted">
              Version {form.version}
              {form.effectiveDate ? ` · Effective ${fmt(`${form.effectiveDate}T12:00:00`)}` : ""}
            </span>
          </div>
          {form.description && <p className="fkpc-lead">{form.description}</p>}
          <PolicyPreview sections={form.sections} />
          {dirty && <p className="fksm-notice fksm-notice--info">Preview includes unsaved changes.</p>}
        </section>
      )}

      {!isNew && tab === "compare" && (
        <section className="fksm-card">
          <div className="fkpc-compare-bar">
            <span>Compare the {working ? `working v${working.version}` : "current text"} with</span>
            <select className="fksm-select" value={compareWith || policy?.publishedVersionDetail?.id || baseOptions[0]?.id || ""} onChange={(e) => setCompareWith(e.target.value)} aria-label="Version to compare with">
              {baseOptions.map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version} — {v.status}
                </option>
              ))}
            </select>
          </div>
          {!baseOptions.length ? <p className="fksm-muted">There's no other version to compare with yet.</p> : compareText ? <DiffView before={compareText.text} after={sectionsToText(form.sections)} beforeLabel={compareText.label} afterLabel={working ? `v${working.version}` : "current"} /> : <SmLoading />}
        </section>
      )}

      {!isNew && tab === "history" && policy && (
        <div className="fkpc-editor__grid">
          <section className="fksm-card">
            <h3 className="fkpc-h3">Versions</h3>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Status</th>
                    <th>Change summary</th>
                    <th>Created by</th>
                    <th>Approved by</th>
                    <th>Published</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.versions.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link to={`${PC_BASE}/versions/${v.id}`}>v{v.version}</Link>
                      </td>
                      <td>
                        <StatusPill status={v.status} />
                      </td>
                      <td className="fkpc-wrap">{v.changeSummary || "—"}</td>
                      <td>{v.createdBy?.username || v.createdBy?.name || "—"}</td>
                      <td>{v.approvedBy?.username || v.approvedBy?.name || "—"}</td>
                      <td>{fmt(v.publishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <aside className="fkpc-editor__side">
            <section className="fksm-card">
              <h3 className="fkpc-h3">Review notes {working ? `(v${working.version})` : ""}</h3>
              <p className="fksm-muted fkpc-small">Internal — never shown to members.</p>
              {!(working?.review ?? []).length ? (
                <p className="fksm-muted">No review activity on the working version.</p>
              ) : (
                <ul className="fkpc-timeline">
                  {[...(working?.review ?? [])].reverse().map((r, i) => (
                    <li key={i}>
                      <strong>{r.action.replace(/_/g, " ")}</strong>
                      <span>
                        {r.actor?.username || r.actor?.name || "System"} · {fmt(r.at, true)}
                      </span>
                      {r.note && <p>{r.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      )}
      {confirm.element}
    </div>
  );
}
