/**
 * GroupPanels.tsx
 * Quick-action views of the Groups & Communities dashboard:
 * Group Requests (proposals + join requests), Group Invitations,
 * Deleted Groups, Group Reports and Group Finances.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArchiveRestore, Check, ClipboardList, Download, FileSpreadsheet, FileText, HandCoins, Inbox, Loader2, Mail, Pencil, Send, Trash2, UsersRound, X } from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import { exportCsv, exportPdf, exportXlsx, safeFileName } from "../ministries/reportExport";
import { PROPOSAL_LABELS, STATUS_LABELS, categoryLabel, communitiesApi, type ChurchReport, type Invitation, type JoinRequest, type Proposal, type Transaction } from "./communitiesApi";
import { ProposalDialog, ProposalReviewDialog } from "./GroupDialogs";
import { Empty, Tone, fmtDate, groupPath, money } from "./GroupParts";

type Notify = (tone: "ok" | "error", text: string) => void;

function Loading() {
  return (
    <div className="mn-panel">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mn-sk" style={{ height: 54, marginBottom: 10 }} />
      ))}
    </div>
  );
}

const P_TONE: Record<string, "green" | "amber" | "red" | "blue" | "gray" | "purple"> = {
  draft: "gray",
  submitted: "blue",
  under_review: "purple",
  more_info: "amber",
  approved: "green",
  rejected: "red",
  converted: "green",
};

/* ============================================================================
 * Requests: proposals + join requests
 * ========================================================================== */

