/* ============================================================================
   LIVE TICKET — the entry QR shown to the ticket holder.
   The code comes from GET /events/registrations/:id/admission, lives 15/30/60
   seconds and is replaced before it runs out. Only the person who registered
   (signed in) or a guest with their private key receives it, so a shared link
   shows nothing. A screenshot stops working when its code expires, and the
   server lets each ticket in once.
   In the Fockis app the screen is protected from screenshots and recording
   while this is open (where the phone allows it). Browsers can't block
   screenshots, which is why the code keeps changing.
============================================================================ */

import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck, Lock, RefreshCw, ShieldCheck } from "lucide-react";

import { postToNative } from "../../../messages/calls/nativeBridge";
import { EventsApiError, isAbortError } from "../services/eventsApi";
import TicketQr from "./TicketQr";
import { registrationApi, type AdmissionTicket } from "./registrationApi";

/** Ask for the next code this long before the current one expires. */
const REFRESH_EARLY_MS = 3_000;

export const TICKET_SECURITY_NOTICE =
  "This ticket is linked to your Fockis account. Unauthorized copying, sharing, duplication, or transfer is prohibited.";

interface Props {
  registrationId: string;
  accessKey?: string | null;
  registrationNumber: string;
  ticketName: string;
  isGuest: boolean;
}

export default function LiveTicket({ registrationId, accessKey, registrationNumber, ticketName, isGuest }: Props) {
  const [ticket, setTicket] = useState<AdmissionTicket | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(typeof document !== "undefined" && document.visibilityState === "hidden");
  const [now, setNow] = useState(() => Date.now());
  /** server clock − device clock, so a wrong phone clock doesn't break the countdown. */
  const offset = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<number | null>(null);

  const fetchCode = useCallback(async () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setLoading(true);
    try {
      const next = await registrationApi.admission(registrationId, accessKey, c.signal);
      offset.current = new Date(next.serverTime).getTime() - Date.now();
      setTicket(next);
      setError(null);
    } catch (caught) {
      if (isAbortError(caught)) return;
      setTicket(null);
      setError({
        message: caught instanceof Error ? caught.message : "Your live ticket couldn't load.",
        status: caught instanceof EventsApiError ? caught.status : undefined,
      });
    } finally {
      if (controller.current === c) setLoading(false);
    }
  }, [registrationId, accessKey]);

  // Pause while the page is in the background; get a fresh code when it comes back.
  useEffect(() => {
    const onVisibility = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (hidden) {
      controller.current?.abort();
      return;
    }
    void fetchCode();
    return () => controller.current?.abort();
  }, [hidden, fetchCode]);

  // Replace the code shortly before it expires.
  useEffect(() => {
    if (!ticket || hidden) return;
    const expires = new Date(ticket.expiresAt).getTime() - offset.current;
    const wait = Math.max(500, expires - REFRESH_EARLY_MS - Date.now());
    timer.current = window.setTimeout(() => void fetchCode(), wait);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [ticket, hidden, fetchCode]);

  // Countdown tick.
  useEffect(() => {
    if (!ticket || hidden) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [ticket, hidden]);

  // Fockis app: protect this screen from screenshots / recording where the OS allows it.
  useEffect(() => {
    postToNative("fockis:secure-screen", { on: true });
    return () => postToNative("fockis:secure-screen", { on: false });
  }, []);

  const ttl = ticket?.ttlSeconds ?? 30;
  const expiresLocal = ticket ? new Date(ticket.expiresAt).getTime() - offset.current : 0;
  const remainingMs = ticket ? Math.max(0, expiresLocal - now) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const fraction = ticket ? Math.min(1, remainingMs / (ttl * 1000)) : 0;
  const R = 26;
  const C = 2 * Math.PI * R;
  const checkedIn = ticket && ticket.attendanceStatus !== "not_checked_in";

  return (
    <section className="fkr-live fkr-noprint" aria-label="Live entry ticket">
      <header className="fkr-live__head">
        <ShieldCheck size={18} aria-hidden="true" />
        <span>Live entry code</span>
        {ticket && <span className={`fkr-live__mode fkr-live__mode--${ticket.securityMode}`}>{ticket.securityMode === "enhanced" ? "Enhanced security" : "Secure ticket"}</span>}
      </header>

      {error ? (
        <div className="fkr-live__error" role="alert">
          <p>{error.status === 404 ? "This ticket opens only for the Fockis account that registered. Sign in with that account." : error.message}</p>
          <button type="button" className="fkr-btn fkr-btn--outline fkr-btn--sm" onClick={() => void fetchCode()} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" /> Try again
          </button>
        </div>
      ) : (
        <div className="fkr-live__body">
          <div className={`fkr-live__qr ${hidden || !ticket ? "is-blurred" : ""}`}>
            {ticket ? <TicketQr code={ticket.token} size={196} label={`Live entry code for ticket ${registrationNumber}`} /> : <span className="fkr-live__placeholder fke-shimmer" aria-hidden="true" />}
            {loading && ticket && <span className="fkr-live__refreshing" aria-hidden="true" />}
          </div>

          <div className="fkr-live__side">
            <div className="fkr-live__ring" role="timer" aria-live="off" aria-label={ticket ? `Code changes in ${seconds} seconds` : "Loading code"}>
              <svg viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
                <circle cx="32" cy="32" r={R} className="fkr-live__track" />
                <circle cx="32" cy="32" r={R} className="fkr-live__progress" strokeDasharray={C} strokeDashoffset={C * (1 - fraction)} />
              </svg>
              <strong>{ticket ? `${seconds}s` : "…"}</strong>
            </div>
            <small>Code refreshes every {ttl} seconds</small>

            {ticket && (
              <div className="fkr-live__holder">
                {ticket.holder.photoUrl ? <img src={ticket.holder.photoUrl} alt="" /> : <span aria-hidden="true">{ticket.holder.name.charAt(0).toUpperCase()}</span>}
                <div>
                  <strong>{ticket.holder.name}</strong>
                  <small>{ticketName}</small>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {checkedIn && ticket && (
        <p className="fkr-live__used">
          <CircleCheck size={16} aria-hidden="true" /> Checked in{ticket.checkedInAt ? ` at ${new Date(ticket.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
        </p>
      )}

      <p className="fkr-live__howto">Open this ticket when you reach the entrance and let staff scan the code on your screen. A screenshot or printed copy won't work.</p>
      <p className="fkr-live__notice">
        <Lock size={15} aria-hidden="true" />
        {isGuest ? "This ticket is linked to your registration. Unauthorized copying, sharing, duplication, or transfer is prohibited." : TICKET_SECURITY_NOTICE}
      </p>
    </section>
  );
}
