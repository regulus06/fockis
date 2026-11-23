import { useMemo, useState, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Activity, ArrowLeft, Gauge, LifeBuoy, Lock, Network, Search, ShieldAlert, ShieldCheck, UserLock, XCircle } from "lucide-react";

import { Pager, SmEmpty, SmError, SmLoading, formatDateTime, timeAgo, useAdminQuery } from "../../support/components/SmParts";
import { useAdminAccess } from "../../permissions/adminAccess";
import { PERMISSIONS } from "../../permissions/permission.constants";
import { Dialog, Metric, ReauthDialog } from "../components/SecurityControls";
import {
  needsReauth,
  securityAdminApi,
  securityError,
  type AuthRestrictionRow,
  type IncidentStatus,
  type SecurityIncident,
  type TimelineEntry,
} from "../securityAdminApi";

const P = PERMISSIONS;

/* ============================================================================
   SHARED
============================================================================ */

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  detected: "Detected",
  monitoring: "Monitoring",
  high_risk: "High risk",
  verification_pending: "Verification pending",
  restricted: "Restricted",
  verified: "Verified by owner",
  under_review: "Under review",
  resolved: "Resolved",
  expired: "Expired",
};

const KIND_LABEL: Record<SecurityIncident["kind"], string> = {
  account_failed_logins: "Failed sign-ins on an account",
  unknown_account_failed_logins: "Failed sign-ins for an unknown address",
  source_abuse: "Many failures from one source",
  suspicious_sign_in: "Unusual administrator sign-in",
};

const LEVEL_TONE: Record<string, string> = { warning: "amber", high: "red", critical: "red" };

function statusTone(status: string): string {
  if (["resolved", "verified", "approved", "lifted"].includes(status)) return "green";
  if (["expired", "closed", "rejected"].includes(status)) return "gray";
  if (["restricted", "high_risk", "verification_pending"].includes(status)) return "red";
  if (["under_review", "in_review", "monitoring"].includes(status)) return "purple";
  return "amber";
}

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`fksm-pill fksm-pill--${tone}`}>{children}</span>;
}

function humanize(value: string): string {
  return value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (!entries.length) return <p className="fksm-muted">No history yet.</p>;

  return (
    <ol className="fksec-timeline">
      {[...entries].reverse().map((entry, index) => (
        <li key={`${entry.at}-${index}`}>
          <time dateTime={entry.at}>{formatDateTime(entry.at)}</time>
          <strong>{humanize(entry.action)}</strong>
          <span className="fksm-muted">{entry.actorName || "System"}</span>
          {entry.note && <p>{entry.note}</p>}
        </li>
      ))}
    </ol>
  );
}

/** Runs an action; when the API asks for reauthentication, asks and retries. */
function useReauthAction() {
  const [pending, setPending] = useState<null | (() => Promise<void>)>(null);

  const run = async (action: () => Promise<void>, onError: (message: string) => void) => {
    try {
      await action();
    } catch (error) {
      if (needsReauth(error)) {
        setPending(() => action);
        return;
      }
      onError(securityError(error));
    }
  };

  const dialog = pending ? (
    <ReauthDialog
      reason="Confirm it's you before changing access to someone's account."
      onCancel={() => setPending(null)}
      onDone={() => {
        const action = pending;
        setPending(null);
        void action?.().catch(() => undefined);
      }}
    />
  ) : null;

  return { run, dialog };
}

