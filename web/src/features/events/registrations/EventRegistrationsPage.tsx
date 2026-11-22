/* ============================================================================
   ORGANIZER — EVENT REGISTRATIONS  /events/:eventId/registrations
   Statistics, a searchable / filterable / sortable table, details, approve /
   reject / cancel / move from waitlist, CSV & Excel export, a printable
   attendee list and a link to QR check-in. Organizer and check-in staff only
   (enforced by the API).
============================================================================ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  CircleCheck,
  CircleDollarSign,
  Clock,
  Download,
  FileSpreadsheet,
  Gift,
  ListOrdered,
  LoaderCircle,
  Printer,
  QrCode,
  Search,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import EventsShell from "../components/EventsShell";
import EventEmptyState from "../components/EventEmptyState";
import { EventsApiError } from "../services/eventsApi";
import {
  ATTENDANCE_LABEL,
  eventWhen,
  formatMoney,
  PAYMENT_LABEL,
  registrationApi,
  STATUS_LABEL,
  type OrganizerList,
  type OrganizerQuery,
  type Registration,
} from "./registrationApi";
import "./registration.scss";

const PAGE = 25;

function dateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function answerText(v: string | string[] | boolean | null) {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return v;
}

export default function EventRegistrationsPage() {
  const { eventId = "" } = useParams<{ eventId: string }>();
  const [params, setParams] = useSearchParams();
  const query: OrganizerQuery = useMemo(
    () => ({
      q: params.get("q") ?? "",
      status: params.get("status") ?? "",
      payment: params.get("payment") ?? "",
      attendance: params.get("attendance") ?? "",
      ticket: params.get("ticket") ?? "",
      sort: params.get("sort") ?? "-registeredAt",
      page: Number(params.get("page") ?? 1) || 1,
      limit: PAGE,
    }),
    [params],
  );
  const [data, setData] = useState<OrganizerList | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(query.q ?? "");
  const [selected, setSelected] = useState<Registration | null>(null);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<{ reg: Registration; action: "reject" | "cancel" } | null>(null);
  const [printRows, setPrintRows] = useState<Registration[] | null>(null);
  const [reload, setReload] = useState(0);

  const set = useCallback(
    (patch: Partial<Record<keyof OrganizerQuery, string>>) => {
      const next = new URLSearchParams(params);
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
      if (!("page" in patch)) next.delete("page");
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    registrationApi
      .list(eventId, query, controller.signal)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((caught) => {
        if (controller.signal.aborted) return;
        setError({ message: caught instanceof Error ? caught.message : "Unable to load registrations.", status: caught instanceof EventsApiError ? caught.status : undefined });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [eventId, query, reload]);

  // Debounced search box.
  useEffect(() => {
    const t = window.setTimeout(() => {
      if ((query.q ?? "") !== search.trim()) set({ q: search.trim() });
    }, 350);
    return () => window.clearTimeout(t);
  }, [search, query.q, set]);

  useEffect(() => {
    if (!printRows) return;
    const t = window.setTimeout(() => {
      window.print();
      setPrintRows(null);
    }, 50);
    return () => window.clearTimeout(t);
  }, [printRows]);

  async function act(reg: Registration, action: "approve" | "reject" | "cancel" | "promote", why?: string) {
    setBusy(`${reg.id}:${action}`);
    setNotice("");
    try {
      const updated = await registrationApi.setStatus(reg.id, action, why);
      setNotice(`${updated.attendeeName}: ${STATUS_LABEL[updated.status]}.`);
      if (selected?.id === reg.id) setSelected({ ...selected, ...updated });
      setConfirm(null);
      setReason("");
      setReload((n) => n + 1);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "The change couldn't be saved.");
    } finally {
      setBusy("");
    }
  }

  async function checkIn(reg: Registration, attendeeIndex?: number, undo = false) {
    setBusy(`${reg.id}:checkin`);
    try {
      const res = await registrationApi.checkIn(eventId, { registrationId: reg.id, attendeeIndex, undo });
      setNotice(res.message);
      setSelected(res.registration);
      setReload((n) => n + 1);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Check-in failed.");
    } finally {
      setBusy("");
    }
  }

  async function exportAs(format: "csv" | "xlsx") {
    setBusy(`export:${format}`);
    try {
      await registrationApi.exportFile(eventId, format, query);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Export failed.");
    } finally {
      setBusy("");
    }
  }

  async function printList() {
    setBusy("print");
    try {
      const rows: Registration[] = [];
      for (let page = 1; page <= 50; page++) {
        const res = await registrationApi.list(eventId, { ...query, page, limit: 200 });
        rows.push(...res.items);
        if (rows.length >= res.total) break;
      }
      setPrintRows(rows);
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Unable to prepare the list.");
    } finally {
      setBusy("");
    }
  }

  const stats = data?.stats;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  const when = data ? eventWhen(data.event) : null;

  const tiles = stats
    ? [
        { label: "Total registrations", value: stats.total, icon: Users, tone: "blue", filter: "" },
        { label: "Confirmed attendees", value: stats.confirmed, sub: `${stats.confirmedPeople} people${stats.capacity ? ` of ${stats.capacity}` : ""}`, icon: CircleCheck, tone: "green", filter: "confirmed" },
        { label: "Pending", value: stats.pending, icon: Clock, tone: "gold", filter: "pending_payment,pending_approval" },
        { label: "Cancelled", value: stats.cancelled, icon: Ban, tone: "rose", filter: "cancelled,rejected" },
        { label: "Waitlisted", value: stats.waitlisted, icon: ListOrdered, tone: "violet", filter: "waitlisted" },
        { label: "Paid", value: stats.paid, sub: stats.revenue ? formatMoney(stats.revenue, stats.currency) : undefined, icon: CircleDollarSign, tone: "cyan", filter: "" },
        { label: "Free", value: stats.free, icon: Gift, tone: "blue", filter: "" },
        { label: "Actual attendance", value: stats.checkedInPeople, sub: stats.confirmedPeople ? `${Math.round((stats.checkedInPeople / stats.confirmedPeople) * 100)}% checked in` : undefined, icon: UserCheck, tone: "green", filter: "" },
      ]
    : [];

  return (
    <EventsShell hideTabs>
      <div className="fkr fkr--org">
        <Link to={`/events/${encodeURIComponent(eventId)}`} className="fkr-back fkr-noprint">
          <ArrowLeft size={18} aria-hidden="true" /> Back to Event
        </Link>

        {error && (
          <EventEmptyState
            tone={error.status === 403 || error.status === 404 ? "default" : "error"}
            title={error.status === 403 ? "Only the organizer can see registrations" : "Registrations couldn't load"}
            body={error.message}
            action={
              <Link to={`/events/${encodeURIComponent(eventId)}`} className="fke-btn fke-btn--primary">
                Back to event
              </Link>
            }
          />
        )}

        {data && (
          <>
            <header className="fkr-orghead fkr-noprint">
              <div>
                <span className="fkr-eyebrow">Event registrations</span>
                <h1>{data.event.title}</h1>
                {when && (
                  <p>
                    {when.day} · {when.time}
                  </p>
                )}
              </div>
              <div className="fkr-orghead__actions">
                <Link to={`/events/${encodeURIComponent(eventId)}/check-in`} className="fkr-btn fkr-btn--primary">
                  <QrCode size={18} aria-hidden="true" /> QR Check-in
                </Link>
                <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => void exportAs("csv")} disabled={Boolean(busy)}>
                  <Download size={18} aria-hidden="true" /> CSV
                </button>
                <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => void exportAs("xlsx")} disabled={Boolean(busy)}>
                  <FileSpreadsheet size={18} aria-hidden="true" /> Excel
                </button>
                <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => void printList()} disabled={Boolean(busy)}>
                  {busy === "print" ? <LoaderCircle className="fkr-spin" size={18} aria-hidden="true" /> : <Printer size={18} aria-hidden="true" />} Print list
                </button>
              </div>
            </header>

            <div className="fkr-stats fkr-noprint">
              {tiles.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={`fkr-stat fkr-stat--${t.tone} ${t.filter && query.status === t.filter ? "is-on" : ""}`}
                  onClick={() => t.filter && set({ status: query.status === t.filter ? "" : t.filter })}
                  disabled={!t.filter}
                >
                  <span className="fkr-stat__icon" aria-hidden="true">
                    <t.icon size={20} />
                  </span>
                  <span className="fkr-stat__value">{t.value}</span>
                  <span className="fkr-stat__label">{t.label}</span>
                  {t.sub && <small>{t.sub}</small>}
                </button>
              ))}
            </div>

            {notice && (
              <div className="fkr-alert fkr-alert--info fkr-noprint" role="status">
                {notice}
              </div>
            )}

            <section className="fkr-card fkr-tablecard fkr-noprint" aria-label="Registrations">
              <div className="fkr-toolbar">
                <label className="fkr-input-wrap fkr-search">
                  <Search size={18} aria-hidden="true" />
                  <input className="fkr-input" type="search" placeholder="Search name, email, phone or ID" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search registrations" />
                </label>
                <select className="fkr-input" value={query.status} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
                  <option value="">All statuses</option>
                  {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                  <option value="pending_payment,pending_approval">Pending (all)</option>
                </select>
                <select className="fkr-input" value={query.payment} onChange={(e) => set({ payment: e.target.value })} aria-label="Payment">
                  <option value="">All payments</option>
                  {(Object.keys(PAYMENT_LABEL) as (keyof typeof PAYMENT_LABEL)[]).map((s) => (
                    <option key={s} value={s}>
                      {PAYMENT_LABEL[s]}
                    </option>
                  ))}
                </select>
                <select className="fkr-input" value={query.attendance} onChange={(e) => set({ attendance: e.target.value })} aria-label="Attendance">
                  <option value="">All attendance</option>
                  {(Object.keys(ATTENDANCE_LABEL) as (keyof typeof ATTENDANCE_LABEL)[]).map((s) => (
                    <option key={s} value={s}>
                      {ATTENDANCE_LABEL[s]}
                    </option>
                  ))}
                </select>
                {data.ticketTypes.length > 1 && (
                  <select className="fkr-input" value={query.ticket} onChange={(e) => set({ ticket: e.target.value })} aria-label="Ticket type">
                    <option value="">All tickets</option>
                    {data.ticketTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
                <select className="fkr-input" value={query.sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
                  <option value="-registeredAt">Newest first</option>
                  <option value="registeredAt">Oldest first</option>
                  <option value="name">Name A–Z</option>
                  <option value="-name">Name Z–A</option>
                  <option value="status">Status</option>
                  <option value="amount">Amount</option>
                </select>
              </div>

              <div className="fkr-tablewrap" aria-busy={loading || undefined}>
                <table className="fkr-table">
                  <thead>
                    <tr>
                      <th scope="col">Attendee</th>
                      <th scope="col">Registration ID</th>
                      <th scope="col">Registered</th>
                      <th scope="col">People</th>
                      <th scope="col">Ticket</th>
                      <th scope="col">Payment</th>
                      <th scope="col">Status</th>
                      <th scope="col">Attendance</th>
                      <th scope="col">
                        <span className="fkr-sr">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r.id} className={r.needsAttention ? "is-attention" : ""}>
                        <td>
                          <button type="button" className="fkr-person" onClick={() => setSelected(r)}>
                            <strong>{r.attendeeName}</strong>
                            <small>{r.attendeeEmail}</small>
                          </button>
                        </td>
                        <td className="fkr-mono">{r.registrationNumber}</td>
                        <td>{dateTime(r.registeredAt)}</td>
                        <td>{r.attendeeCount}</td>
                        <td>{r.ticketName}</td>
                        <td>
                          <span className={`fkr-pill fkr-pill--${r.paymentStatus}`}>{PAYMENT_LABEL[r.paymentStatus]}</span>
                          {r.totalAmount > 0 && <small className="fkr-block">{formatMoney(r.totalAmount, r.currency)}</small>}
                        </td>
                        <td>
                          <span className={`fkr-status fkr-status--${r.status}`}>{STATUS_LABEL[r.status]}</span>
                          {r.needsAttention && <small className="fkr-block fkr-warn">Paid — needs a place or refund</small>}
                        </td>
                        <td>{ATTENDANCE_LABEL[r.attendanceStatus]}</td>
                        <td className="fkr-rowactions">
                          {data.isOwner && r.status === "pending_approval" && (
                            <>
                              <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--primary" disabled={Boolean(busy)} onClick={() => void act(r, "approve")}>
                                Approve
                              </button>
                              <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--outline" disabled={Boolean(busy)} onClick={() => setConfirm({ reg: r, action: "reject" })}>
                                Reject
                              </button>
                            </>
                          )}
                          {data.isOwner && r.status === "waitlisted" && (
                            <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--primary" disabled={Boolean(busy)} onClick={() => void act(r, "promote")}>
                              Move in
                            </button>
                          )}
                          {r.status === "confirmed" && r.attendanceStatus !== "checked_in" && (
                            <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--outline" disabled={Boolean(busy)} onClick={() => void checkIn(r)}>
                              Check in
                            </button>
                          )}
                          <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--ghost" onClick={() => setSelected(r)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && data.items.length === 0 && <p className="fkr-empty">No registrations match these filters yet.</p>}
                {loading && (
                  <p className="fkr-empty" role="status">
                    <LoaderCircle className="fkr-spin" size={18} aria-hidden="true" /> Loading…
                  </p>
                )}
              </div>

              {pages > 1 && (
                <nav className="fkr-pager" aria-label="Pages">
                  <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--outline" disabled={(query.page ?? 1) <= 1} onClick={() => set({ page: String((query.page ?? 1) - 1) })}>
                    Previous
                  </button>
                  <span>
                    Page {query.page} of {pages} · {data.total} registrations
                  </span>
                  <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--outline" disabled={(query.page ?? 1) >= pages} onClick={() => set({ page: String((query.page ?? 1) + 1) })}>
                    Next
                  </button>
                </nav>
              )}
            </section>

            {/* ---------------------------------------------------------------- details */}
            {selected && (
              <div className="fkr-drawer fkr-noprint" role="dialog" aria-modal="true" aria-label={`Registration ${selected.registrationNumber}`}>
                <button type="button" className="fkr-drawer__scrim" aria-label="Close" onClick={() => setSelected(null)} />
                <div className="fkr-drawer__panel">
                  <header className="fkr-drawer__head">
                    <div>
                      <h2>{selected.attendeeName}</h2>
                      <span className="fkr-mono">{selected.registrationNumber}</span>
                    </div>
                    <button type="button" className="fkr-iconbtn" onClick={() => setSelected(null)} aria-label="Close">
                      <X size={20} />
                    </button>
                  </header>
                  <div className="fkr-drawer__body">
                    <p>
                      <span className={`fkr-status fkr-status--${selected.status}`}>{STATUS_LABEL[selected.status]}</span>{" "}
                      <span className={`fkr-pill fkr-pill--${selected.paymentStatus}`}>{PAYMENT_LABEL[selected.paymentStatus]}</span>
                    </p>
                    <dl className="fkr-dl">
                      <div>
                        <dt>Email</dt>
                        <dd>
                          <a href={`mailto:${selected.attendeeEmail}`}>{selected.attendeeEmail}</a>
                        </dd>
                      </div>
                      <div>
                        <dt>Phone</dt>
                        <dd>{selected.phone || "—"}</dd>
                      </div>
                      <div>
                        <dt>Ticket</dt>
                        <dd>
                          {selected.attendeeCount} × {selected.ticketName} · {selected.totalAmount > 0 ? formatMoney(selected.totalAmount, selected.currency) : "Free"}
                        </dd>
                      </div>
                      <div>
                        <dt>Attending</dt>
                        <dd>{selected.attendanceMode === "online" ? "Online" : "In person"}</dd>
                      </div>
                      <div>
                        <dt>Registered</dt>
                        <dd>{dateTime(selected.registeredAt)}</dd>
                      </div>
                      {selected.isGuest && (
                        <div>
                          <dt>Account</dt>
                          <dd>Guest (no Fockis account)</dd>
                        </div>
                      )}
                      {selected.accessibilityNeeds && (
                        <div>
                          <dt>Accessibility</dt>
                          <dd>{selected.accessibilityNeeds}</dd>
                        </div>
                      )}
                      {selected.specialRequests && (
                        <div>
                          <dt>Special requests</dt>
                          <dd>{selected.specialRequests}</dd>
                        </div>
                      )}
                      {selected.answers.map((a) => (
                        <div key={a.questionId}>
                          <dt>{a.label}</dt>
                          <dd>{answerText(a.value)}</dd>
                        </div>
                      ))}
                      {selected.cancellationReason && (
                        <div>
                          <dt>Reason</dt>
                          <dd>{selected.cancellationReason}</dd>
                        </div>
                      )}
                    </dl>

                    {selected.status === "confirmed" && (
                      <div className="fkr-checkin-list">
                        <h3>Check-in</h3>
                        {data.settings.individualCheckIn && selected.attendeeCount > 1 ? (
                          selected.attendees.map((a, i) => (
                            <div key={i} className="fkr-checkin-row">
                              <span>
                                {a.name}
                                <small>{a.checkedInAt ? `Checked in ${dateTime(a.checkedInAt)}` : "Not checked in"}</small>
                              </span>
                              <button type="button" className={`fkr-btn fkr-btn--sm ${a.checkedInAt ? "fkr-btn--ghost" : "fkr-btn--primary"}`} disabled={Boolean(busy)} onClick={() => void checkIn(selected, i, Boolean(a.checkedInAt))}>
                                {a.checkedInAt ? "Undo" : "Check in"}
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="fkr-checkin-row">
                            <span>
                              {ATTENDANCE_LABEL[selected.attendanceStatus]}
                              {selected.checkedInAt && <small>{dateTime(selected.checkedInAt)}</small>}
                            </span>
                            <button
                              type="button"
                              className={`fkr-btn fkr-btn--sm ${selected.attendanceStatus === "checked_in" ? "fkr-btn--ghost" : "fkr-btn--primary"}`}
                              disabled={Boolean(busy)}
                              onClick={() => void checkIn(selected, undefined, selected.attendanceStatus === "checked_in")}
                            >
                              {selected.attendanceStatus === "checked_in" ? "Undo check-in" : "Check in"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {data.isOwner && ["confirmed", "pending_payment", "pending_approval", "waitlisted"].includes(selected.status) && (
                    <footer className="fkr-drawer__foot">
                      {selected.status === "pending_approval" && (
                        <button type="button" className="fkr-btn fkr-btn--primary" disabled={Boolean(busy)} onClick={() => void act(selected, "approve")}>
                          Approve
                        </button>
                      )}
                      {selected.status === "waitlisted" && (
                        <button type="button" className="fkr-btn fkr-btn--primary" disabled={Boolean(busy)} onClick={() => void act(selected, "promote")}>
                          Move in from waitlist
                        </button>
                      )}
                      {(selected.status === "pending_approval" || selected.status === "waitlisted") && (
                        <button type="button" className="fkr-btn fkr-btn--outline" disabled={Boolean(busy)} onClick={() => setConfirm({ reg: selected, action: "reject" })}>
                          Reject
                        </button>
                      )}
                      <button type="button" className="fkr-btn fkr-btn--danger-ghost" disabled={Boolean(busy)} onClick={() => setConfirm({ reg: selected, action: "cancel" })}>
                        Cancel registration
                      </button>
                    </footer>
                  )}
                </div>
              </div>
            )}

            {confirm && (
              <div className="fkr-modal fkr-noprint" role="alertdialog" aria-modal="true" aria-label={confirm.action === "reject" ? "Reject registration" : "Cancel registration"}>
                <div className="fkr-modal__card">
                  <h2>{confirm.action === "reject" ? "Reject this registration?" : "Cancel this registration?"}</h2>
                  <p>
                    {confirm.reg.attendeeName} ({confirm.reg.registrationNumber}) will be notified by email
                    {confirm.reg.paymentStatus === "paid" ? ". They paid — handle any refund according to your cancellation policy" : ""}.
                  </p>
                  <label className="fkr-field">
                    <span className="fkr-label">Reason (optional, included in the email)</span>
                    <textarea className="fkr-input" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  <div className="fkr-actions">
                    <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => setConfirm(null)} disabled={Boolean(busy)}>
                      Keep
                    </button>
                    <button type="button" className="fkr-btn fkr-btn--danger" onClick={() => void act(confirm.reg, confirm.action, reason)} disabled={Boolean(busy)}>
                      {busy ? "Saving…" : confirm.action === "reject" ? "Reject" : "Cancel registration"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------------- print */}
            {printRows && (
              <div className="fkr-print">
                <h1>{data.event.title} — Attendee list</h1>
                <p>
                  {when?.day} · {when?.time} · {printRows.length} registrations
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>✓</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Registration ID</th>
                      <th>People</th>
                      <th>Ticket</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.attendanceStatus === "checked_in" ? "✓" : "☐"}</td>
                        <td>{r.attendeeName}</td>
                        <td>{r.attendeeEmail}</td>
                        <td>{r.registrationNumber}</td>
                        <td>{r.attendeeCount}</td>
                        <td>{r.ticketName}</td>
                        <td>{STATUS_LABEL[r.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </EventsShell>
  );
}
