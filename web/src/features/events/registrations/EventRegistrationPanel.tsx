/* ============================================================================
   EVENT PAGE — registration panel
   Attendees: price, places, Register / View ticket, Join Meeting.
   Organizer: registration counts, Manage registrations, QR check-in.
============================================================================ */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, LoaderCircle, QrCode, Ticket, Users, Video } from "lucide-react";

import type { FockisEvent } from "../types/event.types";
import { formatMoney, registrationApi, STATUS_LABEL, type RegistrationSettingsView } from "./registrationApi";
import "./registration.scss";

function priceLabel(event: FockisEvent): string {
  const r = event.registration;
  if (!r || r.isFree) return "Free";
  if (r.minPrice === r.maxPrice) return formatMoney(r.maxPrice, r.currency);
  return r.minPrice > 0 ? `${formatMoney(r.minPrice, r.currency)} – ${formatMoney(r.maxPrice, r.currency)}` : `Free – ${formatMoney(r.maxPrice, r.currency)}`;
}

/** Join Meeting: the link is only handed out by the server to authorized people. */
export function JoinMeetingButton({ eventId, className = "" }: { eventId: string; className?: string }) {
  const [state, setState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  async function join() {
    setState({ busy: true, message: "" });
    try {
      const { url } = await registrationApi.join(eventId);
      window.open(url, "_blank", "noopener,noreferrer");
      setState({ busy: false, message: "" });
    } catch (caught) {
      setState({ busy: false, message: caught instanceof Error ? caught.message : "The meeting isn't available." });
    }
  }
  return (
    <span className={`fkr-join ${className}`}>
      <button type="button" className="fke-btn fke-btn--primary" onClick={() => void join()} disabled={state.busy}>
        {state.busy ? <LoaderCircle className="fkr-spin" size={16} aria-hidden="true" /> : <Video size={16} aria-hidden="true" />} Join Meeting
      </button>
      {state.message && (
        <small className="fkr-join__msg" role="status">
          {state.message}
        </small>
      )}
    </span>
  );
}

export default function EventRegistrationPanel({ event, active }: { event: FockisEvent; active: boolean }) {
  const r = event.registration;
  const [view, setView] = useState<RegistrationSettingsView | null>(null);
  const required = r?.mode === "required";
  const legacyLink = !r || (r.mode === "rsvp" && r.access === "public");
  const online = Boolean(r?.hasOnlineMeeting);

  useEffect(() => {
    if (!required || event.isOwner) return;
    const controller = new AbortController();
    registrationApi
      .settings(event.id, controller.signal)
      .then(setView)
      .catch(() => setView(null));
    return () => controller.abort();
  }, [event.id, required, event.isOwner]);

  if (!r) return null;

  if (event.isOwner) {
    if (!required && !online) return null;
    return (
      <div className="fkr-panel">
        {required && (
          <>
            <div className="fkr-panel__info">
              <Users size={18} aria-hidden="true" />
              <span>
                <strong>{r.registeredSeats}</strong> {r.registeredSeats === 1 ? "place" : "places"} taken{event.capacity ? ` of ${event.capacity}` : ""} · {priceLabel(event)}
              </span>
            </div>
            <Link to={`/events/${encodeURIComponent(event.id)}/registrations`} className="fke-btn fke-btn--primary">
              <ClipboardList size={16} aria-hidden="true" /> Manage registrations
            </Link>
            <Link to={`/events/${encodeURIComponent(event.id)}/check-in`} className="fke-btn fke-btn--ghost">
              <QrCode size={16} aria-hidden="true" /> QR check-in
            </Link>
          </>
        )}
        {online && active && <JoinMeetingButton eventId={event.id} />}
      </div>
    );
  }

  if (required) {
    const mine = view?.viewer.registration ?? null;
    const state = view?.availability.state;
    return (
      <div className="fkr-panel">
        <div className="fkr-panel__info">
          <Ticket size={18} aria-hidden="true" />
          <span>
            <strong className={r.isFree ? "fkr-free" : ""}>{r.isFree ? "FREE" : priceLabel(event)}</strong>
            {event.spotsLeft !== null && <> · {event.spotsLeft === 0 ? "Fully booked" : `${event.spotsLeft} places left`}</>}
            {r.requireApproval && <> · Approval required</>}
          </span>
        </div>
        {mine ? (
          <>
            <span className={`fkr-status fkr-status--${mine.status}`}>{STATUS_LABEL[mine.status]}</span>
            <Link to={`/events/registrations/${encodeURIComponent(mine.id)}`} className="fke-btn fke-btn--primary">
              <Ticket size={16} aria-hidden="true" /> View ticket
            </Link>
            {mine.status === "confirmed" && online && active && <JoinMeetingButton eventId={event.id} />}
          </>
        ) : active ? (
          state === "open" || state === "waitlist" || !view ? (
            <Link to={`/events/${encodeURIComponent(event.id)}/register`} className="fke-btn fke-btn--primary fkr-panel__cta">
              {state === "waitlist" ? "Join waitlist" : r.isFree ? "Register for Free" : "Get tickets"}
            </Link>
          ) : (
            <small className="fkr-muted">{view.availability.message}</small>
          )
        ) : null}
      </div>
    );
  }

  // Optional RSVP or no registration: Join for people allowed in (server decides).
  if (online && active && !legacyLink) {
    return (
      <div className="fkr-panel">
        <JoinMeetingButton eventId={event.id} />
      </div>
    );
  }
  return null;
}
