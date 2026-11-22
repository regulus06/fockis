/**
 * DashboardTabs.tsx
 * The Applications, Activities and Reports tabs of the Ministries dashboard.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  Inbox,
  Loader2,
  MapPin,
  Pencil,
  Send,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import {
  MINISTRY_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  categoryLabel,
  ministriesApi,
  type ActivityItem,
  type Application,
  type ChurchReportRow,
  type MinistrySummary,
  type Proposal,
} from "./ministriesApi";
import { ActivityDialog, ProposalDialog, ProposalReviewDialog } from "./MinistryDialogs";
import { Empty, Tone, fmtDate, money } from "./MinistryParts";
import { exportCsv, exportPdf, exportXlsx, safeFileName } from "./reportExport";

type Notify = (tone: "ok" | "error", text: string) => void;

const PROPOSAL_TONE: Record<string, "green" | "amber" | "red" | "blue" | "gray" | "purple"> = {
  draft: "gray",
  submitted: "blue",
  under_review: "purple",
  more_info: "amber",
  approved: "green",
  rejected: "red",
  converted: "green",
};
const APP_TONE: Record<string, "green" | "amber" | "red" | "gray"> = { pending: "amber", approved: "green", rejected: "red", withdrawn: "gray" };

/* ============================================================================
 * Applications (proposals + membership applications)
 * ========================================================================== */

