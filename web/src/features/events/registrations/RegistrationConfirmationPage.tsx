/* ============================================================================
   REGISTRATION CONFIRMATION / TICKET — /events/registrations/:registrationId
   Shown right after registering and whenever the ticket is opened again
   (My Events, notification, email link). Guests open it with ?key=.
============================================================================ */

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  CircleAlert,
  CircleCheck,
  Clock,
  Hourglass,
  ListOrdered,
  LoaderCircle,
  MapPin,
  Printer,
  Ticket,
  Video,
  XCircle,
} from "lucide-react";

import EventsShell from "../components/EventsShell";
import EventCover from "../components/EventCover";
import EventEmptyState from "../components/EventEmptyState";
import EventShareButton from "../components/EventShareButton";
import EventSkeleton from "../components/EventSkeleton";
import { EventsApiError, getToken } from "../services/eventsApi";
import type { EventCategory } from "../types/event.types";
import { downloadIcs } from "../utils/eventCalendar";
import { absoluteEventUrl } from "../utils/eventMedia";
import RegistrationPayment from "./RegistrationPayment";
import LiveTicket from "./LiveTicket";
import {
  ATTENDANCE_LABEL,
  eventWhen,
  formatMoney,
  googleCalendarUrl,
  PAYMENT_LABEL,
  registrationApi,
  STATUS_LABEL,
  type RegistrationDetail,
} from "./registrationApi";
import "./registration.scss";

function storedKey(id: string): string | null {
  try {
    return localStorage.getItem(`fke-reg-key:${id}`);
  } catch {
    return null;
  }
}

const HEAD: Record<string, { icon: typeof CircleCheck; title: string; tone: string; body: (r: RegistrationDetail) => string }> = {
  confirmed: {
    icon: CircleCheck,
    title: "You're registered!",
    tone: "ok",
    body: (r) =>
      r.paymentStatus === "paid"
        ? `Payment of ${formatMoney(r.totalAmount, r.currency)} received. A confirmation was sent to ${r.attendeeEmail}.`
        : `No payment was required. A confirmation was sent to ${r.attendeeEmail}.`,
  },
  pending_payment: { icon: Hourglass, title: "Complete your payment", tone: "warn", body: () => "Your places are reserved. Pay to confirm your registration." },
  pending_approval: { icon: Hourglass, title: "Registration received", tone: "warn", body: () => "The organizer reviews registrations. We'll email you when it's approved." },
  waitlisted: { icon: ListOrdered, title: "You're on the waitlist", tone: "info", body: () => "The event is full. We'll email you if a place opens." },
  cancelled: { icon: XCircle, title: "Registration cancelled", tone: "muted", body: (r) => r.cancellationReason || "This registration is no longer active." },
  rejected: { icon: XCircle, title: "Registration not approved", tone: "muted", body: (r) => r.cancellationReason || "The organizer didn't approve this registration." },
  expired: { icon: CircleAlert, title: "Reservation expired", tone: "muted", body: () => "Payment wasn't completed in time. You can register again." },
};