function NoteDialog({
  title,
  intro,
  confirmLabel,
  requireNote,
  tone,
  extra,
  onConfirm,
  onClose,
}: {
  title: string;
  intro: ReactNode;
  confirmLabel: string;
  requireNote: boolean;
  tone?: "danger";
  extra?: ReactNode;
  onConfirm: (note: string) => Promise<void>;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(note.trim());
    } catch (err) {
      setError(securityError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title={title}
      tone={tone}
      busy={busy}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="fksm-btn fksm-btn--secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`fksm-btn ${tone === "danger" ? "fksm-btn--danger" : "fksm-btn--primary"}`}
            onClick={() => void submit()}
            disabled={busy || (requireNote && !note.trim())}
          >
            {busy ? "Saving…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="fksm-dialog__text">{intro}</div>
      {extra}
      <label className="fksm-field">
        <span>Note {requireNote ? "(required)" : "(optional)"}</span>
        <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
}

function setParam(params: URLSearchParams, setParams: (p: URLSearchParams, o?: { replace?: boolean }) => void, key: string, value: string) {
  const next = new URLSearchParams(params);
  if (value) next.set(key, value);
  else next.delete(key);
  if (key !== "page") next.delete("page");
  setParams(next, { replace: true });
}

/* ============================================================================
   INCIDENT LIST
============================================================================ */

export function SecurityIncidentsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") ?? "");

  const query = useMemo(() => {
    const out: Record<string, string | number> = { page: Number(params.get("page") ?? 1) || 1, pageSize: 25 };
    for (const key of ["status", "level", "kind", "search"]) {
      const value = params.get(key);
      if (value) out[key] = value;
    }
    const open = params.get("open") ?? "true";
    if (open !== "all") out.open = open;
    return out;
  }, [params]);

  const list = useAdminQuery(() => securityAdminApi.incidents(query), [JSON.stringify(query)]);
  const data = list.data;
  const set = (key: string, value: string) => setParam(params, setParams, key, value);

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Security Incidents</h2>
          <p>
            Opened automatically from failed sign-ins using the thresholds in{" "}
            <Link to="/admin/security/login-protection">Login Protection</Link>. Each attack is one incident that escalates; it is never duplicated per attempt.
          </p>
        </div>
      </header>

      {data && (
        <div className="fksm-stats fksec-metrics">
          <Metric label="Open — critical" value={data.openByLevel.critical ?? 0} tone="red" icon={<ShieldAlert size={18} />} />
          <Metric label="Open — high" value={data.openByLevel.high ?? 0} tone="amber" icon={<ShieldAlert size={18} />} />
          <Metric label="Open — warning" value={data.openByLevel.warning ?? 0} icon={<Activity size={18} />} />
        </div>
      )}

      <div className="fksm-card">
        <form
          className="fksm-filters fksec-filters"
          onSubmit={(event) => {
            event.preventDefault();
            set("search", search.trim());
          }}
        >
          <label className="fksm-search">
            <Search size={16} aria-hidden="true" />
            <input type="search" placeholder="Incident number or username" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search incidents" />
          </label>
          <select className="fksm-select" value={params.get("open") ?? "true"} onChange={(e) => set("open", e.target.value === "true" ? "" : e.target.value)} aria-label="Open or closed">
            <option value="true">Open</option>
            <option value="false">Closed</option>
            <option value="all">All</option>
          </select>
          <select className="fksm-select" value={params.get("level") ?? ""} onChange={(e) => set("level", e.target.value)} aria-label="Risk level">
            <option value="">Any risk level</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="warning">Warning</option>
          </select>
          <select className="fksm-select" value={params.get("status") ?? ""} onChange={(e) => set("status", e.target.value)} aria-label="Status">
            <option value="">Any status</option>
            {(Object.keys(INCIDENT_STATUS_LABEL) as IncidentStatus[]).map((status) => (
              <option key={status} value={status}>
                {INCIDENT_STATUS_LABEL[status]}
              </option>
            ))}
          </select>
          <select className="fksm-select" value={params.get("kind") ?? ""} onChange={(e) => set("kind", e.target.value)} aria-label="Type">
            <option value="">Any type</option>
            {(Object.keys(KIND_LABEL) as SecurityIncident["kind"][]).map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABEL[kind]}
              </option>
            ))}
          </select>
          <button type="submit" className="fksm-btn fksm-btn--secondary">
            Search
          </button>
        </form>

        {list.loading && !data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={() => void list.refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty icon={<ShieldCheck size={22} />} title="No incidents" text="No security incidents match these filters." />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th scope="col">Incident</th>
                    <th scope="col">Risk</th>
                    <th scope="col">Status</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Failures (window / total)</th>
                    <th scope="col">Last activity</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((incident) => (
                    <tr key={incident.id}>
                      <td>
                        <Link to={`/admin/security/incidents/${incident.id}`}>
                          <strong>{incident.number}</strong>
                        </Link>
                        <small className="fksec-code">{KIND_LABEL[incident.kind]}</small>
                      </td>
                      <td>
                        <Pill tone={LEVEL_TONE[incident.level] ?? "gray"}>{humanize(incident.level)}</Pill>
                      </td>
                      <td>
                        <Pill tone={statusTone(incident.status)}>{INCIDENT_STATUS_LABEL[incident.status]}</Pill>
                      </td>
                      <td>
                        {incident.username ? `@${incident.username}` : incident.subjectLabel}
                        {incident.privileged && <small className="fksec-sev">administrator</small>}
                      </td>
                      <td>
                        {incident.windowFailures} / {incident.totalFailures}
                      </td>
                      <td className="fksec-nowrap" title={formatDateTime(incident.lastActivityAt)}>
                        {timeAgo(incident.lastActivityAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} total={data.total} hasMore={data.page * data.pageSize < data.total} onPage={(p) => set("page", String(p))} />
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   INCIDENT DETAIL
============================================================================ */

export function SecurityIncidentDetailPage() {
  const { id = "" } = useParams();
  const access = useAdminAccess();
  const incident = useAdminQuery(() => securityAdminApi.incident(id), [id]);
  const [dialog, setDialog] = useState<"ack" | "resolve" | null>(null);
  const [liftRestriction, setLiftRestriction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reauth = useReauthAction();

  const canManage = access.can([P.SECURITY_MANAGE]);
  const canRecover = access.can([P.SECURITY_ACCOUNT_RECOVERY]);

  if (incident.loading && !incident.data) return <SmLoading />;

  if (incident.error || !incident.data) {
    return (
      <div className="fksec-page">
        <Link to="/admin/security/incidents" className="fksec-back">
          <ArrowLeft size={15} aria-hidden="true" /> Incidents
        </Link>
        <SmEmpty icon={<ShieldAlert size={22} />} title="Incident unavailable" text={incident.error ?? "This incident no longer exists or you can't open it."} />
      </div>
    );
  }

  const data = incident.data;
  const restriction = data.restriction;

  return (
    <div className="fksec-page">
      <Link to="/admin/security/incidents" className="fksec-back">
        <ArrowLeft size={15} aria-hidden="true" /> Incidents
      </Link>

      <header className="fksec-page__head">
        <div>
          <h2>
            {data.number} <Pill tone={LEVEL_TONE[data.level] ?? "gray"}>{humanize(data.level)}</Pill>{" "}
            <Pill tone={statusTone(data.status)}>{INCIDENT_STATUS_LABEL[data.status]}</Pill>
          </h2>
          <p>
            {KIND_LABEL[data.kind]} · first seen {formatDateTime(data.firstSeenAt)} · last activity {formatDateTime(data.lastActivityAt)}
          </p>
        </div>
        {data.open && canManage && (
          <div className="fksec-actions">
            {!data.acknowledgedAt && (
              <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setDialog("ack")}>
                Acknowledge
              </button>
            )}
            <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" onClick={() => setDialog("resolve")}>
              Resolve
            </button>
          </div>
        )}
      </header>

      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="fksm-stats fksec-metrics">
        <Metric label="Failures in window" value={data.windowFailures} tone="red" icon={<XCircle size={18} />} />
        <Metric label="Total failures" value={data.totalFailures} icon={<Activity size={18} />} />
        <Metric label="During lockout" value={data.blockedAttempts} tone="amber" icon={<Lock size={18} />} />
        <Metric label={data.kind === "source_abuse" ? "Accounts targeted" : "Source networks"} value={data.kind === "source_abuse" ? data.distinctTargets : data.distinctSources} tone="purple" icon={<Network size={18} />} />
        <Metric label="Risk score" value={data.riskScore} tone="purple" icon={<Gauge size={18} />} />
      </div>

      <div className="fksec-grid-2">
        <div className="fksm-card">
          <h3 className="fksec-card-title">Subject</h3>
          <dl className="fksec-dl">
            <dt>Account</dt>
            <dd>
              {data.subjectUserId ? (
                <>
                  {data.username ? `@${data.username}` : data.subjectLabel}{" "}
                  <Link to={`/admin/users/${data.subjectUserId}`}>Open user</Link>
                </>
              ) : (
                data.subjectLabel
              )}
            </dd>
            {data.privileged && (
              <>
                <dt>Account type</dt>
                <dd>Administrator</dd>
              </>
            )}
            {data.sourceIp && (
              <>
                <dt>Source address</dt>
                <dd>
                  <code>{data.sourceIp}</code> <small className="fksm-muted">Monitored only — never blocked automatically.</small>
                </dd>
              </>
            )}
            {data.successAfterFailuresAt && (
              <>
                <dt>Correct password entered</dt>
                <dd>{formatDateTime(data.successAfterFailuresAt)}</dd>
              </>
            )}
            {data.sessionsRevokedAt && (
              <>
                <dt>Sessions signed out</dt>
                <dd>{formatDateTime(data.sessionsRevokedAt)}</dd>
              </>
            )}
            {data.verifiedAt && (
              <>
                <dt>Owner verified</dt>
                <dd>{formatDateTime(data.verifiedAt)}</dd>
              </>
            )}
            {data.acknowledgedAt && (
              <>
                <dt>Acknowledged</dt>
                <dd>{formatDateTime(data.acknowledgedAt)}</dd>
              </>
            )}
            {data.resolvedAt && (
              <>
                <dt>Resolved</dt>
                <dd>
                  {formatDateTime(data.resolvedAt)}
                  {data.resolutionNote && <p>{data.resolutionNote}</p>}
                </dd>
              </>
            )}
          </dl>
        </div>

        <div className="fksm-card">
          <h3 className="fksec-card-title">Why this was flagged</h3>
          <ul className="fksec-reasons">
            {data.reasons.map((reason) => (
              <li key={reason.code}>
                {reason.label} <code>{reason.code}</code>
              </li>
            ))}
          </ul>

          <h3 className="fksec-card-title">Sign-in restriction</h3>
          {restriction ? (
            <RestrictionSummary restriction={restriction} />
          ) : (
            <p className="fksm-muted">No restriction was applied to this incident.</p>
          )}
        </div>
      </div>

      <div className="fksm-card">
        <h3 className="fksec-card-title">History</h3>
        <Timeline entries={data.timeline} />
      </div>

      {dialog === "ack" && (
        <NoteDialog
          title="Acknowledge incident"
          intro="Acknowledging tells other administrators you are looking at this incident. It stays open and keeps escalating if attempts continue."
          confirmLabel="Acknowledge"
          requireNote={false}
          onClose={() => setDialog(null)}
          onConfirm={async (note) => {
            await securityAdminApi.acknowledgeIncident(id, note);
            setDialog(null);
            await incident.refetch();
          }}
        />
      )}

      {dialog === "resolve" && (
        <NoteDialog
          title="Resolve incident"
          intro="Resolving closes this incident and its notifications. New failed sign-ins later open a new incident."
          confirmLabel="Resolve incident"
          requireNote
          extra={
            restriction?.active && canRecover ? (
              <label className="fksec-check">
                <input type="checkbox" checked={liftRestriction} onChange={(e) => setLiftRestriction(e.target.checked)} />
                Also remove the extra sign-in check for this account
              </label>
            ) : null
          }
          onClose={() => setDialog(null)}
          onConfirm={async (note) => {
            await reauth.run(
              async () => {
                await securityAdminApi.resolveIncident(id, note, liftRestriction);
                setDialog(null);
                await incident.refetch();
              },
              (message) => setError(message),
            );
          }}
        />
      )}
      {reauth.dialog}
    </div>
  );
}

function RestrictionSummary({ restriction }: { restriction: AuthRestrictionRow }) {
  return (
    <dl className="fksec-dl">
      <dt>Status</dt>
      <dd>
        <Pill tone={statusTone(restriction.status)}>{humanize(restriction.status)}</Pill>{" "}
        {restriction.level === "critical" && <Pill tone="red">Critical</Pill>}
      </dd>
      <dt>Requirement</dt>
      <dd>Verification at next sign-in{restriction.level === "critical" ? "; existing sessions were signed out" : ""}</dd>
      <dt>{restriction.active ? "Expires" : "Was due to expire"}</dt>
      <dd>{formatDateTime(restriction.expiresAt)}</dd>
      {restriction.verifiedAt && (
        <>
          <dt>Verified</dt>
          <dd>
            {formatDateTime(restriction.verifiedAt)} with {restriction.verifiedMethod === "totp" ? "authenticator app" : "email code"}
          </dd>
        </>
      )}
      {restriction.liftedAt && (
        <>
          <dt>Removed by administrator</dt>
          <dd>
            {formatDateTime(restriction.liftedAt)}
            {restriction.reviewNote && <p>{restriction.reviewNote}</p>}
          </dd>
        </>
      )}
    </dl>
  );
}

/* ============================================================================
   RESTRICTIONS
============================================================================ */

export function SecurityRestrictionsPage() {
  const [params, setParams] = useSearchParams();
  const access = useAdminAccess();
  const canRecover = access.can([P.SECURITY_ACCOUNT_RECOVERY]);
  const [review, setReview] = useState<{ row: AuthRestrictionRow; action: "lift" | "keep" } | null>(null);
  const [extend, setExtend] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const reauth = useReauthAction();

  const query = useMemo(
    () => ({ status: params.get("status") ?? "active", page: Number(params.get("page") ?? 1) || 1, pageSize: 25 }),
    [params],
  );
  const list = useAdminQuery(() => securityAdminApi.restrictions(query), [JSON.stringify(query)]);
  const data = list.data;
  const set = (key: string, value: string) => setParam(params, setParams, key, value);

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Sign-in Restrictions</h2>
          <p>
            Accounts that must verify at their next sign-in after high-risk failed sign-ins. Restrictions never block an account permanently: they expire on their own, and the owner can
            verify with an authenticator app, an email code or a recovery request.
          </p>
        </div>
      </header>

      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="fksm-card">
        <div className="fksm-filters fksec-filters">
          <select className="fksm-select" value={query.status} onChange={(e) => set("status", e.target.value === "active" ? "" : e.target.value)} aria-label="Status">
            <option value="active">Active</option>
            <option value="verified">Verified</option>
            <option value="lifted">Removed by administrator</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        {list.loading && !data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={() => void list.refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty icon={<UserLock size={22} />} title="No restrictions" text="No sign-in restrictions match this filter." />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th scope="col">Account</th>
                    <th scope="col">Level</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col">Expires</th>
                    <th scope="col">Incident</th>
                    <th scope="col">
                      <span className="fksec-sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>{row.username ? `@${row.username}` : <code>{row.userId.slice(-8)}</code>}</td>
                      <td>{row.level === "critical" ? <Pill tone="red">Critical</Pill> : <Pill tone="amber">Step-up</Pill>}</td>
                      <td>
                        <Pill tone={statusTone(row.status)}>{humanize(row.status)}</Pill>
                      </td>
                      <td className="fksec-nowrap">{formatDateTime(row.createdAt)}</td>
                      <td className="fksec-nowrap">{formatDateTime(row.expiresAt)}</td>
                      <td>{row.incidentId ? <Link to={`/admin/security/incidents/${row.incidentId}`}>Open</Link> : "—"}</td>
                      <td>
                        {row.active && canRecover && (
                          <span className="fksec-actions">
                            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setReview({ row, action: "keep" })}>
                              Keep
                            </button>
                            <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" onClick={() => setReview({ row, action: "lift" })}>
                              Remove
                            </button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} total={data.total} hasMore={data.page * data.pageSize < data.total} onPage={(p) => set("page", String(p))} />
          </>
        )}
      </div>

      {review && (
        <NoteDialog
          title={review.action === "lift" ? "Remove sign-in restriction" : "Keep sign-in restriction"}
          intro={
            review.action === "lift"
              ? "The account will be able to sign in with just its usual password (and two-factor, if on). Only do this after confirming the owner's identity."
              : "Record your review. You can also extend how long the restriction stays in place."
          }
          confirmLabel={review.action === "lift" ? "Remove restriction" : "Save review"}
          requireNote
          tone={review.action === "lift" ? "danger" : undefined}
          extra={
            review.action === "keep" ? (
              <label className="fksm-field">
                <span>Extend by (hours, 0–168)</span>
                <input type="number" min={0} max={168} value={extend} onChange={(e) => setExtend(Math.max(0, Math.min(168, Number(e.target.value) || 0)))} />
              </label>
            ) : null
          }
          onClose={() => setReview(null)}
          onConfirm={async (note) => {
            const current = review;
            await reauth.run(
              async () => {
                await securityAdminApi.reviewRestriction(current.row.id, current.action, note, extend);
                setReview(null);
                await list.refetch();
              },
              (message) => setError(message),
            );
          }}
        />
      )}
      {reauth.dialog}
    </div>
  );
}

/* ============================================================================
   RECOVERY CASES
============================================================================ */

const RECOVERY_LABEL: Record<string, string> = {
  open: "Open",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  closed: "Closed",
};

export function RecoveryCasesPage() {
  const [params, setParams] = useSearchParams();
  const query = useMemo(
    () => ({ status: params.get("status") ?? "active", page: Number(params.get("page") ?? 1) || 1, pageSize: 25 }),
    [params],
  );
  const list = useAdminQuery(() => securityAdminApi.recoveryCases(query), [JSON.stringify(query)]);
  const data = list.data;
  const set = (key: string, value: string) => setParam(params, setParams, key, value);

  return (
    <div className="fksec-page">
      <header className="fksec-page__head">
        <div>
          <h2>Account Recovery Cases</h2>
          <p>Requests from people who can't get back into their account. Nothing changes on the account until a reviewer decides.</p>
        </div>
      </header>

      <div className="fksm-card">
        <div className="fksm-filters fksec-filters">
          <select className="fksm-select" value={query.status} onChange={(e) => set("status", e.target.value === "active" ? "" : e.target.value)} aria-label="Status">
            <option value="active">Open and in review</option>
            {Object.entries(RECOVERY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {list.loading && !data ? (
          <SmLoading />
        ) : list.error ? (
          <SmError message={list.error} onRetry={() => void list.refetch()} />
        ) : !data?.items.length ? (
          <SmEmpty icon={<LifeBuoy size={22} />} title="No recovery cases" text="No recovery cases match this filter." />
        ) : (
          <>
            <div className="fksm-table-wrap">
              <table className="fksm-table">
                <thead>
                  <tr>
                    <th scope="col">Case</th>
                    <th scope="col">Account</th>
                    <th scope="col">Source</th>
                    <th scope="col">Status</th>
                    <th scope="col">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/admin/security/recovery/${row.id}`}>
                          <strong>{row.number}</strong>
                        </Link>
                      </td>
                      <td>{row.username ? `@${row.username}` : <code>{row.userId.slice(-8)}</code>}</td>
                      <td>{row.source === "login_verification" ? "Sign-in verification" : "Recovery form"}</td>
                      <td>
                        <Pill tone={statusTone(row.status)}>{RECOVERY_LABEL[row.status] ?? row.status}</Pill>
                      </td>
                      <td className="fksec-nowrap" title={formatDateTime(row.createdAt)}>
                        {timeAgo(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={data.page} total={data.total} hasMore={data.page * data.pageSize < data.total} onPage={(p) => set("page", String(p))} />
          </>
        )}
      </div>
    </div>
  );
}

export function RecoveryCaseDetailPage() {
  const { id = "" } = useParams();
  const detail = useAdminQuery(() => securityAdminApi.recoveryCase(id), [id]);
  const [dialog, setDialog] = useState<"start_review" | "approve" | "reject" | "close" | null>(null);
  const [revoke, setRevoke] = useState(true);
  const [requirePassword, setRequirePassword] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reauth = useReauthAction();

  if (detail.loading && !detail.data) return <SmLoading />;

  if (detail.error || !detail.data) {
    return (
      <div className="fksec-page">
        <Link to="/admin/security/recovery" className="fksec-back">
          <ArrowLeft size={15} aria-hidden="true" /> Recovery cases
        </Link>
        <SmEmpty icon={<LifeBuoy size={22} />} title="Case unavailable" text={detail.error ?? "This recovery case no longer exists or you can't open it."} />
      </div>
    );
  }

  const data = detail.data;
  const active = data.status === "open" || data.status === "in_review";

  const decide = (action: NonNullable<typeof dialog>) => async (note: string) => {
    await reauth.run(
      async () => {
        await securityAdminApi.reviewRecovery(id, {
          action,
          note,
          ...(action === "approve" ? { revokeSessions: revoke, requirePasswordChange: requirePassword } : {}),
        });
        setDialog(null);
        await detail.refetch();
      },
      (message) => setError(message),
    );
  };

  return (
    <div className="fksec-page">
      <Link to="/admin/security/recovery" className="fksec-back">
        <ArrowLeft size={15} aria-hidden="true" /> Recovery cases
      </Link>

      <header className="fksec-page__head">
        <div>
          <h2>
            {data.number} <Pill tone={statusTone(data.status)}>{RECOVERY_LABEL[data.status] ?? data.status}</Pill>
          </h2>
          <p>
            Opened {formatDateTime(data.createdAt)} from {data.source === "login_verification" ? "the sign-in verification step (the password was correct)" : "the public recovery form"}.
          </p>
        </div>
        {active && (
          <div className="fksec-actions">
            {data.status === "open" && (
              <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setDialog("start_review")}>
                Start review
              </button>
            )}
            <button type="button" className="fksm-btn fksm-btn--secondary fksm-btn--sm" onClick={() => setDialog("reject")}>
              Reject
            </button>
            <button type="button" className="fksm-btn fksm-btn--primary fksm-btn--sm" onClick={() => setDialog("approve")}>
              Approve
            </button>
          </div>
        )}
      </header>

      {error && (
        <p className="fksm-notice fksm-notice--error" role="alert">
          {error}
        </p>
      )}

      <div className="fksec-grid-2">
        <div className="fksm-card">
          <h3 className="fksec-card-title">Request</h3>
          <p className="fksec-message">{data.message || <span className="fksm-muted">No message.</span>}</p>
          <dl className="fksec-dl">
            <dt>Request device</dt>
            <dd>{data.requestDevice ?? "—"}</dd>
            <dt>Request address</dt>
            <dd>{data.requestIp ? <code>{data.requestIp}</code> : "—"}</dd>
            {data.incidentId && (
              <>
                <dt>Related incident</dt>
                <dd>
                  <Link to={`/admin/security/incidents/${data.incidentId}`}>Open incident</Link>
                </dd>
              </>
            )}
          </dl>
          <p className="fksm-muted">Verify the requester through a channel you already trust before approving. Contact details changed recently may belong to an attacker.</p>
        </div>

        <div className="fksm-card">
          <h3 className="fksec-card-title">Account</h3>
          {data.account ? (
            <dl className="fksec-dl">
              <dt>Username</dt>
              <dd>
                @{data.account.username} <Link to={`/admin/users/${data.account.id}`}>Open user</Link>
              </dd>
              <dt>Role</dt>
              <dd>{data.account.role}</dd>
              <dt>Two-factor</dt>
              <dd>{data.account.mfaEnabled ? "On" : "Off"}</dd>
              <dt>Status</dt>
              <dd>{data.account.isActive ? "Active" : "Deactivated"}</dd>
              <dt>Locked</dt>
              <dd>{data.account.lockedUntil ? `Until ${formatDateTime(data.account.lockedUntil)}` : "No"}</dd>
              <dt>Sign-in restriction</dt>
              <dd>{data.activeRestriction ? `Verification required until ${formatDateTime(data.activeRestriction.expiresAt)}` : "None"}</dd>
            </dl>
          ) : (
            <p className="fksm-muted">The account no longer exists.</p>
          )}
        </div>
      </div>

      <div className="fksm-card">
        <h3 className="fksec-card-title">History</h3>
        <Timeline entries={data.timeline} />
      </div>

      {dialog && (
        <NoteDialog
          title={dialog === "approve" ? "Approve recovery" : dialog === "reject" ? "Reject recovery" : dialog === "close" ? "Close case" : "Start review"}
          intro={
            dialog === "approve"
              ? "Approving removes the sign-in restriction and any lockout so the owner can sign in again. The owner is notified."
              : dialog === "reject"
                ? "The account is not changed. The owner is told the request couldn't be approved."
                : "You'll be recorded as the reviewer of this case."
          }
          confirmLabel={dialog === "approve" ? "Approve" : dialog === "reject" ? "Reject" : "Start review"}
          requireNote={dialog === "approve" || dialog === "reject"}
          tone={dialog === "approve" ? "danger" : undefined}
          extra={
            dialog === "approve" ? (
              <div className="fksec-checks">
                <label className="fksec-check">
                  <input type="checkbox" checked={revoke} onChange={(e) => setRevoke(e.target.checked)} />
                  Sign the account out everywhere
                </label>
                <label className="fksec-check">
                  <input type="checkbox" checked={requirePassword} onChange={(e) => setRequirePassword(e.target.checked)} />
                  Require a new password at next sign-in
                </label>
              </div>
            ) : null
          }
          onClose={() => setDialog(null)}
          onConfirm={decide(dialog)}
        />
      )}
      {reauth.dialog}
    </div>
  );
}
