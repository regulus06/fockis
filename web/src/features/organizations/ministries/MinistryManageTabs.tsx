/**
 * MinistryManageTabs.tsx
 * -----------------------------------------------------------------------------
 * Extra tabs for a ministry's page (/organizations/:id/ministries/:ministryId):
 *   Teams · Applications · Finances · Documents · Reports · Settings
 * Rendered inside MinistryPublicPage; visibility of each tab comes from
 * GET …/ministries/:ministryId/access and every action is re-checked on the
 * server.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Archive,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  FileUp,
  HandCoins,
  History,
  Inbox,
  Loader2,
  Pencil,
  Plus,
  Power,
  Settings2,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { mediaUrl } from "../api/dashboardApi";
import { formatBytes } from "../api/mediaApi";
import { errorMessage } from "../ui/orgUi";
import {
  FINANCE_CATEGORIES,
  MINISTRY_STATUS_LABELS,
  categoryLabel,
  ministriesApi,
  type Application,
  type AuditEntry,
  type FinanceView,
  type MinistryAccess,
  type MinistryDocument,
  type MinistryMemberRow,
  type MinistryReport,
  type Team,
} from "./ministriesApi";
import { Empty, Field, Modal, PersonAvatar, Tone, fmtDate, money, useToast } from "./MinistryParts";
import MinistryWizard from "./MinistryWizard";
import { exportCsv, exportPdf, exportXlsx, safeFileName } from "./reportExport";
import "./ministries.scss";

export type ManageTabKey = "teams" | "applications" | "finances" | "documents" | "reports" | "settings";

interface Props {
  organizationId: string;
  ministryId: string;
  ministryName: string;
  access: MinistryAccess;
  onChanged: () => void;
}

function Loading() {
  return (
    <div className="mn-panel">
      {[0, 1, 2].map((i) => (
        <div key={i} className="mn-sk" style={{ height: 52, marginBottom: 10 }} />
      ))}
    </div>
  );
}

function useLoad<T>(load: (signal: AbortSignal) => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setError(null);
    load(c.signal)
      .then((d) => !c.signal.aborted && setData(d))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "This section could not be loaded.")));
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { data, error, reload: useCallback(() => setTick((t) => t + 1), []) };
}

export default function MinistryManageTab({ tab, ...props }: Props & { tab: ManageTabKey }) {
  return (
    <div className="mn-embed">
      {tab === "teams" && <TeamsTab {...props} />}
      {tab === "applications" && <ApplicationsPanel {...props} />}
      {tab === "finances" && <FinancesTab {...props} />}
      {tab === "documents" && <DocumentsTab {...props} />}
      {tab === "reports" && <ReportTab {...props} />}
      {tab === "settings" && <SettingsTab {...props} />}
    </div>
  );
}

/* ============================================================================
 * Teams
 * ========================================================================== */

