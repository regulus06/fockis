import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Briefcase, Building2, ExternalLink, FileText, LayoutDashboard, Search, ShieldCheck, Wallet } from "lucide-react";

import { useAdminNotificationStore } from "../store/adminNotificationStore";
import { useAdminAccess } from "../permissions/adminAccess";
import { PERMISSIONS } from "../permissions/permission.constants";
import { Card, Pager, Pill, SmEmpty, SmError, SmLoading, formatDateTime, useAdminQuery, useConfirm, type Tone } from "../support/components/SmParts";
import { adminError } from "../support/supportAdminApi";
import { careersAdminApi, type EmployerAction, type EmployerDetail, type EmployerStatus, type JobAdminAction, type JobStatus, type PlanSettings, type PlanState } from "./careersAdminApi";
import "../support/styles/SupportMod.scss";
import "../academy/AcademyAdminCenter.scss";
import "./CareersAdmin.scss";

/* ============================================================================
   ADMIN · CAREERS
   /admin/careers                 overview
   /admin/careers/employers(/:id) approve, reject, block employers; plan & payments
   /admin/careers/jobs            every job post; take down / restore
   /admin/careers/plans           employer plan prices & limits (never hard-coded)
============================================================================ */

const TABS = [
  { to: "/admin/careers", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/careers/employers", label: "Employers", icon: Building2 },
  { to: "/admin/careers/jobs", label: "Jobs", icon: Briefcase },
  { to: "/admin/careers/plans", label: "Employer plans", icon: Wallet },
];

const EMPLOYER_STATUS: Record<EmployerStatus, { label: string; tone: Tone }> = {
  not_submitted: { label: "No form yet", tone: "gray" },
  pending: { label: "Waiting", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "gray" },
  blocked: { label: "Blocked", tone: "red" },
};

const PLAN_STATE: Record<PlanState, { label: string; tone: Tone }> = {
  free: { label: "Free", tone: "gray" },
  exempt: { label: "Free of charge", tone: "purple" },
  paid: { label: "Paid", tone: "green" },
  active: { label: "Paid", tone: "green" },
  grace: { label: "Payment due", tone: "amber" },
  expired: { label: "Not paid", tone: "red" },
};

const JOB_STATUS: Record<JobStatus, { label: string; tone: Tone }> = {
  live: { label: "Live on Careers", tone: "green" },
  waiting: { label: "Waiting for approval", tone: "amber" },
  closed: { label: "Closed", tone: "gray" },
  taken_down: { label: "Hidden by admin", tone: "red" },
};

const money = (amount: number, currency: string) => {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};
const perPeriod = (m: number) => (m === 0 ? "one-time" : m === 1 ? "per month" : m === 12 ? "per year" : `every ${m} months`);
const dateOnly = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");

function useCanManage() {
  const { can } = useAdminAccess();
  return can([PERMISSIONS.CAREERS_MANAGE]);
}

function useParam(name: string, fallback: string) {
  const [params, setParams] = useSearchParams();
  const value = params.get(name) ?? fallback;
  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in patch)) next.delete("page");
    setParams(next, { replace: true });
  };
  return [value, set, params] as const;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="fksm fkac">
      <header className="fkac-head">
        <div>
          <h1>
            <Briefcase size={24} aria-hidden="true" /> Fockis Careers
          </h1>
          <p className="fksm-muted">Employers who want to post jobs, every job post, and what employer plans cost.</p>
        </div>
        <a className="fksm-btn fksm-btn--secondary fksm-btn--sm" href="/careers" target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Open Careers
        </a>
      </header>
      <nav className="fkac-tabs" aria-label="Careers sections">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? "is-active" : "")}>
            <t.icon size={16} aria-hidden="true" /> {t.label}
          </NavLink>
        ))}
      </nav>
      {children}
    </div>
  );
}