export function ApplicationsTab({
  organizationId,
  canReviewProposals,
  canPropose,
  notify,
  onChanged,
  openProposal,
}: {
  organizationId: string;
  canReviewProposals: boolean;
  canPropose: boolean;
  notify: Notify;
  onChanged: () => void;
  openProposal: () => void;
}) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [apps, setApps] = useState<Application[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [reviewing, setReviewing] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const c = new AbortController();
    setError(null);
    Promise.all([ministriesApi.proposals(organizationId, {}, c.signal), ministriesApi.applications(organizationId, {}, c.signal)])
      .then(([p, a]) => {
        setProposals(p.items);
        setApps(a.items);
      })
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Applications could not be loaded.")));
    return () => c.abort();
  }, [organizationId, tick]);

  const openStates = ["draft", "submitted", "under_review", "more_info", "approved"];
  const shownProposals = (proposals ?? []).filter((p) => filter === "all" || openStates.includes(p.status));
  const shownApps = (apps ?? []).filter((a) => filter === "all" || a.status === "pending");

  async function decide(a: Application, decision: "approve" | "reject") {
    setBusy(a.id + decision);
    try {
      await ministriesApi.reviewApplication(organizationId, a.id, decision);
      notify("ok", decision === "approve" ? `${a.applicantName || "Member"} joined ${a.ministryName}.` : "Application declined.");
      reload();
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The application could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  async function withdrawApp(a: Application) {
    setBusy(a.id + "w");
    try {
      await ministriesApi.withdrawApplication(organizationId, a.id);
      notify("ok", "Application withdrawn.");
      reload();
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The application could not be withdrawn."));
    } finally {
      setBusy(null);
    }
  }

  async function withdrawProposal(p: Proposal) {
    if (!window.confirm(`Withdraw the proposal "${p.name}"?`)) return;
    setBusy(p.id + "w");
    try {
      await ministriesApi.withdrawProposal(organizationId, p.id);
      notify("ok", "Proposal withdrawn.");
      reload();
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The proposal could not be withdrawn."));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <div className="mn-alert">{error}</div>;
  if (!proposals || !apps)
    return (
      <div className="mn-panel">
        {[0, 1, 2].map((i) => (
          <div key={i} className="mn-sk" style={{ height: 54, marginBottom: 10 }} />
        ))}
      </div>
    );

  return (
    <div className="mn-stack">
      <div className="mn-seg" role="tablist" aria-label="Filter">
        <button type="button" role="tab" aria-selected={filter === "open"} className={filter === "open" ? "is-on" : ""} onClick={() => setFilter("open")}>
          Open
        </button>
        <button type="button" role="tab" aria-selected={filter === "all"} className={filter === "all" ? "is-on" : ""} onClick={() => setFilter("all")}>
          All
        </button>
      </div>

      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <ClipboardList aria-hidden="true" /> Ministry proposals
          </h3>
          {canPropose && (
            <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={openProposal}>
              <Send aria-hidden="true" /> New proposal
            </button>
          )}
        </header>
        {shownProposals.length === 0 ? (
          <Empty icon={ClipboardList} title="No proposals" text={canReviewProposals ? "Proposals submitted by members appear here for review." : "Ideas for a new ministry? Submit a proposal for review."} />
        ) : (
          <ul className="mn-list">
            {shownProposals.map((p) => (
              <li key={p.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{p.name}</b>
                  <span>
                    {categoryLabel(p.category)} · {p.isMine ? "Your proposal" : `by ${p.proposedByName || "a member"}`} · {fmtDate(p.submittedAt || p.createdAt)}
                  </span>
                  {p.reviewNote && ["more_info", "rejected"].includes(p.status) && <em>“{p.reviewNote}”</em>}
                </div>
                <Tone tone={PROPOSAL_TONE[p.status]}>{PROPOSAL_STATUS_LABELS[p.status]}</Tone>
                <div className="mn-list__actions">
                  {p.canReview && (
                    <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setReviewing(p)}>
                      Review
                    </button>
                  )}
                  {p.canEdit && (
                    <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setEditing(p)}>
                      <Pencil aria-hidden="true" /> {p.status === "more_info" ? "Answer" : "Edit"}
                    </button>
                  )}
                  {p.isMine && !["approved", "converted"].includes(p.status) && (
                    <button type="button" className="mn-iconbtn" aria-label={`Withdraw ${p.name}`} disabled={busy === p.id + "w"} onClick={() => withdrawProposal(p)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  )}
                  {p.convertedMinistryId && (
                    <Link className="mn-btn mn-btn--outline mn-btn--sm" to={`/organizations/${encodeURIComponent(organizationId)}/ministries/${encodeURIComponent(p.convertedMinistryId)}`}>
                      Open ministry
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <UsersRound aria-hidden="true" /> Membership applications
          </h3>
        </header>
        {shownApps.length === 0 ? (
          <Empty icon={Inbox} title="No applications" text="Requests to join ministries that review new members appear here." />
        ) : (
          <ul className="mn-list">
            {shownApps.map((a) => (
              <li key={a.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{a.isMine ? `You → ${a.ministryName}` : `${a.applicantName || "Member"} → ${a.ministryName}`}</b>
                  <span>
                    {fmtDate(a.createdAt, true)}
                    {a.autoApproved ? " · approved automatically" : ""}
                  </span>
                  {a.message && <em>“{a.message}”</em>}
                </div>
                <Tone tone={APP_TONE[a.status]}>{a.status[0].toUpperCase() + a.status.slice(1)}</Tone>
                <div className="mn-list__actions">
                  {a.canReview && (
                    <>
                      <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={Boolean(busy)} onClick={() => decide(a, "approve")}>
                        {busy === a.id + "approve" ? <Loader2 className="mn-spin" aria-hidden="true" /> : <Check aria-hidden="true" />} Approve
                      </button>
                      <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={Boolean(busy)} onClick={() => decide(a, "reject")}>
                        <X aria-hidden="true" /> Decline
                      </button>
                    </>
                  )}
                  {a.isMine && a.status === "pending" && (
                    <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" disabled={Boolean(busy)} onClick={() => withdrawApp(a)}>
                      Withdraw
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <ProposalDialog
          organizationId={organizationId}
          proposal={editing}
          onClose={() => setEditing(null)}
          onDone={(_, submitted) => {
            setEditing(null);
            notify("ok", submitted ? "Proposal sent for review." : "Draft saved.");
            reload();
            onChanged();
          }}
        />
      )}
      {reviewing && (
        <ProposalReviewDialog
          organizationId={organizationId}
          proposal={reviewing}
          onClose={() => setReviewing(null)}
          onDone={(msg) => {
            setReviewing(null);
            notify("ok", msg);
            reload();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * Activities (church events linked to ministries)
 * ========================================================================== */

export function ActivitiesTab({ organizationId, managed, notify, onChanged }: { organizationId: string; managed: MinistrySummary[]; notify: Notify; onChanged: () => void }) {
  const [when, setWhen] = useState<"upcoming" | "past">("upcoming");
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setItems(null);
    setError(null);
    ministriesApi
      .activities(organizationId, when, c.signal)
      .then((r) => setItems(r.items))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Activities could not be loaded.")));
    return () => c.abort();
  }, [organizationId, when, tick]);

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <div className="mn-seg" role="tablist" aria-label="When">
          <button type="button" role="tab" aria-selected={when === "upcoming"} className={when === "upcoming" ? "is-on" : ""} onClick={() => setWhen("upcoming")}>
            Upcoming
          </button>
          <button type="button" role="tab" aria-selected={when === "past"} className={when === "past" ? "is-on" : ""} onClick={() => setWhen("past")}>
            Past
          </button>
        </div>
        {managed.length > 0 && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setAdding(true)}>
            <CalendarPlus aria-hidden="true" /> New activity
          </button>
        )}
      </div>
      {error && <div className="mn-alert">{error}</div>}
      {!error && !items && (
        <div className="mn-panel">
          {[0, 1, 2].map((i) => (
            <div key={i} className="mn-sk" style={{ height: 62, marginBottom: 10 }} />
          ))}
        </div>
      )}
      {items && items.length === 0 && (
        <div className="mn-panel">
          <Empty icon={CalendarDays} title={when === "upcoming" ? "No upcoming activities" : "No past activities"} text="Ministry activities are church events linked to a ministry." />
        </div>
      )}
      {items && items.length > 0 && (
        <ul className="mn-activities">
          {items.map((a) => {
            const d = a.startsAt ? new Date(a.startsAt) : null;
            return (
              <li key={a.id}>
                <span className="mn-datebox">
                  <small>{d ? d.toLocaleDateString(undefined, { month: "short" }).toUpperCase() : ""}</small>
                  <b>{d ? d.getDate() : ""}</b>
                </span>
                <div className="mn-list__main">
                  <b>{a.title}</b>
                  <span>
                    {d ? d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : ""} · {a.ministryName}
                  </span>
                  {(a.location || a.isOnline) && (
                    <span>
                      <MapPin aria-hidden="true" /> {a.location || "Online"}
                    </span>
                  )}
                </div>
                {a.requiresRsvp && <Tone tone="blue">{a.going} going</Tone>}
                <Link className="mn-btn mn-btn--outline mn-btn--sm" to={`/organizations/${encodeURIComponent(organizationId)}/ministries/${encodeURIComponent(a.ministryId)}?tab=events`}>
                  View
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {adding && (
        <ActivityDialog
          organizationId={organizationId}
          ministries={managed}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            notify("ok", "Activity created.");
            setWhen("upcoming");
            setTick((t) => t + 1);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ============================================================================
 * Reports
 * ========================================================================== */

const REPORT_HEADERS = ["Ministry", "Category", "Status", "Members", "Leaders", "Teams", "Upcoming activities", "Activities (90 days)", "Avg. attendance %", "Annual budget", "Approved spending", "Currency"];

export function ReportsTab({ organizationId, churchName }: { organizationId: string; churchName: string }) {
  const [rows, setRows] = useState<ChurchReportRow[] | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    ministriesApi
      .churchReport(organizationId, c.signal)
      .then((r) => {
        setRows(r.items);
        setGeneratedAt(r.generatedAt);
      })
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "The report could not be loaded.")));
    return () => c.abort();
  }, [organizationId]);

  const data = useMemo(
    () =>
      (rows ?? []).map((r) => [
        r.name,
        categoryLabel(r.category),
        MINISTRY_STATUS_LABELS[r.status] ?? r.status,
        r.members,
        r.leaders,
        r.teams,
        r.upcomingActivities,
        r.activitiesLast90Days,
        r.averageAttendance,
        r.annualBudget,
        r.approvedSpending,
        r.currency,
      ]),
    [rows],
  );

  if (error) return <div className="mn-alert">{error}</div>;
  if (!rows) return <div className="mn-panel"><div className="mn-sk" style={{ height: 220 }} /></div>;

  const live = rows.filter((r) => r.status !== "archived");
  const total = (k: keyof ChurchReportRow) => live.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const file = safeFileName(`${churchName}-ministries-report`);
  const maxMembers = Math.max(1, ...live.map((r) => r.members));

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <p className="mn-muted">Generated {fmtDate(generatedAt, true)} · {live.length} ministries</p>
        <div className="mn-row">
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportCsv(file, REPORT_HEADERS, data)}>
            <Download aria-hidden="true" /> CSV
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportXlsx(file, "Ministries", REPORT_HEADERS, data)}>
            <FileSpreadsheet aria-hidden="true" /> Excel
          </button>
          <button
            type="button"
            className="mn-btn mn-btn--outline mn-btn--sm"
            onClick={() => exportPdf(`${churchName} — Ministries report`, `Generated ${fmtDate(generatedAt, true)}`, [{ headers: REPORT_HEADERS.slice(0, 9), rows: data.map((r) => r.slice(0, 9)) }])}
          >
            <FileText aria-hidden="true" /> PDF
          </button>
        </div>
      </div>

      <div className="mn-kpis">
        <div>
          <b>{total("members")}</b>
          <span>Memberships</span>
        </div>
        <div>
          <b>{total("teams")}</b>
          <span>Teams</span>
        </div>
        <div>
          <b>{total("activitiesLast90Days")}</b>
          <span>Activities (90 days)</span>
        </div>
        <div>
          <b>{total("upcomingActivities")}</b>
          <span>Upcoming</span>
        </div>
      </div>

      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>Members per ministry</h3>
        </header>
        {live.length === 0 ? (
          <Empty icon={UsersRound} title="No ministries yet" text="Create a ministry to start seeing reports." />
        ) : (
          <ul className="mn-bars">
            {[...live]
              .sort((a, b) => b.members - a.members)
              .map((r) => (
                <li key={r.id}>
                  <span>{r.name}</span>
                  <i style={{ width: `${(r.members / maxMembers) * 100}%` }} />
                  <b>{r.members}</b>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mn-panel mn-panel--flush">
        <div className="mn-tablewrap">
          <table className="mn-table">
            <thead>
              <tr>
                <th>Ministry</th>
                <th>Status</th>
                <th>Members</th>
                <th>Leaders</th>
                <th>Teams</th>
                <th>Upcoming</th>
                <th>Last 90 days</th>
                <th>Avg. attendance</th>
                <th>Approved spending</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/organizations/${encodeURIComponent(organizationId)}/ministries/${encodeURIComponent(r.id)}?tab=reports`}>{r.name}</Link>
                    <small>{categoryLabel(r.category)}</small>
                  </td>
                  <td>{MINISTRY_STATUS_LABELS[r.status] ?? r.status}</td>
                  <td>{r.members}</td>
                  <td>{r.leaders}</td>
                  <td>{r.teams}</td>
                  <td>{r.upcomingActivities}</td>
                  <td>{r.activitiesLast90Days}</td>
                  <td>{r.averageAttendance == null ? "—" : `${r.averageAttendance}%`}</td>
                  <td>
                    {money(r.approvedSpending, r.currency)}
                    {r.annualBudget != null && <small>of {money(r.annualBudget, r.currency)}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
