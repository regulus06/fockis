/**
 * OrganizationVisitRequestsPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/admin/visits
 *
 * The organization's inbox of "Plan a visit" requests. Admins with
 * "view members" can read them; "update member" can change status and notes.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import OrganizationHeader from "../components/OrganizationHeader";
import OrganizationSidebar from "../components/OrganizationSidebar";
import {
  VISIT_STATUS_LABELS,
  visitsApi,
  type AdminVisitRequest,
  type VisitStatus,
} from "../api/visitsApi";
import { useSidebarViewer } from "../hooks/useSidebarViewer";
import "../styles/OrganizationForms.scss";

const TABS: (VisitStatus | "")[] = ["", "new", "contacted", "scheduled", "visited", "cancelled", "no_show"];
const NEXT: Record<VisitStatus, VisitStatus[]> = {
  new: ["contacted", "scheduled", "cancelled"],
  contacted: ["scheduled", "visited", "cancelled"],
  scheduled: ["visited", "no_show", "cancelled"],
  visited: [],
  cancelled: ["new"],
  no_show: ["contacted"],
};

function longDate(value: string): string {
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function when(value: string | null): string {
  return value ? new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function OrganizationVisitRequestsPage(): React.JSX.Element {
  const { organizationId = "" } = useParams<{ organizationId: string }>();
  const viewer = useSidebarViewer(organizationId);

  const [tab, setTab] = useState<VisitStatus | "">("new");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AdminVisitRequest[]>([]);
  const [counts, setCounts] = useState<Partial<Record<VisitStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await visitsApi.listForAdmin(organizationId, { status: tab, q: q.trim() });
      setItems(res.items);
      setCounts(res.counts);
    } catch (err) {
      setError(errorText(err, "Visit requests could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [organizationId, tab, q]);

  useEffect(() => {
    const id = window.setTimeout(load, q ? 300 : 0);
    return () => window.clearTimeout(id);
  }, [load, q]);

  async function change(v: AdminVisitRequest, body: { status?: VisitStatus; staffNote?: string; note?: string }) {
    setBusy(v.id);
    setError(null);
    try {
      const updated = await visitsApi.update(organizationId, v.id, body);
      setItems((list) => list.map((x) => (x.id === v.id ? updated : x)));
      if (body.status) load();
    } catch (err) {
      setError(errorText(err, "The request could not be updated."));
    } finally {
      setBusy(null);
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  return (
    <div className="church-page fko-page">
      <OrganizationHeader organizationId={organizationId} />
      <div className="church-container church-org-layout">
        <OrganizationSidebar organizationId={organizationId} viewer={viewer} />
        <main className="church-org-content fko-admin">
          <div className="fko-admin__head">
            <div>
              <span className="fko-eyebrow">Admin</span>
              <h1 className="fko-title">Visit requests</h1>
              <p className="fko-muted">People who used "Plan a visit" on your page. Contact them, then mark how it went.</p>
            </div>
            <Link to={`/organizations/${encodeURIComponent(organizationId)}/visit`} className="fko-btn fko-btn--secondary" target="_blank" rel="noreferrer">
              Open the visit form
            </Link>
          </div>

          <div className="fko-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t || "all"}
                type="button"
                role="tab"
                aria-selected={tab === t}
                className={"fko-tab" + (tab === t ? " is-active" : "")}
                onClick={() => setTab(t)}
              >
                {t ? VISIT_STATUS_LABELS[t] : "All"}
                <span className="fko-tab__count">{t ? counts[t] ?? 0 : total}</span>
              </button>
            ))}
          </div>

          <input
            className="church-input fko-search"
            type="search"
            placeholder="Search by name, email or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {error && (
            <p className="fko-error" role="alert">
              {error}
            </p>
          )}

          {loading ? (
            <div className="fko-card fko-muted">Loading…</div>
          ) : items.length === 0 ? (
            <div className="fko-card fko-empty">
              <strong>No visit requests{tab ? ` marked "${VISIT_STATUS_LABELS[tab]}"` : ""}.</strong>
              <span className="fko-muted">Share your page so people can plan a visit.</span>
            </div>
          ) : (
            <ul className="fko-list">
              {items.map((v) => {
                const isOpen = open === v.id;
                return (
                  <li key={v.id} className="fko-card fko-visit">
                    <button type="button" className="fko-visit__row" onClick={() => setOpen(isOpen ? null : v.id)} aria-expanded={isOpen}>
                      <span className="fko-visit__date">
                        <strong>{longDate(v.visitDate)}</strong>
                        <span>{v.visitTime || "Any time"}</span>
                      </span>
                      <span className="fko-visit__who">
                        <strong>
                          {v.firstName} {v.lastName}
                        </strong>
                        <span>
                          {v.adults} adult{v.adults === 1 ? "" : "s"}
                          {v.children ? ` · ${v.children} child${v.children === 1 ? "" : "ren"}` : ""}
                          {v.branchName ? ` · ${v.branchName}` : ""}
                        </span>
                      </span>
                      <span className={`fko-pill fko-pill--${v.status}`}>{VISIT_STATUS_LABELS[v.status]}</span>
                    </button>

                    {isOpen && (
                      <div className="fko-visit__body">
                        <dl className="fko-summary">
                          {v.email && (
                            <div>
                              <dt>Email</dt>
                              <dd>
                                <a href={`mailto:${v.email}`}>{v.email}</a>
                              </dd>
                            </div>
                          )}
                          {v.phone && (
                            <div>
                              <dt>Phone</dt>
                              <dd>
                                <a href={`tel:${v.phone}`}>{v.phone}</a>
                              </dd>
                            </div>
                          )}
                          {v.accessibility && (
                            <div>
                              <dt>Accessibility</dt>
                              <dd>{v.accessibility}</dd>
                            </div>
                          )}
                          {v.notes && (
                            <div>
                              <dt>Message</dt>
                              <dd>{v.notes}</dd>
                            </div>
                          )}
                          <div>
                            <dt>Sent</dt>
                            <dd>
                              {when(v.createdAt)}
                              {v.userId ? " · has a Fockis account" : ""}
                            </dd>
                          </div>
                        </dl>

                        <div className="fko-actions">
                          {NEXT[v.status].map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={"fko-btn " + (s === "cancelled" || s === "no_show" ? "fko-btn--secondary" : "fko-btn--primary")}
                              disabled={busy === v.id}
                              onClick={() => change(v, { status: s })}
                            >
                              Mark {VISIT_STATUS_LABELS[s].toLowerCase()}
                            </button>
                          ))}
                        </div>

                        <label className="fko-field">
                          <span>Private note (only your admins see it)</span>
                          <textarea
                            className="church-input"
                            rows={2}
                            maxLength={2000}
                            value={notes[v.id] ?? v.staffNote}
                            onChange={(e) => setNotes((n) => ({ ...n, [v.id]: e.target.value }))}
                          />
                        </label>
                        {(notes[v.id] ?? v.staffNote) !== v.staffNote && (
                          <div className="fko-actions">
                            <button type="button" className="fko-btn fko-btn--primary" disabled={busy === v.id} onClick={() => change(v, { staffNote: notes[v.id] ?? "" })}>
                              Save note
                            </button>
                          </div>
                        )}

                        {v.history.length > 0 && (
                          <ol className="fko-timeline">
                            {[...v.history].reverse().map((h, i) => (
                              <li key={i}>
                                <span>{when(h.at)}</span>
                                <span>
                                  {h.status ? VISIT_STATUS_LABELS[h.status] : ""}
                                  {h.note ? (h.status ? " — " : "") + h.note : ""}
                                  {h.byName ? ` · ${h.byName}` : ""}
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </main>
      </div>
    </div>
  );
}