export default function RegistrationConfirmationPage() {
  const { registrationId = "" } = useParams<{ registrationId: string }>();
  const [params] = useSearchParams();
  const location = useLocation();
  const justRegistered = Boolean((location.state as { justRegistered?: boolean } | null)?.justRegistered);
  const key = params.get("key") || storedKey(registrationId);
  const [reg, setReg] = useState<RegistrationDetail | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [joinState, setJoinState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });

  const load = useCallback(
    (signal?: AbortSignal) => {
      registrationApi
        .get(registrationId, key, signal)
        .then(setReg)
        .catch((caught) => {
          if (signal?.aborted) return;
          setError({ message: caught instanceof Error ? caught.message : "Unable to load the registration.", status: caught instanceof EventsApiError ? caught.status : undefined });
        });
    },
    [registrationId, key],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function cancel() {
    if (!reg) return;
    setBusy(true);
    try {
      setReg(await registrationApi.cancel(reg.id, undefined, key));
      setConfirmCancel(false);
      setNotice("Your registration was cancelled.");
    } catch (caught) {
      setNotice(caught instanceof Error ? caught.message : "Unable to cancel.");
    } finally {
      setBusy(false);
    }
  }

  async function join() {
    if (!reg?.event) return;
    setJoinState({ busy: true, message: "" });
    try {
      const { url } = await registrationApi.join(reg.event.id);
      window.open(url, "_blank", "noopener,noreferrer");
      setJoinState({ busy: false, message: "" });
    } catch (caught) {
      setJoinState({ busy: false, message: caught instanceof Error ? caught.message : "The meeting isn't available yet." });
    }
  }

  const ev = reg?.event ?? null;
  const head = reg ? HEAD[reg.status] ?? HEAD.confirmed : null;
  const when = ev ? eventWhen(ev) : null;
  const online = Boolean(ev && (ev.isOnline || reg?.attendanceMode === "online"));
  const signedIn = Boolean(getToken());

  return (
    <EventsShell hideTabs>
      <div className="fkr fkr--ticket">
        <Link to={ev ? `/events/${ev.id}` : "/events"} className="fkr-back fkr-noprint">
          <ArrowLeft size={18} aria-hidden="true" /> Back to Event
        </Link>

        {!reg && !error && <EventSkeleton variant="details" />}
        {error && (
          <EventEmptyState
            tone={error.status === 404 ? "default" : "error"}
            title={error.status === 404 ? "Registration not found" : "This registration couldn't load"}
            body={error.status === 404 ? "Sign in with the account you registered with, or open the link from your confirmation email." : error.message}
            action={
              <Link to="/events/my-events?tab=registered" className="fke-btn fke-btn--primary">
                My Events
              </Link>
            }
          />
        )}

        {reg && head && ev && when && (
          <>
            <header className={`fkr-success fkr-success--${head.tone}`} role={justRegistered ? "status" : undefined}>
              <span className="fkr-success__icon" aria-hidden="true">
                <head.icon size={34} />
              </span>
              <div>
                <h1>{head.title}</h1>
                <p>{head.body(reg)}</p>
              </div>
            </header>

            {notice && (
              <div className="fkr-alert fkr-alert--info fkr-noprint" role="status">
                {notice}
              </div>
            )}

            <div className="fkr-layout">
              <div className="fkr-main">
                {reg.status === "pending_payment" && reg.canPay && (
                  <RegistrationPayment
                    registrationId={reg.id}
                    payment={null}
                    amount={reg.totalAmount}
                    currency={reg.currency}
                    holdExpiresAt={reg.holdExpiresAt}
                    billingName={reg.attendeeName}
                    billingEmail={reg.attendeeEmail}
                    onPaid={(fresh) => {
                      setReg(fresh);
                      setNotice("Payment received — you're registered!");
                    }}
                  />
                )}

                <section className="fkr-card fkr-ticketcard" aria-label="Your ticket">
                  <div className="fkr-ticketcard__banner">
                    <EventCover event={{ ...ev, category: "conference" as EventCategory, coverMediaType: ev.coverMediaType === "video" ? "video" : "image" }} />
                    <span className="fkr-ticketcard__scrim" aria-hidden="true" />
                    <div className="fkr-ticketcard__title">
                      <span className={`fkr-status fkr-status--${reg.status}`}>{STATUS_LABEL[reg.status]}</span>
                      <h2>{ev.title}</h2>
                    </div>
                  </div>

                  <div className="fkr-ticketcard__body">
                    <div className="fkr-ticketcard__info">
                      <dl className="fkr-dl">
                        <div>
                          <dt>Registration ID</dt>
                          <dd className="fkr-mono">{reg.registrationNumber}</dd>
                        </div>
                        <div>
                          <dt>Attendee</dt>
                          <dd>
                            {reg.attendeeName}
                            <small>{reg.attendeeEmail}</small>
                          </dd>
                        </div>
                        <div>
                          <dt>Tickets</dt>
                          <dd>
                            {reg.attendeeCount} × {reg.ticketName}
                            {reg.attendeeCount > 1 && <small>{reg.attendees.map((a) => a.name).join(", ")}</small>}
                          </dd>
                        </div>
                        <div>
                          <dt>Total</dt>
                          <dd>
                            {reg.totalAmount > 0 ? formatMoney(reg.totalAmount, reg.currency) : "Free"}
                            <small>{PAYMENT_LABEL[reg.paymentStatus]}{reg.totalAmount === 0 ? " · no payment required" : ""}</small>
                          </dd>
                        </div>
                      </dl>
                      <ul className="fkr-facts">
                        <li>
                          <CalendarDays size={20} aria-hidden="true" />
                          <span>{when.day}</span>
                        </li>
                        <li>
                          <Clock size={20} aria-hidden="true" />
                          <span>{when.time}</span>
                        </li>
                        <li>
                          {online ? <Video size={20} aria-hidden="true" /> : <MapPin size={20} aria-hidden="true" />}
                          <span>
                            {ev.isOnline ? (
                              <strong>Online event · Fockis Meeting</strong>
                            ) : (
                              <>
                                <strong>{ev.locationName || "Location to be announced"}</strong>
                                {ev.address && <small>{ev.address}</small>}
                                {reg.attendanceMode === "online" && <small>You're attending online</small>}
                              </>
                            )}
                          </span>
                        </li>
                      </ul>
                      {reg.attendanceStatus !== "not_checked_in" && (
                        <p className="fkr-checked">
                          <CircleCheck size={18} aria-hidden="true" /> {ATTENDANCE_LABEL[reg.attendanceStatus]}
                        </p>
                      )}
                    </div>

                  </div>
                </section>

                {reg.liveTicket && !reg.isOrganizerView && (
                  <LiveTicket
                    registrationId={reg.id}
                    accessKey={key}
                    registrationNumber={reg.registrationNumber}
                    ticketName={reg.ticketName}
                    isGuest={reg.isGuest}
                  />
                )}
                {reg.status === "confirmed" && reg.admissionHold && (
                  <div className="fkr-alert fkr-alert--warn" role="status">
                    Entry for this ticket is on hold while a payment issue is reviewed. Contact the organizer.
                  </div>
                )}
                {reg.status === "confirmed" && (
                  <p className="fkr-printonly">
                    Booking confirmation — not an entry ticket. Open your live ticket in Fockis at the entrance.
                  </p>
                )}

                <div className="fkr-ticket-actions fkr-noprint">
                  {reg.status === "confirmed" && online && signedIn && (
                    <button type="button" className="fkr-btn fkr-btn--primary" onClick={() => void join()} disabled={joinState.busy}>
                      {joinState.busy ? <LoaderCircle className="fkr-spin" size={18} aria-hidden="true" /> : <Video size={18} aria-hidden="true" />} Join Meeting
                    </button>
                  )}
                  {reg.status !== "cancelled" && reg.status !== "rejected" && reg.status !== "expired" && (
                    <>
                      <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => downloadIcs(ev, absoluteEventUrl(ev.id))}>
                        <CalendarPlus size={18} aria-hidden="true" /> Add to Calendar
                      </button>
                      <a className="fkr-btn fkr-btn--ghost" href={googleCalendarUrl(ev, `Registration ${reg.registrationNumber} — ${absoluteEventUrl(ev.id)}`)} target="_blank" rel="noopener noreferrer">
                        Google Calendar
                      </a>
                    </>
                  )}
                  {reg.status === "confirmed" && (
                    <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => window.print()}>
                      <Printer size={18} aria-hidden="true" /> Print booking confirmation
                    </button>
                  )}
                  <EventShareButton event={{ id: ev.id, title: ev.title }} label="Share Event" className="fkr-share" />
                  {signedIn && (
                    <Link to="/events/my-events?tab=registered" className="fkr-btn fkr-btn--outline">
                      <Ticket size={18} aria-hidden="true" /> View My Events
                    </Link>
                  )}
                </div>
                {joinState.message && (
                  <div className="fkr-alert fkr-alert--info fkr-noprint" role="status">
                    {joinState.message}
                  </div>
                )}

                {reg.canCancel && (
                  <section className="fkr-card fkr-cancel fkr-noprint">
                    {!confirmCancel ? (
                      <button type="button" className="fkr-link-btn fkr-link-btn--danger" onClick={() => setConfirmCancel(true)}>
                        Cancel registration
                      </button>
                    ) : (
                      <div role="group" aria-label="Confirm cancellation">
                        <p>
                          Cancel registration {reg.registrationNumber}? Your places are released{reg.paymentStatus === "paid" ? " and refunds follow the organizer's policy" : ""}.
                        </p>
                        {reg.cancellationPolicy && <p className="fkr-muted">{reg.cancellationPolicy}</p>}
                        <div className="fkr-actions">
                          <button type="button" className="fkr-btn fkr-btn--outline" onClick={() => setConfirmCancel(false)} disabled={busy}>
                            Keep registration
                          </button>
                          <button type="button" className="fkr-btn fkr-btn--danger" onClick={() => void cancel()} disabled={busy}>
                            {busy ? "Cancelling…" : "Cancel registration"}
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </EventsShell>
  );
}
