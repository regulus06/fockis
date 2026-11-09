/**
 * OrganizationMyHistoryPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/my-history
 *
 * A member's own history in one organization: membership dates and changes,
 * groups and departments, attendance, and visit requests.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import OrganizationHeader from "../components/OrganizationHeader";
import OrganizationSidebar from "../components/OrganizationSidebar";
import { ChurchAuthError } from "../api/organizationApi";
import { VISIT_STATUS_LABELS, memberHistoryApi, visitsApi, type MemberHistory } from "../api/visitsApi";
import { useSidebarViewer } from "../hooks/useSidebarViewer";
import "../styles/OrganizationForms.scss";

const STATUS_LABELS: Record<string, string> = {
  pending: "Request sent",
  active: "Active member",
  inactive: "Inactive",
  archived: "Archived",
};

const title = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

function day(value: string | null): string {
  return value ? new Date(value).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—";
}

function visitDay(value: string): string {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function historyLine(h: { status: string | null; role: string | null; note: string | null }): string {
  if (h.note === "requested") return "Asked to join";
  if (h.note === "joined") return "Joined";
  const parts: string[] = [];
  if (h.status) parts.push(STATUS_LABELS[h.status] ?? title(h.status));
  if (h.role) parts.push(`Role: ${title(h.role)}`);
  return parts.join(" · ") || "Updated";
}

export default function OrganizationMyHistoryPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const viewer = useSidebarViewer(organizationId);
  const navigate = useNavigate();
  const [data, setData] = useState<MemberHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    memberHistoryApi
      .mine(organizationId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ChurchAuthError) {
          navigate("/login?returnTo=" + encodeURIComponent(window.location.pathname));
          return;
        }
        setError(err instanceof Error ? err.message : "Your history could not be loaded.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [organizationId, navigate]);

  async function cancelVisit(id: string) {
    setCancelling(id);
    try {
      const updated = await visitsApi.cancelMine(id);
      setData((d) => (d ? { ...d, visits: d.visits.map((v) => (v.id === id ? { ...v, ...updated } : v)) } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : "The visit could not be cancelled.");
    } finally {
      setCancelling(null);
    }
  }

  const m = data?.membership;
  const orgPath = `/organizations/${encodeURIComponent(organizationId)}`;

  return (
    <div className="church-page fko-page">
      <OrganizationHeader organizationId={organizationId} organizationName={data?.organization.name} />
      <div className="church-container church-org-layout">
        <OrganizationSidebar organizationId={organizationId} organizationName={data?.organization.name} viewer={viewer} />
        <main className="church-org-content fko-admin">
          <div className="fko-admin__head">
            <div>
              <span className="fko-eyebrow">{data?.organization.name ?? "Member portal"}</span>
              <h1 className="fko-title">My history</h1>
            </div>
          </div>

          {error && (
            <p className="fko-error" role="alert">
              {error}
            </p>
          )}
          {loading && <div className="fko-card fko-muted">Loading…</div>}

          {!loading && data && !m && (
            <div className="fko-card fko-empty">
              <strong>You're not a member of {data.organization.name} yet.</strong>
              <div className="fko-actions">
                <Link to={`${orgPath}/join`} className="fko-btn fko-btn--primary">
                  Ask to join
                </Link>
              </div>
            </div>
          )}

          {!loading && data && m && (
            <>
              <section className="fko-stats">
                <div className="fko-card fko-stat">
                  <span>Status</span>
                  <strong>{STATUS_LABELS[m.status] ?? title(m.status)}</strong>
                </div>
                <div className="fko-card fko-stat">
                  <span>Member since</span>
                  <strong>{m.joinedAt ? day(m.joinedAt) : "Waiting for approval"}</strong>
                </div>
                <div className="fko-card fko-stat">
                  <span>Check-ins</span>
                  <strong>{data.attendanceSummary.checkIns}</strong>
                </div>
                <div className="fko-card fko-stat">
                  <span>Role</span>
                  <strong>{title(m.role)}</strong>
                </div>
              </section>

              <section className="fko-card">
                <h2 className="fko-subtitle">Membership</h2>
                <ol className="fko-timeline">
                  {[...m.history].reverse().map((h, i) => (
                    <li key={i}>
                      <span>{day(h.at)}</span>
                      <span>{historyLine(h)}</span>
                    </li>
                  ))}
                  {m.history.length === 0 && (
                    <li>
                      <span>{day(m.requestedAt)}</span>
                      <span>Asked to join</span>
                    </li>
                  )}
                </ol>
                {m.domain && <p className="fko-hint">Your member address: {m.domain}</p>}
              </section>

              <section className="fko-grid2">
                <div className="fko-card">
                  <h2 className="fko-subtitle">Groups</h2>
                  {data.groups.length ? (
                    <ul className="fko-chips">
                      {data.groups.map((g) => (
                        <li key={g.id}>{g.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fko-muted">
                      Not in any group yet. <Link to={`${orgPath}/groups`}>Browse groups</Link>
                    </p>
                  )}
                </div>
                <div className="fko-card">
                  <h2 className="fko-subtitle">Departments</h2>
                  {data.departments.length ? (
                    <ul className="fko-chips">
                      {data.departments.map((d) => (
                        <li key={d.id}>{d.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="fko-muted">Not in any department yet.</p>
                  )}
                </div>
              </section>

              <section className="fko-card">
                <h2 className="fko-subtitle">Attendance</h2>
                {data.attendance.length ? (
                  <ol className="fko-timeline">
                    {data.attendance.map((a) => (
                      <li key={a.id}>
                        <span>{day(a.occurredAt)}</span>
                        <span>
                          {a.kind === "check_in" ? "Checked in" : "Reported absent"}
                          {a.eventTitle ? ` · ${a.eventTitle}` : ""}
                          {a.kind === "absence_report" && a.reasonCategory ? ` (${title(a.reasonCategory)})` : ""}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="fko-muted">No attendance recorded yet.</p>
                )}
              </section>
            </>
          )}

          {!loading && data && (
            <section className="fko-card">
              <h2 className="fko-subtitle">My visit requests</h2>
              {data.visits.length ? (
                <ul className="fko-list fko-list--plain">
                  {data.visits.map((v) => (
                    <li key={v.id} className="fko-visit__row fko-visit__row--static">
                      <span className="fko-visit__date">
                        <strong>{visitDay(v.visitDate)}</strong>
                        <span>{v.visitTime || "Any time"}</span>
                      </span>
                      <span className="fko-visit__who">
                        <span>{v.branchName || data.organization.name}</span>
                      </span>
                      <span className={`fko-pill fko-pill--${v.status}`}>{VISIT_STATUS_LABELS[v.status]}</span>
                      {["new", "contacted", "scheduled"].includes(v.status) && (
                        <button type="button" className="fko-btn fko-btn--secondary" disabled={cancelling === v.id} onClick={() => cancelVisit(v.id)}>
                          Cancel
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="fko-muted">
                  None yet. <Link to={`${orgPath}/visit`}>Plan a visit</Link>
                </p>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