export function RequestsPanel({ organizationId, canPropose, notify, onChanged }: { organizationId: string; canPropose: boolean; notify: Notify; onChanged: () => void }) {
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [editing, setEditing] = useState<Proposal | "new" | null>(null);
  const [reviewing, setReviewing] = useState<Proposal | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const c = new AbortController();
    Promise.all([communitiesApi.proposals(organizationId, {}, c.signal), communitiesApi.requests(organizationId, {}, c.signal)])
      .then(([p, r]) => {
        setProposals(p.items);
        setRequests(r.items);
      })
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Requests could not be loaded.")));
    return () => c.abort();
  }, [organizationId, tick]);

  async function decide(r: JoinRequest, d: "approve" | "reject") {
    setBusy(r.id);
    try {
      await communitiesApi.reviewRequest(organizationId, r.id, d);
      notify("ok", d === "approve" ? `${r.applicantName} joined ${r.groupName}.` : "Request declined.");
      reload();
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The request could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  async function withdraw(r: JoinRequest) {
    setBusy(r.id);
    try {
      await communitiesApi.withdrawRequest(organizationId, r.id);
      notify("ok", "Request withdrawn.");
      reload();
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The request could not be withdrawn."));
    } finally {
      setBusy(null);
    }
  }

  async function withdrawProposal(p: Proposal) {
    if (!window.confirm(`Withdraw the proposal "${p.name}"?`)) return;
    try {
      await communitiesApi.withdrawProposal(organizationId, p.id);
      notify("ok", "Proposal withdrawn.");
      reload();
    } catch (err) {
      notify("error", errorMessage(err, "The proposal could not be withdrawn."));
    }
  }

  if (error) return <div className="mn-alert">{error}</div>;
  if (!proposals || !requests) return <Loading />;
  const openP = ["draft", "submitted", "under_review", "more_info", "approved"];
  const ps = proposals.filter((p) => filter === "all" || openP.includes(p.status));
  const rs = requests.filter((r) => filter === "all" || r.status === "pending");

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <div className="mn-seg" role="tablist" aria-label="Filter">
          {(["open", "all"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={filter === k} className={filter === k ? "is-on" : ""} onClick={() => setFilter(k)}>
              {k === "open" ? "Open" : "All"}
            </button>
          ))}
        </div>
        {canPropose && (
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setEditing("new")}>
            <Send aria-hidden="true" /> Propose a group
          </button>
        )}
      </div>

      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <UsersRound aria-hidden="true" /> Requests to join
          </h3>
        </header>
        {rs.length === 0 ? (
          <Empty icon={Inbox} title="No applications" text="Requests to join groups that review new members appear here." />
        ) : (
          <ul className="mn-list">
            {rs.map((r) => (
              <li key={r.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{r.isMine ? `You → ${r.groupName}` : `${r.applicantName} → ${r.groupName}`}</b>
                  <span>{fmtDate(r.createdAt, true)}</span>
                  {r.message && <em>“{r.message}”</em>}
                </div>
                <Tone tone={r.status === "pending" ? "amber" : r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "gray"}>{r.status}</Tone>
                <div className="mn-list__actions">
                  {r.canReview && (
                    <>
                      <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy === r.id} onClick={() => decide(r, "approve")}>
                        <Check aria-hidden="true" /> Approve
                      </button>
                      <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === r.id} onClick={() => decide(r, "reject")}>
                        <X aria-hidden="true" /> Reject
                      </button>
                    </>
                  )}
                  {r.isMine && r.status === "pending" && (
                    <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" disabled={busy === r.id} onClick={() => withdraw(r)}>
                      Withdraw
                    </button>
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
            <ClipboardList aria-hidden="true" /> Group proposals
          </h3>
        </header>
        {ps.length === 0 ? (
          <Empty icon={ClipboardList} title="No proposals" text="Members can propose new groups; church leadership reviews them here." />
        ) : (
          <ul className="mn-list">
            {ps.map((p) => (
              <li key={p.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{p.name}</b>
                  <span>
                    {categoryLabel(p.category)} · {p.isMine ? "your proposal" : `by ${p.proposedByName}`} · {fmtDate(p.submittedAt || p.createdAt)}
                  </span>
                  {p.reviewNote && ["more_info", "rejected"].includes(p.status) && <em>“{p.reviewNote}”</em>}
                </div>
                <Tone tone={P_TONE[p.status]}>{PROPOSAL_LABELS[p.status]}</Tone>
                <div className="mn-list__actions">
                  {p.canReview && (
                    <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setReviewing(p)}>
                      Review
                    </button>
                  )}
                  {p.canEdit && (
                    <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => setEditing(p)}>
                      <Pencil aria-hidden="true" /> {p.status === "more_info" ? "Update" : "Edit"}
                    </button>
                  )}
                  {p.isMine && !["approved", "converted"].includes(p.status) && (
                    <button type="button" className="mn-iconbtn" aria-label={`Withdraw ${p.name}`} onClick={() => withdrawProposal(p)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  )}
                  {p.convertedGroupId && (
                    <Link className="mn-btn mn-btn--outline mn-btn--sm" to={groupPath(organizationId, p.convertedGroupId)}>
                      Open group
                    </Link>
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
          proposal={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={(submitted) => {
            setEditing(null);
            notify("ok", submitted ? "Proposal sent to church leadership." : "Draft saved.");
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
 * Invitations
 * ========================================================================== */

const I_TONE: Record<string, "green" | "amber" | "red" | "gray" | "blue"> = { pending: "amber", accepted: "green", declined: "red", expired: "gray", revoked: "gray" };

export function InvitationsPanel({ organizationId, notify, onChanged }: { organizationId: string; notify: Notify; onChanged: () => void }) {
  const [data, setData] = useState<{ received: Invitation[]; sent: Invitation[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    communitiesApi
      .invitations(organizationId, {}, c.signal)
      .then(setData)
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Invitations could not be loaded.")));
    return () => c.abort();
  }, [organizationId, tick]);

  async function respond(i: Invitation, accept: boolean) {
    setBusy(i.id);
    try {
      await communitiesApi.respondInvitation(organizationId, i.id, accept);
      notify("ok", accept ? `You joined ${i.groupName}.` : "Invitation declined.");
      setTick((t) => t + 1);
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The invitation could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  async function revoke(i: Invitation) {
    setBusy(i.id);
    try {
      await communitiesApi.revokeInvitation(organizationId, i.id);
      notify("ok", "Invitation revoked.");
      setTick((t) => t + 1);
    } catch (err) {
      notify("error", errorMessage(err, "The invitation could not be revoked."));
    } finally {
      setBusy(null);
    }
  }

  if (error) return <div className="mn-alert">{error}</div>;
  if (!data) return <Loading />;
  return (
    <div className="mn-stack">
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <Mail aria-hidden="true" /> Invitations for you
          </h3>
        </header>
        {data.received.length === 0 ? (
          <Empty icon={Mail} title="No invitations" text="When a group leader invites you, it shows up here." />
        ) : (
          <ul className="mn-list">
            {data.received.map((i) => (
              <li key={i.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{i.groupName}</b>
                  <span>
                    From {i.inviterName || "a leader"} · {fmtDate(i.createdAt)} · expires {fmtDate(i.expiresAt)}
                  </span>
                  {i.message && <em>“{i.message}”</em>}
                </div>
                <Tone tone={I_TONE[i.status]}>{i.status}</Tone>
                <div className="mn-list__actions">
                  {i.status === "pending" && (
                    <>
                      <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy === i.id} onClick={() => respond(i, true)}>
                        <Check aria-hidden="true" /> Accept
                      </button>
                      <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === i.id} onClick={() => respond(i, false)}>
                        Decline
                      </button>
                    </>
                  )}
                  {i.status === "accepted" && (
                    <Link className="mn-btn mn-btn--outline mn-btn--sm" to={groupPath(organizationId, i.groupId)}>
                      Open group
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
            <Send aria-hidden="true" /> Invitations you sent
          </h3>
        </header>
        {data.sent.length === 0 ? (
          <p className="mn-muted">You haven't sent any invitations. Open a group and choose Invite Members.</p>
        ) : (
          <ul className="mn-list">
            {data.sent.map((i) => (
              <li key={i.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>
                    {i.recipientName} → {i.groupName}
                  </b>
                  <span>
                    {fmtDate(i.createdAt)} · expires {fmtDate(i.expiresAt)}
                  </span>
                </div>
                <Tone tone={I_TONE[i.status]}>{i.status}</Tone>
                <div className="mn-list__actions">
                  {i.canRevoke && (
                    <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" disabled={busy === i.id} onClick={() => revoke(i)}>
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ============================================================================
 * Deleted groups (owner / full)
 * ========================================================================== */

export function DeletedPanel({ organizationId, notify, onChanged }: { organizationId: string; notify: Notify; onChanged: () => void }) {
  const [items, setItems] = useState<{ id: string; name: string; category: string; deletedAt: string | null }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    communitiesApi
      .deleted(organizationId, c.signal)
      .then((r) => setItems(r.items))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Deleted groups could not be loaded.")));
    return () => c.abort();
  }, [organizationId, tick]);
  async function restore(id: string, name: string) {
    setBusy(id);
    try {
      await communitiesApi.softDelete(organizationId, id, true);
      notify("ok", `${name} was restored.`);
      setTick((t) => t + 1);
      onChanged();
    } catch (err) {
      notify("error", errorMessage(err, "The group could not be restored."));
    } finally {
      setBusy(null);
    }
  }
  if (error) return <div className="mn-alert">{error}</div>;
  if (!items) return <Loading />;
  return (
    <section className="mn-panel">
      <header className="mn-panel__head">
        <h3>
          <Trash2 aria-hidden="true" /> Deleted groups
        </h3>
      </header>
      {items.length === 0 ? (
        <Empty icon={Trash2} title="No deleted groups" text="Deleted groups stay here and can be restored with their members and history." />
      ) : (
        <ul className="mn-list">
          {items.map((g) => (
            <li key={g.id} className="mn-list__row">
              <div className="mn-list__main">
                <b>{g.name}</b>
                <span>
                  {categoryLabel(g.category)} · deleted {fmtDate(g.deletedAt, true)}
                </span>
              </div>
              <span />
              <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === g.id} onClick={() => restore(g.id, g.name)}>
                {busy === g.id ? <Loader2 className="mn-spin" aria-hidden="true" /> : <ArchiveRestore aria-hidden="true" />} Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============================================================================
 * Reports
 * ========================================================================== */

const HEADERS = ["Group", "Category", "Status", "Members", "New (90 days)", "Meetings (90 days)", "Activities (90 days)", "Attendance %", "Engagement %", "Contributions", "Expenses", "Balance", "Fundraising", "Currency"];

export function ReportsPanel({ organizationId, churchName }: { organizationId: string; churchName: string }) {
  const [rep, setRep] = useState<ChurchReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const c = new AbortController();
    communitiesApi
      .churchReport(organizationId, c.signal)
      .then(setRep)
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "The report could not be loaded.")));
    return () => c.abort();
  }, [organizationId]);
  const rows = useMemo(
    () =>
      (rep?.items ?? []).map((r) => [
        r.name,
        categoryLabel(r.category),
        STATUS_LABELS[r.status] ?? r.status,
        r.members,
        r.newMembers90Days,
        r.meetings90Days,
        r.activities90Days,
        r.attendanceRate,
        r.engagementRate,
        r.contributions,
        r.expenses,
        r.balance,
        r.fundraisingCollected,
        r.currency,
      ]),
    [rep],
  );
  if (error) return <div className="mn-alert">{error}</div>;
  if (!rep) return <Loading />;
  const file = safeFileName(`${churchName}-groups-report`);
  const max = Math.max(1, ...rep.items.map((i) => i.members));
  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <p className="mn-muted">Generated {fmtDate(rep.generatedAt, true)}</p>
        <div className="mn-row">
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportCsv(file, HEADERS, rows)}>
            <Download aria-hidden="true" /> CSV
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportXlsx(file, "Groups", HEADERS, rows)}>
            <FileSpreadsheet aria-hidden="true" /> Excel
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportPdf(`${churchName} — Groups & Communities report`, `Generated ${fmtDate(rep.generatedAt, true)}`, [{ headers: HEADERS.slice(0, 9), rows: rows.map((r) => r.slice(0, 9)) }])}>
            <FileText aria-hidden="true" /> PDF
          </button>
        </div>
      </div>
      <div className="mn-kpis gc-kpis6">
        {(
          [
            ["Total groups", rep.totals.groups],
            ["Active groups", rep.totals.activeGroups],
            ["Total members", rep.totals.members],
            ["New members (90d)", rep.totals.newMembers90Days],
            ["Meetings (90d)", rep.totals.meetings90Days],
            ["Activities (90d)", rep.totals.activities90Days],
          ] as const
        ).map(([l, v]) => (
          <div key={l}>
            <b>{v}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>Members per group</h3>
        </header>
        {rep.items.length === 0 ? (
          <Empty icon={UsersRound} title="No groups yet" text="Create a group to start seeing reports." />
        ) : (
          <ul className="mn-bars">
            {[...rep.items]
              .sort((a, b) => b.members - a.members)
              .map((r) => (
                <li key={r.id}>
                  <span>{r.name}</span>
                  <i style={{ width: `${(r.members / max) * 100}%` }} />
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
                <th>Group</th>
                <th>Members</th>
                <th>New (90d)</th>
                <th>Meetings</th>
                <th>Activities</th>
                <th>Attendance</th>
                <th>Engagement</th>
                <th>Contributions</th>
                <th>Expenses</th>
                <th>Fundraising</th>
              </tr>
            </thead>
            <tbody>
              {rep.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={groupPath(organizationId, r.id, "reports")}>{r.name}</Link>
                    <small>
                      {categoryLabel(r.category)} · {STATUS_LABELS[r.status] ?? r.status}
                    </small>
                  </td>
                  <td>{r.members}</td>
                  <td>{r.newMembers90Days}</td>
                  <td>{r.meetings90Days}</td>
                  <td>{r.activities90Days}</td>
                  <td>{r.attendanceRate == null ? "—" : `${r.attendanceRate}%`}</td>
                  <td>{r.engagementRate == null ? "—" : `${r.engagementRate}%`}</td>
                  <td>{r.contributions == null ? "—" : money(r.contributions, r.currency)}</td>
                  <td>{r.expenses == null ? "—" : money(r.expenses, r.currency)}</td>
                  <td>{r.fundraisingCollected == null ? "—" : money(r.fundraisingCollected, r.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * Finances: church oversight (leadership) + the viewer's own giving
 * ========================================================================== */

export function FinancesPanel({ organizationId, canOversee, notify }: { organizationId: string; canOversee: boolean; notify: Notify }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof communitiesApi.churchFinance>> | null>(null);
  const [mine, setMine] = useState<Awaited<ReturnType<typeof communitiesApi.myContributions>>["items"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    communitiesApi
      .myContributions(organizationId, c.signal)
      .then((r) => setMine(r.items))
      .catch(() => !c.signal.aborted && setMine([]));
    if (canOversee)
      communitiesApi
        .churchFinance(organizationId, c.signal)
        .then(setData)
        .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Group finances could not be loaded.")));
    return () => c.abort();
  }, [organizationId, canOversee, tick]);

  async function decide(t: Transaction, action: string) {
    let note = "";
    if (action === "reject") {
      note = window.prompt(`Why is "${t.purpose}" rejected?`) ?? "";
      if (!note.trim()) return;
    }
    setBusy(t.id);
    try {
      await communitiesApi.decide(organizationId, t.groupId!, t.id, action, note);
      notify("ok", "Fund request updated.");
      setTick((x) => x + 1);
    } catch (err) {
      notify("error", errorMessage(err, "The request could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mn-stack">
      {canOversee && error && <div className="mn-alert">{error}</div>}
      {canOversee && !data && !error && <Loading />}
      {data && (
        <>
          {data.canApprove && (
            <section className="mn-panel">
              <header className="mn-panel__head">
                <h3>
                  <HandCoins aria-hidden="true" /> Fund requests from groups
                </h3>
              </header>
              {data.fundRequests.length === 0 ? (
                <p className="mn-muted">No fund requests are waiting.</p>
              ) : (
                <ul className="mn-list">
                  {data.fundRequests.map((t) => (
                    <li key={t.id} className="mn-list__row">
                      <div className="mn-list__main">
                        <b>
                          {t.groupName}: {t.purpose || t.description.slice(0, 60)} · {money(t.amount, t.currency)}
                        </b>
                        <span>
                          Requested by {t.personName || "—"} · {fmtDate(t.createdAt)}
                        </span>
                        {t.description && <em>{t.description}</em>}
                      </div>
                      <Tone tone={t.status === "approved" ? "green" : t.status === "under_review" ? "purple" : "amber"}>{t.status.replace("_", " ")}</Tone>
                      <div className="mn-list__actions">
                        {t.status === "submitted" && (
                          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === t.id} onClick={() => decide(t, "review")}>
                            Start review
                          </button>
                        )}
                        {["submitted", "under_review"].includes(t.status) && (
                          <>
                            <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy === t.id} onClick={() => decide(t, "approve")}>
                              Approve
                            </button>
                            <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === t.id} onClick={() => decide(t, "reject")}>
                              Reject
                            </button>
                          </>
                        )}
                        {t.status === "approved" && (
                          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === t.id} onClick={() => decide(t, "mark_paid")}>
                            Mark paid
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
          <section className="mn-panel mn-panel--flush">
            <div className="mn-tablewrap">
              <table className="mn-table">
                <thead>
                  <tr>
                    <th>Group</th>
                    <th>Contributions</th>
                    <th>From church</th>
                    <th>Expenses</th>
                    <th>Balance</th>
                    <th>Contributors</th>
                    <th>Pending</th>
                    <th>Fundraising</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.map((g) => (
                    <tr key={g.groupId}>
                      <td>
                        <Link to={groupPath(organizationId, g.groupId, "finance")}>{g.groupName}</Link>
                      </td>
                      <td>{money(g.totalContributions, g.currency)}</td>
                      <td>{money(g.fundsFromChurch, g.currency)}</td>
                      <td>{money(g.totalExpenses, g.currency)}</td>
                      <td>
                        <b>{money(g.availableBalance, g.currency)}</b>
                      </td>
                      <td>{g.totalContributors}</td>
                      <td>{g.pendingRequests}</td>
                      <td>{g.fundraising.progress == null ? "—" : `${money(g.fundraising.collected, g.currency)} (${g.fundraising.progress}%)`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <HandCoins aria-hidden="true" /> My contributions
          </h3>
        </header>
        {!mine ? (
          <div className="mn-sk" style={{ height: 60 }} />
        ) : mine.length === 0 ? (
          <Empty icon={HandCoins} title="No financial transactions" text="Your contributions to groups and their receipts appear here. Only you and the group's finance team can see them." />
        ) : (
          <ul className="mn-list">
            {mine.map((t) => (
              <li key={t.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>
                    {money(t.amount, t.currency)} · {t.groupName}
                  </b>
                  <span>
                    {t.purpose} · {fmtDate(t.date)}
                    {t.receiptNumber ? ` · receipt ${t.receiptNumber}` : ""}
                  </span>
                </div>
                <Tone tone={t.status === "pending" ? "amber" : "green"}>{t.status === "recorded" ? "recorded" : t.status}</Tone>
                <span />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