function Stat({ icon, label, value, sub, to }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; to?: string }) {
  const body = (
    <>
      <span className="fkac-stat__icon">{icon}</span>
      <span className="fkac-stat__body">
        <small>{label}</small>
        <strong>{value}</strong>
        {sub && <em>{sub}</em>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} className="fkac-stat">
      {body}
    </Link>
  ) : (
    <div className="fkac-stat">{body}</div>
  );
}

/* ---------------------------------------------------------------- overview */

function OverviewPage() {
  const q = useAdminQuery(() => careersAdminApi.overview(), []);
  if (q.loading && !q.data) return <SmLoading />;
  if (q.error || !q.data) return <SmError message={q.error ?? "Could not load."} onRetry={q.refetch} />;
  const o = q.data;
  return (
    <>
      <div className="fkac-stats">
        <Stat icon={<Building2 size={20} />} label="Employers waiting" value={o.employers.pending} sub="Submitted the form" to="/admin/careers/employers?status=pending" />
        <Stat icon={<ShieldCheck size={20} />} label="Approved employers" value={o.employers.approved} sub={`${o.employers.blocked} blocked · ${o.employers.rejected} rejected`} to="/admin/careers/employers?status=approved" />
        <Stat icon={<Briefcase size={20} />} label="Jobs live on Careers" value={o.jobs.live} sub={`${o.jobs.total} posted · ${o.jobs.takenDown} taken down`} to="/admin/careers/jobs?status=live" />
        <Stat icon={<FileText size={20} />} label="Applications" value={o.applications} sub={o.chargingOn ? "Employer plans: charging ON" : "Employer plans: all free"} to="/admin/careers/plans" />
      </div>
      <Card title="How it works" icon={<ShieldCheck size={18} />}>
        <ol className="fkac-steps">
          <li>An employer fills the form in Employer Center → Verification.</li>
          <li>You approve, reject or block them in Employers.</li>
          <li>Once approved, every job they post appears on Careers right away. Jobs posted earlier go live when you approve.</li>
          <li>You can take any single job down in Jobs. Blocking an employer hides all their jobs.</li>
          <li>Prices and open-job limits for Free / Growth / Enterprise are set in Employer plans.</li>
        </ol>
      </Card>
    </>
  );
}

/* ---------------------------------------------------------------- employers */

const EMPLOYER_TABS = [
  { value: "pending", label: "Waiting" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "blocked", label: "Blocked" },
  { value: "not_submitted", label: "No form yet" },
  { value: "all", label: "All" },
];

function EmployersPage() {
  const navigate = useNavigate();
  const [status, set, params] = useParam("status", "pending");
  const search = params.get("search") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => careersAdminApi.employers({ status, search, page }), [status, search, page]);
  return (
    <Card title="Employers" icon={<Building2 size={20} />}>
      <p className="fksm-muted fkac-intro">Approve an employer once and every job they post appears on Careers. Blocking hides all their jobs and stops new posts.</p>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {EMPLOYER_TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set({ status: t.value })}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: draft.trim() });
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Company, legal name or email…" aria-label="Search employers" />
        </form>
      </div>
      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Building2 size={24} />} title={status === "pending" ? "No employers waiting" : "No employers here"} />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Employer</th>
                  <th>Place</th>
                  <th>Jobs</th>
                  <th>Plan</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((e) => (
                  <tr key={e.id} className="is-clickable" onClick={() => navigate(`/admin/careers/employers/${e.id}`)}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{e.companyName}</strong>
                        <span>{[e.industry, e.businessEmail].filter(Boolean).join(" · ") || "—"}</span>
                      </span>
                    </td>
                    <td>{e.location || "—"}</td>
                    <td>
                      {e.liveJobs} live / {e.jobs}
                    </td>
                    <td>
                      {e.plan}
                      {e.planState !== "free" && (
                        <>
                          {" "}
                          <Pill tone={PLAN_STATE[e.planState].tone}>{PLAN_STATE[e.planState].label}</Pill>
                        </>
                      )}
                    </td>
                    <td>{dateOnly(e.submittedAt)}</td>
                    <td>
                      <Pill tone={EMPLOYER_STATUS[e.status].tone}>{EMPLOYER_STATUS[e.status].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
        </>
      )}
    </Card>
  );
}