function TeamsTab({ organizationId, ministryId, ministryName }: Props) {
  const toast = useToast();
  const teams = useLoad((s) => ministriesApi.teams(organizationId, ministryId, s), [organizationId, ministryId]);
  const [editing, setEditing] = useState<Team | "new" | null>(null);

  async function remove(t: Team) {
    if (!window.confirm(`Delete the team "${t.name}"? Members stay in the ministry.`)) return;
    try {
      await ministriesApi.deleteTeam(organizationId, ministryId, t.id);
      toast.show("ok", "Team deleted.");
      teams.reload();
    } catch (err) {
      toast.show("error", errorMessage(err, "The team could not be deleted."));
    }
  }

  return (
    <section className="mn-panel">
      <header className="mn-panel__head">
        <h3>
          <Users aria-hidden="true" /> {ministryName} Teams
        </h3>
        {teams.data?.canManage && (
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing("new")}>
            <Plus aria-hidden="true" /> New team
          </button>
        )}
      </header>
      {teams.error && <div className="mn-alert">{teams.error}</div>}
      {!teams.data && !teams.error && <Loading />}
      {teams.data && teams.data.items.length === 0 && (
        <Empty icon={Users} title="No teams yet" text="Split the ministry into teams — e.g. Sound, Camera and Lighting for Media." />
      )}
      {teams.data && teams.data.items.length > 0 && (
        <div className="mn-teams">
          {teams.data.items.map((t) => (
            <article key={t.id} className="mn-team">
              <header>
                <b>{t.name}</b>
                {teams.data?.canManage && (
                  <span className="mn-row">
                    <button type="button" className="mn-iconbtn" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}>
                      <Pencil aria-hidden="true" />
                    </button>
                    <button type="button" className="mn-iconbtn" aria-label={`Delete ${t.name}`} onClick={() => remove(t)}>
                      <Trash2 aria-hidden="true" />
                    </button>
                  </span>
                )}
              </header>
              {t.description && <p className="mn-muted">{t.description}</p>}
              <p>
                <small className="mn-muted">Team leader</small> <b>{t.leaderName || "—"}</b>
              </p>
              <div className="mn-chips">
                {t.members.length === 0 && <span className="mn-muted">No members yet</span>}
                {t.members.map((m) => (
                  <span key={m.membershipId} className="mn-chip">
                    {m.displayName}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <TeamDialog
          organizationId={organizationId}
          ministryId={ministryId}
          team={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            toast.show("ok", "Team saved.");
            teams.reload();
          }}
        />
      )}
      {toast.node}
    </section>
  );
}

function TeamDialog({ organizationId, ministryId, team, onClose, onDone }: { organizationId: string; ministryId: string; team: Team | null; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [leader, setLeader] = useState(team?.leaderMembershipId ?? "");
  const [members, setMembers] = useState<Set<string>>(new Set(team?.members.map((m) => m.membershipId) ?? []));
  const [roster, setRoster] = useState<MinistryMemberRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    ministriesApi
      .members(organizationId, ministryId, c.signal)
      .then((r) => setRoster(r.items))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Ministry members could not be loaded.")));
    return () => c.abort();
  }, [organizationId, ministryId]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Give the team a name.");
    setBusy(true);
    setError(null);
    const input = { name: name.trim(), description: description.trim(), leaderMembershipId: leader || null, memberIds: [...members] };
    try {
      if (team) await ministriesApi.updateTeam(organizationId, ministryId, team.id, input);
      else await ministriesApi.createTeam(organizationId, ministryId, input);
      onDone();
    } catch (err) {
      setError(errorMessage(err, "The team could not be saved."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={team ? `Edit ${team.name}` : "New team"}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="mn-team-form" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Save team
          </button>
        </>
      }
    >
      <form id="mn-team-form" className="mn-form" onSubmit={save}>
        <Field label="Team name" required>
          <input className="mn-input" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className="mn-input" rows={2} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Team leader">
          <select className="mn-input" value={leader} onChange={(e) => setLeader(e.target.value)}>
            <option value="">No leader</option>
            {(roster ?? []).map((m) => (
              <option key={m.membershipId} value={m.membershipId}>
                {m.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Members (${members.size})`} hint="Only members of this ministry can join its teams.">
          <div className="mn-checklist">
            {!roster && <div className="mn-sk" style={{ height: 80 }} />}
            {roster?.length === 0 && <p className="mn-muted">This ministry has no members yet.</p>}
            {roster?.map((m) => (
              <label key={m.membershipId} className="mn-check">
                <input
                  type="checkbox"
                  checked={members.has(m.membershipId)}
                  onChange={(e) =>
                    setMembers((s) => {
                      const n = new Set(s);
                      if (e.target.checked) n.add(m.membershipId);
                      else n.delete(m.membershipId);
                      return n;
                    })
                  }
                />
                {m.displayName}
              </label>
            ))}
          </div>
        </Field>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Applications + add / remove members
 * ========================================================================== */

function ApplicationsPanel({ organizationId, ministryId, ministryName, onChanged }: Props) {
  const toast = useToast();
  const apps = useLoad((s) => ministriesApi.applications(organizationId, { ministryId, scope: "managed" }, s), [organizationId, ministryId]);
  const roster = useLoad((s) => ministriesApi.members(organizationId, ministryId, s), [organizationId, ministryId]);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function decide(a: Application, decision: "approve" | "reject") {
    setBusy(a.id);
    try {
      await ministriesApi.reviewApplication(organizationId, a.id, decision);
      toast.show("ok", decision === "approve" ? `${a.applicantName} joined ${ministryName}.` : "Application declined.");
      apps.reload();
      roster.reload();
      onChanged();
    } catch (err) {
      toast.show("error", errorMessage(err, "The application could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  async function removeMember(m: MinistryMemberRow) {
    if (!window.confirm(`Remove ${m.displayName} from ${ministryName}?`)) return;
    setBusy(m.membershipId);
    try {
      await ministriesApi.removeMember(organizationId, ministryId, m.membershipId);
      toast.show("ok", `${m.displayName} was removed.`);
      roster.reload();
      onChanged();
    } catch (err) {
      toast.show("error", errorMessage(err, "The member could not be removed."));
    } finally {
      setBusy(null);
    }
  }

  const pending = (apps.data?.items ?? []).filter((a) => a.status === "pending");
  const handled = (apps.data?.items ?? []).filter((a) => a.status !== "pending").slice(0, 10);

  return (
    <div className="mn-stack">
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <Inbox aria-hidden="true" /> Join requests {pending.length > 0 && <Tone tone="amber">{pending.length} pending</Tone>}
          </h3>
        </header>
        {apps.error && <div className="mn-alert">{apps.error}</div>}
        {!apps.data && !apps.error && <Loading />}
        {apps.data && pending.length === 0 && <Empty icon={Inbox} title="No pending requests" text="New applications to join this ministry appear here." />}
        {pending.length > 0 && (
          <ul className="mn-list">
            {pending.map((a) => (
              <li key={a.id} className="mn-list__row">
                <div className="mn-list__main">
                  <b>{a.applicantName || "Member"}</b>
                  <span>{fmtDate(a.createdAt, true)}</span>
                  {a.message && <em>“{a.message}”</em>}
                </div>
                <span />
                <div className="mn-list__actions">
                  <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy === a.id} onClick={() => decide(a, "approve")}>
                    <Check aria-hidden="true" /> Approve
                  </button>
                  <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === a.id} onClick={() => decide(a, "reject")}>
                    <X aria-hidden="true" /> Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {handled.length > 0 && (
          <details className="mn-details">
            <summary>Recently handled</summary>
            <ul className="mn-list">
              {handled.map((a) => (
                <li key={a.id} className="mn-list__row">
                  <div className="mn-list__main">
                    <b>{a.applicantName}</b>
                    <span>{fmtDate(a.reviewedAt || a.createdAt)}</span>
                  </div>
                  <Tone tone={a.status === "approved" ? "green" : a.status === "rejected" ? "red" : "gray"}>{a.status}</Tone>
                  <span />
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <Users aria-hidden="true" /> Manage members {roster.data && <Tone tone="blue">{roster.data.items.length}</Tone>}
          </h3>
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setAdding(true)}>
            <UserPlus aria-hidden="true" /> Add member
          </button>
        </header>
        {roster.error && <div className="mn-alert">{roster.error}</div>}
        {!roster.data && !roster.error && <Loading />}
        {roster.data && roster.data.items.length === 0 && <Empty icon={Users} title="No members yet" text="Add church members or approve join requests." />}
        {roster.data && roster.data.items.length > 0 && (
          <ul className="mn-list">
            {roster.data.items.map((m) => (
              <li key={m.membershipId} className="mn-list__row">
                <div className="mn-list__main mn-list__main--person">
                  <PersonAvatar name={m.displayName} src={m.avatarUrl} size={34} />
                  <div>
                    <b>{m.displayName}</b>
                    <span>{[m.isLeader ? m.leaderTitle || "Leader" : "", m.teams.join(", ")].filter(Boolean).join(" · ") || "Member"}</span>
                  </div>
                </div>
                {m.isLeader ? <Tone tone="purple">Leader</Tone> : <span />}
                <div className="mn-list__actions">
                  <button type="button" className="mn-iconbtn" aria-label={`Remove ${m.displayName}`} disabled={busy === m.membershipId} onClick={() => removeMember(m)}>
                    <UserMinus aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding && (
        <AddMemberDialog
          organizationId={organizationId}
          ministryId={ministryId}
          onClose={() => setAdding(false)}
          onAdded={(name) => {
            toast.show("ok", `${name} was added.`);
            roster.reload();
            onChanged();
          }}
        />
      )}
      {toast.node}
    </div>
  );
}

function AddMemberDialog({ organizationId, ministryId, onClose, onAdded }: { organizationId: string; ministryId: string; onClose: () => void; onAdded: (name: string) => void }) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<{ membershipId: string; displayName: string; avatarUrl: string | null; churchRole: string }[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const c = new AbortController();
    const t = window.setTimeout(() => {
      ministriesApi
        .candidates(organizationId, ministryId, q, c.signal)
        .then((r) => setItems(r.items))
        .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Members could not be loaded.")));
    }, 200);
    return () => {
      c.abort();
      window.clearTimeout(t);
    };
  }, [organizationId, ministryId, q]);

  async function add(id: string, name: string) {
    setBusy(id);
    setError(null);
    try {
      await ministriesApi.addMember(organizationId, ministryId, id);
      setAdded((s) => new Set(s).add(id));
      onAdded(name);
    } catch (err) {
      setError(errorMessage(err, "The member could not be added."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title="Add members" subtitle="Active church members who are not in this ministry yet." onClose={onClose} footer={<button type="button" className="mn-btn mn-btn--primary" onClick={onClose}>Done</button>}>
      <div className="mn-form">
        <input className="mn-input" type="search" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        {error && <p className="mn-form-error">{error}</p>}
        {!items && <div className="mn-sk" style={{ height: 120 }} />}
        {items?.length === 0 && <p className="mn-muted">No one else to add.</p>}
        <ul className="mn-list">
          {items?.map((m) => (
            <li key={m.membershipId} className="mn-list__row">
              <div className="mn-list__main mn-list__main--person">
                <PersonAvatar name={m.displayName} src={m.avatarUrl} size={32} />
                <div>
                  <b>{m.displayName}</b>
                  <span>{m.churchRole.replace(/_/g, " ")}</span>
                </div>
              </div>
              <span />
              {added.has(m.membershipId) ? (
                <Tone tone="green">Added</Tone>
              ) : (
                <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === m.membershipId} onClick={() => add(m.membershipId, m.displayName)}>
                  {busy === m.membershipId ? <Loader2 className="mn-spin" aria-hidden="true" /> : <UserPlus aria-hidden="true" />} Add
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
}

/* ============================================================================
 * Finances
 * ========================================================================== */

const FIN_TONE = { pending: "amber", approved: "blue", paid: "green", rejected: "red", cancelled: "gray" } as const;

function FinancesTab({ organizationId, ministryId, ministryName }: Props) {
  const toast = useToast();
  const fin = useLoad<FinanceView>((s) => ministriesApi.finances(organizationId, ministryId, s), [organizationId, ministryId]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function setStatus(id: string, status: string, title: string) {
    let note = "";
    if (status === "rejected") {
      note = window.prompt(`Why is "${title}" rejected?`) ?? "";
      if (!note.trim()) return;
    }
    setBusy(id);
    try {
      await ministriesApi.financeStatus(organizationId, ministryId, id, status, note);
      toast.show("ok", `Request marked ${status}.`);
      fin.reload();
    } catch (err) {
      toast.show("error", errorMessage(err, "The request could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  const s = fin.data?.summary;
  return (
    <div className="mn-stack">
      {fin.error && <div className="mn-alert">{fin.error}</div>}
      {!fin.data && !fin.error && <Loading />}
      {fin.data && s && (
        <>
          <div className="mn-kpis">
            <div>
              <b>{money(s.annualBudget, s.currency)}</b>
              <span>Annual budget</span>
            </div>
            <div>
              <b>{money(s.committedThisYear, s.currency)}</b>
              <span>Approved this year</span>
            </div>
            <div>
              <b>{money(s.remaining, s.currency)}</b>
              <span>Remaining</span>
            </div>
            <div>
              <b>{money(s.pending, s.currency)}</b>
              <span>Waiting for approval</span>
            </div>
          </div>
          <section className="mn-panel">
            <header className="mn-panel__head">
              <h3>
                <HandCoins aria-hidden="true" /> {ministryName} finance requests
              </h3>
              {fin.data.canRequest && (
                <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setCreating(true)}>
                  <Plus aria-hidden="true" /> New request
                </button>
              )}
            </header>
            {fin.data.items.length === 0 ? (
              <Empty icon={HandCoins} title="No finance requests" text="Leaders can request money for supplies, events or equipment; church leadership approves it." />
            ) : (
              <ul className="mn-list">
                {fin.data.items.map((f) => (
                  <li key={f.id} className="mn-list__row">
                    <div className="mn-list__main">
                      <b>
                        {f.title} · {money(f.amount, f.currency)}
                      </b>
                      <span>
                        {FINANCE_CATEGORIES.find(([k]) => k === f.category)?.[1] ?? f.category} · by {f.requestedByName || "—"} · {fmtDate(f.createdAt)}
                        {f.neededBy ? ` · needed by ${fmtDate(f.neededBy)}` : ""}
                      </span>
                      {f.description && <em>{f.description}</em>}
                      {f.reviewNote && <em>Note: {f.reviewNote}</em>}
                    </div>
                    <Tone tone={FIN_TONE[f.status]}>{f.status}</Tone>
                    <div className="mn-list__actions">
                      {f.canReview && f.status === "pending" && (
                        <>
                          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy === f.id} onClick={() => setStatus(f.id, "approved", f.title)}>
                            Approve
                          </button>
                          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === f.id} onClick={() => setStatus(f.id, "rejected", f.title)}>
                            Reject
                          </button>
                        </>
                      )}
                      {f.canReview && f.status === "approved" && (
                        <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" disabled={busy === f.id} onClick={() => setStatus(f.id, "paid", f.title)}>
                          Mark paid
                        </button>
                      )}
                      {f.canCancel && (
                        <button type="button" className="mn-btn mn-btn--ghost mn-btn--sm" disabled={busy === f.id} onClick={() => setStatus(f.id, "cancelled", f.title)}>
                          Cancel
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
      {creating && fin.data && (
        <FinanceDialog
          organizationId={organizationId}
          ministryId={ministryId}
          currency={fin.data.summary.currency}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            toast.show("ok", "Request sent to church leadership.");
            fin.reload();
          }}
        />
      )}
      {toast.node}
    </div>
  );
}

function FinanceDialog({ organizationId, ministryId, currency, onClose, onDone }: { organizationId: string; ministryId: string; currency: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("supplies");
  const [amount, setAmount] = useState("");
  const [neededBy, setNeededBy] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!title.trim()) return setError("Describe what the money is for.");
    if (!Number.isFinite(n) || n <= 0) return setError("Enter an amount greater than zero.");
    setBusy(true);
    setError(null);
    try {
      await ministriesApi.requestFunds(organizationId, ministryId, { title: title.trim(), category, amount: n, neededBy: neededBy || undefined, description: description.trim() });
      onDone();
    } catch (err) {
      setError(errorMessage(err, "The request could not be sent."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="New finance request"
      subtitle="Church leadership approves or rejects it; you'll be notified."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="mn-btn mn-btn--ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" form="mn-fin-form" className="mn-btn mn-btn--primary" disabled={busy}>
            {busy && <Loader2 className="mn-spin" aria-hidden="true" />} Send request
          </button>
        </>
      }
    >
      <form id="mn-fin-form" className="mn-form" onSubmit={save}>
        <Field label="What is it for?" required>
          <input className="mn-input" value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} placeholder="New microphones for youth service" />
        </Field>
        <div className="mn-form__row">
          <Field label={`Amount (${currency})`} required>
            <input className="mn-input" type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Category">
            <select className="mn-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {FINANCE_CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Needed by">
          <input className="mn-input" type="date" value={neededBy} onChange={(e) => setNeededBy(e.target.value)} />
        </Field>
        <Field label="Details">
          <textarea className="mn-input" rows={3} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && <p className="mn-form-error">{error}</p>}
      </form>
    </Modal>
  );
}

/* ============================================================================
 * Documents
 * ========================================================================== */

function DocumentsTab({ organizationId, ministryId, ministryName, access }: Props) {
  const toast = useToast();
  const docs = useLoad((s) => ministriesApi.documents(organizationId, ministryId, s), [organizationId, ministryId]);
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (file.size > 50 * 1024 * 1024) return toast.show("error", "Documents can be up to 50 MB.");
    setBusy(true);
    try {
      await ministriesApi.uploadDocument(organizationId, ministryId, file, file.name.replace(/\.[^.]+$/, ""));
      toast.show("ok", "Document uploaded.");
      docs.reload();
    } catch (err) {
      toast.show("error", errorMessage(err, "The document could not be uploaded."));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove(d: MinistryDocument) {
    if (!window.confirm(`Remove "${d.title}" from ${ministryName}?`)) return;
    try {
      await ministriesApi.deleteDocument(organizationId, ministryId, d.id);
      toast.show("ok", "Document removed.");
      docs.reload();
    } catch (err) {
      toast.show("error", errorMessage(err, "The document could not be removed."));
    }
  }

  return (
    <section className="mn-panel">
      <header className="mn-panel__head">
        <h3>
          <FileText aria-hidden="true" /> {ministryName} Documents
        </h3>
        {docs.data?.canUpload && (
          <>
            <input ref={input} type="file" hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" disabled={busy} onClick={() => input.current?.click()}>
              {busy ? <Loader2 className="mn-spin" aria-hidden="true" /> : <FileUp aria-hidden="true" />} Upload document
            </button>
          </>
        )}
      </header>
      {docs.error && <div className="mn-alert">{docs.error}</div>}
      {!docs.data && !docs.error && <Loading />}
      {docs.data && docs.data.items.length === 0 && <Empty icon={FileText} title="No documents yet" text="Share schedules, training material and forms with the ministry. Files are kept in the church media library, visible to members only." />}
      {docs.data && docs.data.items.length > 0 && (
        <ul className="mn-list">
          {docs.data.items.map((d) => (
            <li key={d.id} className="mn-list__row">
              <div className="mn-list__main">
                <b>{d.title}</b>
                <span>
                  {[d.fileName, formatBytes(d.fileSize), fmtDate(d.createdAt)].filter(Boolean).join(" · ")}
                </span>
              </div>
              <a className="mn-btn mn-btn--outline mn-btn--sm" href={mediaUrl(d.fileUrl) ?? d.fileUrl} target="_blank" rel="noreferrer">
                <Download aria-hidden="true" /> Open
              </a>
              <div className="mn-list__actions">
                {access.canManage && (
                  <button type="button" className="mn-iconbtn" aria-label={`Remove ${d.title}`} onClick={() => remove(d)}>
                    <Trash2 aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {toast.node}
    </section>
  );
}

/* ============================================================================
 * Reports
 * ========================================================================== */

function reportRows(r: MinistryReport): (string | number | null)[][] {
  const fin = r.finances.byStatus;
  return [
    ["Members", r.members],
    ["Leaders", r.leaders],
    ["Teams", r.teams],
    ["Upcoming activities", r.upcomingActivities],
    ["Average attendance %", r.averageAttendance],
    ["Applications approved", r.applications.approved?.count ?? 0],
    ["Applications pending", r.applications.pending?.count ?? 0],
    ["Annual budget", r.finances.annualBudget],
    ["Approved spending", (fin.approved?.total ?? 0) + (fin.paid?.total ?? 0)],
    ["Pending requests", fin.pending?.total ?? 0],
    ...r.activitiesByMonth.map((m) => [`Activities — ${m.label}`, m.activities] as (string | number)[]),
  ];
}

function ReportTab({ organizationId, ministryId }: Props) {
  const rep = useLoad((s) => ministriesApi.report(organizationId, ministryId, s), [organizationId, ministryId]);
  if (rep.error) return <div className="mn-alert">{rep.error}</div>;
  if (!rep.data) return <Loading />;
  const r = rep.data;
  const file = safeFileName(`${r.ministry.name}-report`);
  const rows = reportRows(r);
  const max = Math.max(1, ...r.activitiesByMonth.map((m) => m.activities));
  const spent = (r.finances.byStatus.approved?.total ?? 0) + (r.finances.byStatus.paid?.total ?? 0);

  return (
    <div className="mn-stack">
      <div className="mn-row mn-row--between">
        <p className="mn-muted">
          {categoryLabel(r.ministry.category)} · {MINISTRY_STATUS_LABELS[r.ministry.status] ?? r.ministry.status} · generated {fmtDate(r.generatedAt, true)}
        </p>
        <div className="mn-row">
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportCsv(file, ["Measure", "Value"], rows)}>
            <Download aria-hidden="true" /> CSV
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportXlsx(file, r.ministry.name, ["Measure", "Value"], rows)}>
            <FileSpreadsheet aria-hidden="true" /> Excel
          </button>
          <button type="button" className="mn-btn mn-btn--outline mn-btn--sm" onClick={() => exportPdf(`${r.ministry.name} — Report`, `Generated ${fmtDate(r.generatedAt, true)}`, [{ headers: ["Measure", "Value"], rows }])}>
            <FileText aria-hidden="true" /> PDF
          </button>
        </div>
      </div>
      <div className="mn-kpis">
        <div>
          <b>{r.members}</b>
          <span>Members</span>
        </div>
        <div>
          <b>{r.teams}</b>
          <span>Teams</span>
        </div>
        <div>
          <b>{r.averageAttendance == null ? "—" : `${r.averageAttendance}%`}</b>
          <span>Avg. attendance</span>
        </div>
        <div>
          <b>{money(spent, r.finances.currency)}</b>
          <span>Approved spending</span>
        </div>
      </div>
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>Activities in the last 6 months</h3>
        </header>
        <ul className="mn-bars">
          {r.activitiesByMonth.map((m) => (
            <li key={m.label}>
              <span>{m.label}</span>
              <i style={{ width: `${(m.activities / max) * 100}%` }} />
              <b>{m.activities}</b>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ============================================================================
 * Settings (edit wizard, status, audit log)
 * ========================================================================== */

const AUDIT_LABELS: Record<string, string> = {
  created: "Created the ministry",
  draft_saved: "Saved as draft",
  updated: "Updated",
  archived: "Archived",
  restored: "Restored",
  member_added: "Added a member",
  member_removed: "Removed a member",
  member_joined: "Joined",
  application_approved: "Approved an application",
  application_rejected: "Declined an application",
  team_created: "Created a team",
  team_updated: "Updated a team",
  team_deleted: "Deleted a team",
  finance_requested: "Requested funds",
  finance_approved: "Approved a finance request",
  finance_rejected: "Rejected a finance request",
  finance_paid: "Marked a request paid",
  finance_cancelled: "Cancelled a finance request",
  document_uploaded: "Uploaded a document",
  document_removed: "Removed a document",
};

function SettingsTab({ organizationId, ministryId, ministryName, access, onChanged }: Props) {
  const toast = useToast();
  const audit = useLoad<{ items: AuditEntry[] }>((s) => ministriesApi.audit(organizationId, ministryId, s), [organizationId, ministryId]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const policy = useLoad((s) => ministriesApi.policy(organizationId, s), [organizationId]);

  async function setStatus(status: "active" | "inactive") {
    setBusy(true);
    try {
      await ministriesApi.update(organizationId, ministryId, { ministryStatus: status });
      toast.show("ok", status === "active" ? "Ministry activated." : "Ministry deactivated.");
      onChanged();
      audit.reload();
    } catch (err) {
      toast.show("error", errorMessage(err, "The status could not be changed."));
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm(`Archive ${ministryName}? Members and history are kept, and it can be restored from the Ministries page.`)) return;
    setBusy(true);
    try {
      await ministriesApi.archive(organizationId, ministryId);
      window.location.assign(`/organizations/${encodeURIComponent(organizationId)}/ministries`);
    } catch (err) {
      toast.show("error", errorMessage(err, "The ministry could not be archived."));
      setBusy(false);
    }
  }

  const s = access.settings;
  return (
    <div className="mn-stack">
      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <Settings2 aria-hidden="true" /> Ministry settings
          </h3>
          <button type="button" className="mn-btn mn-btn--primary mn-btn--sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" /> Edit ministry
          </button>
        </header>
        <dl className="mn-dl mn-dl--grid">
          <dt>Status</dt>
          <dd>{MINISTRY_STATUS_LABELS[access.status] ?? access.status}</dd>
          <dt>Category</dt>
          <dd>{categoryLabel(access.category)}</dd>
          <dt>Visibility</dt>
          <dd>{s.visibility === "public" ? "Public" : s.visibility === "members" ? "Members only" : "Private"}</dd>
          <dt>Joining</dt>
          <dd>
            {s.joinMode === "open" ? "Open" : s.joinMode === "application" ? `By application${s.autoApprove ? " (auto-approved)" : ""}` : "Invite only"}
            {s.maxMembers ? ` · max ${s.maxMembers}` : ""}
          </dd>
          <dt>Finances</dt>
          <dd>
            {s.annualBudget != null ? money(s.annualBudget, s.currency) : "No budget set"} · requests {s.allowFinanceRequests ? "allowed" : "off"}
          </dd>
          <dt>Contact</dt>
          <dd>{[s.contactEmail, s.contactPhone].filter(Boolean).join(" · ") || "—"}</dd>
        </dl>
      </section>

      {access.canGovern && (
        <section className="mn-panel">
          <header className="mn-panel__head">
            <h3>
              <Power aria-hidden="true" /> Status
            </h3>
          </header>
          <div className="mn-row">
            {access.status === "active" ? (
              <button type="button" className="mn-btn mn-btn--outline" disabled={busy} onClick={() => setStatus("inactive")}>
                <Power aria-hidden="true" /> Deactivate
              </button>
            ) : (
              <button type="button" className="mn-btn mn-btn--outline" disabled={busy} onClick={() => setStatus("active")}>
                <Power aria-hidden="true" /> Activate
              </button>
            )}
            <button type="button" className="mn-btn mn-btn--danger" disabled={busy} onClick={archive}>
              <Archive aria-hidden="true" /> Archive ministry
            </button>
          </div>
        </section>
      )}

      <section className="mn-panel">
        <header className="mn-panel__head">
          <h3>
            <History aria-hidden="true" /> Activity log
          </h3>
        </header>
        {audit.error && <div className="mn-alert">{audit.error}</div>}
        {!audit.data && !audit.error && <Loading />}
        {audit.data && audit.data.items.length === 0 && <p className="mn-muted">No changes recorded yet.</p>}
        {audit.data && audit.data.items.length > 0 && (
          <ol className="mn-history">
            {audit.data.items.map((a) => (
              <li key={a.id}>
                <b>
                  {a.actorName || "Someone"} — {AUDIT_LABELS[a.action] ?? a.action.replace(/_/g, " ")}
                </b>
                <span>{fmtDate(a.createdAt, true)}</span>
                {a.detail && a.action !== "updated" && <p>{a.detail}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>

      {editing && (
        <MinistryWizard
          organizationId={organizationId}
          ministryId={ministryId}
          policy={policy.data}
          canGovern={access.canGovern}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            toast.show("ok", "Ministry saved.");
            onChanged();
            audit.reload();
          }}
        />
      )}
      {toast.node}
    </div>
  );
}
