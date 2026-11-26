import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, MapPin, QrCode, Ticket, Video } from "lucide-react";

import EventCover from "../components/EventCover";
import type { EventCategory } from "../types/event.types";
import { JoinMeetingButton } from "./EventRegistrationPanel";
import { eventWhen, formatMoney, registrationApi, STATUS_LABEL, type Registration } from "./registrationApi";

/** One registration in My Events: status, ticket, live-ticket link, details, cancel, join. */
export default function MyRegistrationCard({ reg, onChanged }: { reg: Registration; onChanged: (next: Registration) => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ev = reg.event;
  if (!ev) return null;
  const when = eventWhen(ev);
  const upcoming = new Date(ev.endDate).getTime() > Date.now() && !ev.isCancelled;
  const online = ev.isOnline || reg.attendanceMode === "online";

  async function cancel() {
    setBusy(true);
    setError("");
    try {
      const next = await registrationApi.cancel(reg.id);
      onChanged({ ...reg, ...next, event: reg.event });
      setConfirming(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="fkr-mycard">
      <Link to={`/events/registrations/${reg.id}`} className="fkr-mycard__media" aria-label={`${ev.title} ticket`}>
        <EventCover event={{ ...ev, category: "conference" as EventCategory, coverMediaType: ev.coverMediaType === "video" ? "video" : "image" }} />
        <span className={`fkr-status fkr-status--${reg.status}`}>{STATUS_LABEL[reg.status]}</span>
      </Link>
      <div className="fkr-mycard__body">
        <h3>
          <Link to={`/events/${ev.id}`}>{ev.title}</Link>
        </h3>
        <ul className="fkr-mycard__facts">
          <li>
            <CalendarDays size={15} aria-hidden="true" /> {when.day}
          </li>
          <li>
            <Clock size={15} aria-hidden="true" /> {when.time}
          </li>
          <li>
            {online ? <Video size={15} aria-hidden="true" /> : <MapPin size={15} aria-hidden="true" />}
            {ev.isOnline ? "Online · Fockis Meeting" : reg.attendanceMode === "online" ? "Attending online" : ev.locationName || ev.address || "Location TBA"}
          </li>
          <li>
            <Ticket size={15} aria-hidden="true" /> {reg.attendeeCount} × {reg.ticketName} · {reg.totalAmount > 0 ? formatMoney(reg.totalAmount, reg.currency) : "Free"} · <span className="fkr-mono">{reg.registrationNumber}</span>
          </li>
        </ul>
        {error && (
          <small className="fkr-error" role="alert">
            {error}
          </small>
        )}
        {confirming ? (
          <div className="fkr-mycard__confirm" role="group" aria-label="Confirm cancellation">
            <span>Cancel this registration?</span>
            <button type="button" className="fke-btn fke-btn--ghost fke-btn--sm" onClick={() => setConfirming(false)} disabled={busy}>
              Keep
            </button>
            <button type="button" className="fke-btn fke-btn--danger fke-btn--sm" onClick={() => void cancel()} disabled={busy}>
              {busy ? "Cancelling…" : "Cancel registration"}
            </button>
          </div>
        ) : (
          <div className="fkr-mycard__actions">
            <Link to={`/events/registrations/${reg.id}`} className="fke-btn fke-btn--outline fke-btn--sm">
              View details
            </Link>
            {reg.status === "pending_payment" && (
              <Link to={`/events/registrations/${reg.id}`} className="fke-btn fke-btn--primary fke-btn--sm">
                Complete payment
              </Link>
            )}
            {reg.liveTicket && (
              <Link to={`/events/registrations/${reg.id}`} className="fke-btn fke-btn--primary fke-btn--sm">
                <QrCode size={15} aria-hidden="true" /> Open live ticket
              </Link>
            )}
            {reg.status === "confirmed" && online && upcoming && <JoinMeetingButton eventId={ev.id} />}
            {reg.canCancel && (
              <button type="button" className="fke-btn fke-btn--danger-ghost fke-btn--sm" onClick={() => setConfirming(true)}>
                Cancel registration
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