function EmployerDetailPage() {
  const { id = "" } = useParams();
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const q = useAdminQuery(() => careersAdminApi.employer(id), [id]);
  const d = q.data;
  const [planForm, setPlanForm] = useState<{ plan: string; until: string; amount: string; note: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const act = (action: EmployerAction["action"]) => {
    const copy: Record<string, { title: string; description: string; label: string; reason?: string; tone: "primary" | "danger"; done: string }> = {
      approve: { title: "Approve this employer?", description: "Every job they posted (and will post) appears on Careers.", label: "Approve", reason: "Note (optional)", tone: "primary", done: "Employer approved — their jobs are live." },
      reject: { title: "Reject this employer?", description: "Their jobs stay hidden. They see your reason and can send the form again.", label: "Reject", reason: "Reason (the employer sees it)", tone: "danger", done: "Employer rejected." },
      block: { title: "Block this employer?", description: "All their jobs leave Careers and they can't post new ones. Applications already received stay with them.", label: "Block", reason: "Reason (the employer sees it)", tone: "danger", done: "Employer blocked." },
      unblock: { title: "Unblock this employer?", description: "If they were approved, their jobs come back on Careers.", label: "Unblock", tone: "primary", done: "Employer unblocked." },
      exempt: { title: "Make their plan free of charge?", description: "They keep their plan without paying until you remove this.", label: "Make free", reason: "Why (kept in the history)", tone: "primary", done: "Plan is now free of charge." },
      unexempt: { title: "Remove free of charge?", description: "They will need to pay for their plan, or fall back to Free.", label: "Remove", tone: "danger", done: "Free of charge removed." },
      clear_paid: { title: "Clear the paid period?", description: "Undo a payment recorded by mistake.", label: "Clear", reason: "Why (kept in the history)", tone: "danger", done: "Paid period cleared." },
    };
    const t = copy[action];
    confirm.ask({ title: t.title, description: t.description, confirmLabel: t.label, tone: t.tone, reasonLabel: t.reason }, async (reason) => {
      q.setData(await careersAdminApi.employerAction(id, { action, reason }));
      toast("success", t.done);
    });
  };

  function openPlan(x: EmployerDetail) {
    setPlanForm({ plan: x.plan.planId, until: "", amount: "", note: "" });
    setError(null);
  }

  async function savePlan() {
    if (!planForm) return;
    setBusy(true);
    setError(null);
    try {
      q.setData(
        await careersAdminApi.employerAction(id, {
          action: "set_plan",
          plan: planForm.plan,
          until: planForm.until ? new Date(`${planForm.until}T23:59:59`).toISOString() : undefined,
          amount: planForm.amount === "" ? undefined : Number(planForm.amount),
          reason: planForm.note.trim() || undefined,
        }),
      );
      toast("success", "Plan updated.");
      setPlanForm(null);
    } catch (e) {
      setError(adminError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Link to="/admin/careers/employers" className="fksm-back">
        <ArrowLeft size={16} /> Back to employers
      </Link>
      {q.loading && !d ? (
        <SmLoading />
      ) : q.error || !d ? (
        <SmError message={q.error ?? "Employer not found."} onRetry={q.refetch} />
      ) : (
        <div className="fksm-detail">
          <div className="fksm-stack">
            <Card>
              <div className="fksm-detail-head">
                <div>
                  <h2>{d.companyName}</h2>
                  <div className="fksm-detail-head__meta">
                    {d.industry && <span>{d.industry}</span>}
                    {d.location && (
                      <>
                        <span>·</span>
                        <span>{d.location}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>team of {d.teamSize}</span>
                  </div>
                </div>
                <Pill tone={EMPLOYER_STATUS[d.status].tone}>{EMPLOYER_STATUS[d.status].label}</Pill>
              </div>
              {d.status === "blocked" && d.blockedReason && <p className="fksm-notice fksm-notice--error">Blocked: “{d.blockedReason}”</p>}
              {d.about && <p className="fkac-summary">{d.about}</p>}
              <dl className="fksm-facts">
                <div>
                  <dt>Account owner</dt>
                  <dd>
                    {d.owner.name}
                    {d.owner.email ? ` · ${d.owner.email}` : ""}
                  </dd>
                </div>
                {d.website && (
                  <div>
                    <dt>Website</dt>
                    <dd>
                      <a className="fksm-link" href={d.website} target="_blank" rel="noopener noreferrer nofollow">
                        {d.website}
                      </a>
                    </dd>
                  </div>
                )}
                {d.companySize && (
                  <div>
                    <dt>Size</dt>
                    <dd>{d.companySize}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card title="Employer form" icon={<FileText size={18} />}>
              {d.verification.status === "not_submitted" ? (
                <p className="fksm-muted">They haven&apos;t sent the form yet. You can still approve them if you know the company.</p>
              ) : (
                <dl className="fksm-facts">
                  <div>
                    <dt>Legal name</dt>
                    <dd>{d.verification.legalName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Business email</dt>
                    <dd>{d.verification.businessEmail || "—"}</dd>
                  </div>
                  <div>
                    <dt>Website</dt>
                    <dd>{d.verification.website || "—"}</dd>
                  </div>
                  {d.verification.registrationNumber && (
                    <div>
                      <dt>Registration no.</dt>
                      <dd>{d.verification.registrationNumber}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Sent</dt>
                    <dd>{formatDateTime(d.verification.submittedAt ?? undefined)}</dd>
                  </div>
                  <div>
                    <dt>Documents</dt>
                    <dd>
                      {d.verification.documents.length
                        ? d.verification.documents.map((doc) => (
                            <a key={doc.url} className="fksm-link" href={doc.url} target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
                              {doc.name} <ExternalLink size={12} />
                            </a>
                          ))
                        : "—"}
                    </dd>
                  </div>
                  {d.verification.reviewerNote && (
                    <div>
                      <dt>Note to employer</dt>
                      <dd>{d.verification.reviewerNote}</dd>
                    </div>
                  )}
                </dl>
              )}
            </Card>

            <Card title={`Jobs (${d.jobs.length})`} icon={<Briefcase size={18} />}>
              {d.jobs.length ? (
                <ul className="fkac-list">
                  {d.jobs.map((j) => (
                    <li key={j.id}>
                      <strong>{j.title}</strong>
                      <span>
                        {j.location || "—"} · {j.applications} application{j.applications === 1 ? "" : "s"}
                      </span>
                      <Pill tone={JOB_STATUS[j.status].tone}>{JOB_STATUS[j.status].label}</Pill>
                      {canManage && (
                        <JobActionButtons
                          status={j.status}
                          onAction={(a) =>
                            askJobAction(confirm, j.id, a, (msg) => {
                              toast("success", msg);
                              q.refetch();
                            })
                          }
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fksm-muted">No jobs yet.</p>
              )}
            </Card>

            {d.history.length > 0 && (
              <Card title="History" icon={<FileText size={18} />}>
                <ul className="fkac-list">
                  {d.history.map((h, i) => (
                    <li key={i}>
                      <strong>{h.action}</strong>
                      <span>
                        {h.reason ?? ""}
                        {h.byName ? ` · ${h.byName}` : ""}
                      </span>
                      <time>{formatDateTime(h.at)}</time>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          <div className="fksm-stack">
            <Card title="Decision" icon={<ShieldCheck size={18} />}>
              {!canManage ? (
                <p className="fksm-muted">You can view employers but not change them (needs “Manage Careers”).</p>
              ) : (
                <div className="fkac-actions">
                  {d.status !== "approved" && d.status !== "blocked" && (
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" onClick={() => act("approve")}>
                      Approve
                    </button>
                  )}
                  {(d.status === "pending" || d.status === "approved" || d.status === "not_submitted") && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => act("reject")}>
                      Reject
                    </button>
                  )}
                  {d.status === "blocked" ? (
                    <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--block" onClick={() => act("unblock")}>
                      Unblock
                    </button>
                  ) : (
                    <button type="button" className="fksm-btn fksm-btn--danger fksm-btn--block" onClick={() => act("block")}>
                      Block
                    </button>
                  )}
                </div>
              )}
            </Card>

            <Card title="Plan & payments" icon={<Wallet size={18} />}>
              <div className="fkac-billhead">
                <span>{d.plan.name}</span>
                <Pill tone={PLAN_STATE[d.plan.state].tone}>{PLAN_STATE[d.plan.state].label}</Pill>
              </div>
              <dl className="fksm-facts">
                <div>
                  <dt>Open jobs allowed</dt>
                  <dd>{d.plan.maxActiveJobs || "Unlimited"}</dd>
                </div>
                {d.plan.paidUntil && d.plan.state !== "free" && (
                  <div>
                    <dt>Paid until</dt>
                    <dd>{dateOnly(d.plan.paidUntil)}</dd>
                  </div>
                )}
                {d.plan.state === "expired" && (
                  <div>
                    <dt>Limits now</dt>
                    <dd>Free plan (not paid)</dd>
                  </div>
                )}
                {d.plan.exempt && (
                  <div>
                    <dt>Free of charge because</dt>
                    <dd>{d.plan.exemptReason || "—"}</dd>
                  </div>
                )}
              </dl>
              {canManage && (
                <div className="fkac-actions" style={{ marginTop: 10 }}>
                  {!planForm ? (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => openPlan(d)}>
                      Change plan / record a payment
                    </button>
                  ) : (
                    <div className="fkac-record">
                      <label className="fksm-field">
                        <span>Plan</span>
                        <select value={planForm.plan} onChange={(e) => setPlanForm({ ...planForm, plan: e.target.value })}>
                          {d.plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.price > 0 ? ` — ${money(p.price, d.currency)} ${perPeriod(p.periodMonths)}` : " — free"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="fksm-field">
                        <span>Paid until (if they paid cash / bank)</span>
                        <input type="date" value={planForm.until} onChange={(e) => setPlanForm({ ...planForm, until: e.target.value })} />
                      </label>
                      <label className="fksm-field">
                        <span>Amount received ({d.currency})</span>
                        <input type="number" min={0} step="0.01" value={planForm.amount} onChange={(e) => setPlanForm({ ...planForm, amount: e.target.value })} />
                      </label>
                      <label className="fksm-field">
                        <span>Note</span>
                        <input value={planForm.note} maxLength={500} placeholder="e.g. MonCash receipt #1234" onChange={(e) => setPlanForm({ ...planForm, note: e.target.value })} />
                      </label>
                      {error && <p className="fksm-notice fksm-notice--error">{error}</p>}
                      <div className="fkac-savebar">
                        <button type="button" className="fksm-btn fksm-btn--secondary" disabled={busy} onClick={() => setPlanForm(null)}>
                          Cancel
                        </button>
                        <button type="button" className="fksm-btn fksm-btn--primary" disabled={busy} onClick={savePlan}>
                          {busy ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  )}
                  {d.plan.exempt ? (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => act("unexempt")}>
                      Remove free of charge
                    </button>
                  ) : (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => act("exempt")}>
                      Give their plan free of charge
                    </button>
                  )}
                  {d.plan.paidUntil && (
                    <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--block" onClick={() => act("clear_paid")}>
                      Clear paid period
                    </button>
                  )}
                </div>
              )}
              {d.billingEntries.length > 0 && (
                <>
                  <h3 className="fkac-subhead" style={{ marginTop: 16 }}>
                    Payments & plan changes
                  </h3>
                  <ul className="fkac-list fkac-paylist">
                    {d.billingEntries.map((e, i) => (
                      <li key={i}>
                        <strong>{e.amount !== undefined ? money(e.amount, e.currency || d.currency) : e.method.replace("_", " ")}</strong>
                        <span>
                          {e.method === "stripe" ? "Card" : e.method === "manual" ? "Recorded" : ""}
                          {e.plan ? ` · ${d.plans.find((p) => p.id === e.plan)?.name ?? e.plan}` : ""}
                          {e.to ? ` · to ${dateOnly(e.to)}` : ""}
                          {e.note ? ` · ${e.note}` : ""}
                        </span>
                        <time>{dateOnly(e.at)}</time>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Card>
          </div>
        </div>
      )}
      {confirm.element}
    </>
  );
}

/* ---------------------------------------------------------------- jobs */

const JOB_ACTION_COPY: Record<JobAdminAction, { title: string; description: string; label: string; reason?: string; tone: "primary" | "danger"; done: string }> = {
  take_down: { title: "Hide this job?", description: "It leaves Careers and nobody can apply. The employer can't reopen it until you restore it.", label: "Hide", reason: "Reason", tone: "danger", done: "Job hidden." },
  restore: { title: "Restore this job?", description: "It shows on Careers again if the employer is approved and the job is open.", label: "Restore", tone: "primary", done: "Job restored." },
  delete: { title: "Delete this job for good?", description: "The job is removed permanently and can't be brought back. Applications already sent stay in the applicants' history.", label: "Delete", reason: "Reason (kept in the server log)", tone: "danger", done: "Job deleted." },
};

function askJobAction(confirm: ReturnType<typeof useConfirm>, jobId: string, action: JobAdminAction, done: (msg: string) => void) {
  const t = JOB_ACTION_COPY[action];
  confirm.ask({ title: t.title, description: t.description, confirmLabel: t.label, tone: t.tone, reasonLabel: t.reason }, async (reason) => {
    await careersAdminApi.jobAction(jobId, { action, reason });
    done(t.done);
  });
}

function JobActionButtons({ status, onAction }: { status: string; onAction: (a: JobAdminAction) => void }) {
  return (
    <span className="fkca-job-actions">
      {status === "taken_down" ? (
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => onAction("restore")}>
          Restore
        </button>
      ) : (
        <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => onAction("take_down")}>
          Hide
        </button>
      )}
      <button type="button" className="fksm-btn fksm-btn--danger fksm-btn--sm" onClick={() => onAction("delete")}>
        Delete
      </button>
    </span>
  );
}

const JOB_TABS = [
  { value: "live", label: "Live" },
  { value: "waiting", label: "Waiting for approval" },
  { value: "taken_down", label: "Hidden" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

function JobsPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const confirm = useConfirm();
  const [status, set, params] = useParam("status", "live");
  const search = params.get("search") ?? "";
  const page = Number(params.get("page")) || 1;
  const [draft, setDraft] = useState(search);
  const list = useAdminQuery(() => careersAdminApi.jobs({ status, search, page }), [status, search, page]);

  const act = (jobId: string, action: JobAdminAction) =>
    askJobAction(confirm, jobId, action, (msg) => {
      toast("success", msg);
      list.refetch();
    });

  return (
    <Card title="Jobs" icon={<Briefcase size={20} />}>
      <div className="fksm-tabs" role="tablist" aria-label="Status">
        {JOB_TABS.map((t) => (
          <button key={t.value} type="button" role="tab" aria-selected={status === t.value} className={status === t.value ? "is-active" : ""} onClick={() => set({ status: t.value })}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="fksm-filters">
        <form
          className="fksm-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: draft.trim() });
          }}
        >
          <Search size={16} aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Job title or company…" aria-label="Search jobs" />
        </form>
      </div>
      {list.loading && !list.data ? (
        <SmLoading />
      ) : list.error ? (
        <SmError message={list.error} onRetry={list.refetch} />
      ) : !list.data?.items.length ? (
        <SmEmpty icon={<Briefcase size={24} />} title="No jobs here" />
      ) : (
        <>
          <div className="fksm-table-wrap">
            <table className="fksm-table fksm-table--cards">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Place</th>
                  <th>Applications</th>
                  <th>Posted</th>
                  <th>Status</th>
                  {canManage && <th />}
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((j) => (
                  <tr key={j.id}>
                    <td>
                      <span className="fksm-subject">
                        <strong>{j.title}</strong>
                        <Link className="fksm-link" to={`/admin/careers/employers/${j.employerId}`}>
                          {j.company}
                        </Link>
                      </span>
                    </td>
                    <td>{j.location || "—"}</td>
                    <td>{j.applications}</td>
                    <td>{dateOnly(j.createdAt)}</td>
                    <td>
                      <Pill tone={JOB_STATUS[j.status].tone}>{JOB_STATUS[j.status].label}</Pill>
                      {j.takenDownReason && <small className="fksm-muted"> {j.takenDownReason}</small>}
                    </td>
                    {canManage && (
                      <td>
                        <JobActionButtons status={j.status} onAction={(a) => act(j.id, a)} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={list.data.page} hasMore={list.data.hasMore} total={list.data.total} onPage={(n) => set({ page: String(n) })} />
        </>
      )}
      {confirm.element}
    </Card>
  );
}

/* ---------------------------------------------------------------- plans */

const PERIODS = [
  { value: 0, label: "One-time (lifetime)" },
  { value: 1, label: "Every month" },
  { value: 3, label: "Every 3 months" },
  { value: 6, label: "Every 6 months" },
  { value: 12, label: "Every year" },
];

function PlansPage() {
  const toast = useAdminNotificationStore((s) => s.pushToast);
  const canManage = useCanManage();
  const q = useAdminQuery(() => careersAdminApi.plans(), []);
  const [form, setForm] = useState<PlanSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const strip = (p: PlanSettings) => JSON.stringify({ ...p, history: 0, updatedAt: 0 });
  const dirty = !!form && !!q.data && strip(form) !== strip(q.data);
  const setPlan = (id: string, patch: Partial<PlanSettings["plans"][number]>) => setForm((f) => (f ? { ...f, plans: f.plans.map((p) => (p.id === id ? { ...p, ...patch } : p)) } : f));

  async function save() {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const next = await careersAdminApi.savePlans({
        enabled: form.enabled,
        currency: form.currency.trim().toUpperCase(),
        graceDays: Number(form.graceDays),
        note: form.note,
        plans: form.plans.map((p) => ({ ...p, price: Number(p.price) || 0, periodMonths: Number(p.periodMonths) || 0, maxActiveJobs: Number(p.maxActiveJobs) || 0 })),
      });
      q.setData(next);
      setForm(next);
      toast("success", "Employer plans saved.");
    } catch (e) {
      setError(adminError(e));
    } finally {
      setSaving(false);
    }
  }

  if (q.loading && !q.data) return <SmLoading />;
  if (q.error || !form) return <SmError message={q.error ?? "Could not load plans."} onRetry={q.refetch} />;

  return (
    <div className="fkac-grid">
      <Card title="Employer plans" icon={<Wallet size={20} />} className="fkac-wide">
        <p className="fksm-muted fkac-intro">
          What employers pay to post on Fockis Careers. Employers pick a plan in Employer Center → Billing and pay through the normal Fockis checkout. Nothing is charged automatically —
          they renew from the same page. A lapsed paid plan falls back to Free after the grace period.
        </p>
        <label className="fksm-switch fkac-switchrow">
          <input type="checkbox" checked={form.enabled} disabled={!canManage} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
          <span className="fksm-switch__track" aria-hidden="true" />
          {form.enabled ? "Charging is ON — paid plans must be paid" : "Charging is OFF — every plan is free"}
        </label>
        <div className="fksm-form-grid fkac-pricegrid">
          <label className="fksm-field">
            <span>Currency</span>
            <input value={form.currency} maxLength={3} disabled={!canManage} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
          </label>
          <label className="fksm-field">
            <span>Grace period (days)</span>
            <input type="number" min={0} max={180} value={form.graceDays} disabled={!canManage} onChange={(e) => setForm({ ...form, graceDays: Number(e.target.value) })} />
          </label>
        </div>

        <div className="fkcr-plans">
          {form.plans.map((p) => (
            <div key={p.id} className="fkcr-plan">
              <label className="fksm-field">
                <span>Plan name</span>
                <input value={p.name} disabled={!canManage} maxLength={60} onChange={(e) => setPlan(p.id, { name: e.target.value })} />
              </label>
              <label className="fksm-field">
                <span>Price ({form.currency})</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={p.price}
                  disabled={!canManage || p.id === "free"}
                  onChange={(e) => setPlan(p.id, { price: e.target.value === "" ? 0 : Number(e.target.value) })}
                />
                {p.id === "free" && <small>The Free plan is always free.</small>}
              </label>
              {p.id !== "free" && (
                <label className="fksm-field">
                  <span>Each payment covers</span>
                  <select value={p.periodMonths} disabled={!canManage} onChange={(e) => setPlan(p.id, { periodMonths: Number(e.target.value) })}>
                    {PERIODS.map((x) => (
                      <option key={x.value} value={x.value}>
                        {x.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="fksm-field">
                <span>Open jobs at a time</span>
                <input type="number" min={0} value={p.maxActiveJobs} disabled={!canManage} onChange={(e) => setPlan(p.id, { maxActiveJobs: Number(e.target.value) })} />
                <small>0 = unlimited</small>
              </label>
              <label className="fksm-field">
                <span>Short description</span>
                <input value={p.description} disabled={!canManage} maxLength={300} onChange={(e) => setPlan(p.id, { description: e.target.value })} />
              </label>
              <label className="fksm-field">
                <span>What&apos;s included (one per line)</span>
                <textarea
                  rows={4}
                  value={p.features.join("\n")}
                  disabled={!canManage}
                  onChange={(e) => setPlan(p.id, { features: e.target.value.split("\n") })}
                />
              </label>
            </div>
          ))}
        </div>

        <label className="fksm-field" style={{ marginTop: 14 }}>
          <span>Note for employers (optional)</span>
          <textarea rows={2} maxLength={600} value={form.note} disabled={!canManage} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>

        {error && <p className="fksm-notice fksm-notice--error">{error}</p>}
        {canManage ? (
          <div className="fkac-savebar">
            <button type="button" className="fksm-btn fksm-btn--secondary" disabled={!dirty || saving} onClick={() => setForm(q.data)}>
              Discard
            </button>
            <button type="button" className="fksm-btn fksm-btn--primary" disabled={!dirty || saving} onClick={save}>
              {saving ? "Saving…" : "Save plans"}
            </button>
          </div>
        ) : (
          <p className="fksm-muted">You can view plans but not change them (needs “Manage Careers”).</p>
        )}
      </Card>
      <Card title="Change history" icon={<FileText size={18} />} className="fkac-wide">
        {q.data?.history.length ? (
          <ul className="fkac-list">
            {q.data.history.map((h, i) => (
              <li key={i}>
                <strong>{h.summary}</strong>
                <span>{h.byName}</span>
                <time>{formatDateTime(h.at)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="fksm-muted">No changes yet.</p>
        )}
      </Card>
    </div>
  );
}

export default function CareersAdminRoutes() {
  return (
    <Shell>
      <Routes>
        <Route index element={<OverviewPage />} />
        <Route path="employers" element={<EmployersPage />} />
        <Route path="employers/:id" element={<EmployerDetailPage />} />
        <Route path="jobs" element={<JobsPage />} />
        <Route path="plans" element={<PlansPage />} />
      </Routes>
    </Shell>
  );
}
