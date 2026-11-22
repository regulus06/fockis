/* ============================================================================
   ORGANIZER — QR CHECK-IN  /events/:eventId/check-in
   Scan tickets with the camera (BarcodeDetector, where the browser has it) or
   type a registration ID. The server validates the signed code, the event,
   the registration status and prevents double check-ins; it also records the
   time and the staff member.
============================================================================ */

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Camera, CameraOff, CircleAlert, CircleCheck, Keyboard, LoaderCircle, RotateCcw, UserCheck } from "lucide-react";

import EventsShell from "../components/EventsShell";
import EventEmptyState from "../components/EventEmptyState";
import { EventsApiError } from "../services/eventsApi";
import { eventWhen, registrationApi, type OrganizerList, type Registration } from "./registrationApi";
import "./registration.scss";

interface Detector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
type DetectorCtor = new (options: { formats: string[] }) => Detector;

interface Outcome {
  tone: "ok" | "warn" | "error";
  title: string;
  message: string;
  registration?: Registration;
  at: number;
}

export default function EventCheckInPage() {
  const { eventId = "" } = useParams<{ eventId: string }>();
  const [info, setInfo] = useState<OrganizerList | null>(null);
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [log, setLog] = useState<Outcome[]>([]);
  const [camera, setCamera] = useState<"off" | "starting" | "on" | "unsupported" | "denied">("off");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScan = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const busyRef = useRef(false);

  const refresh = useCallback(() => {
    registrationApi
      .list(eventId, { limit: 1 })
      .then((res) => {
        setInfo(res);
        setLoadError(null);
      })
      .catch((caught) => setLoadError({ message: caught instanceof Error ? caught.message : "Unable to load the event.", status: caught instanceof EventsApiError ? caught.status : undefined }));
  }, [eventId]);

  useEffect(() => refresh(), [refresh]);

  const record = useCallback((o: Outcome) => {
    setOutcome(o);
    setLog((l) => [o, ...l].slice(0, 30));
  }, []);

  const submit = useCallback(
    async (body: { code?: string; registrationId?: string; attendeeIndex?: number; undo?: boolean; preview?: boolean }) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await registrationApi.checkIn(eventId, body);
        const r = res.registration;
        const group = Boolean(info?.settings.individualCheckIn && r.attendeeCount > 1);
        if (res.result === "preview") {
          setOutcome({ tone: "ok", title: "Valid ticket", message: `${r.attendeeName} · choose who is here`, registration: r, at: Date.now() });
        } else if (res.result === "already_checked_in") {
          record({ tone: "warn", title: "Already checked in", message: res.message, registration: r, at: Date.now() });
        } else {
          record({ tone: "ok", title: res.result === "undone" ? "Check-in undone" : "Checked in", message: res.message, registration: r, at: Date.now() });
        }
        if (!group) setCode("");
        refresh();
      } catch (caught) {
        record({ tone: "error", title: "Not checked in", message: caught instanceof Error ? caught.message : "Check-in failed.", at: Date.now() });
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [eventId, info, record, refresh],
  );

  const handleCode = useCallback(
    (value: string) => {
      const text = value.trim();
      if (!text) return;
      const group = Boolean(info?.settings.individualCheckIn);
      void submit(group ? { code: text, preview: true } : { code: text });
    },
    [info, submit],
  );

  /* ------------------------------------------------------------ camera */

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera((c) => (c === "on" || c === "starting" ? "off" : c));
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    const Ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setCamera("unsupported");
      return;
    }
    setCamera("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      setCamera("on");
      const detector = new Ctor({ formats: ["qr_code"] });
      const tick = async () => {
        if (!streamRef.current) return;
        try {
          if (!busyRef.current && video.readyState >= 2) {
            const found = await detector.detect(video);
            const value = found[0]?.rawValue;
            const now = Date.now();
            // Ignore the same code for 4 s so one ticket isn't submitted repeatedly.
            if (value && (value !== lastScan.current.code || now - lastScan.current.at > 4000)) {
              lastScan.current = { code: value, at: now };
              handleCode(value);
            }
          }
        } catch {
          /* frame not ready */
        }
        window.setTimeout(() => void tick(), 250);
      };
      void tick();
    } catch {
      setCamera("denied");
      stopCamera();
    }
  }

  function manual(e: FormEvent) {
    e.preventDefault();
    handleCode(code);
  }

  const stats = info?.stats;
  const when = info ? eventWhen(info.event) : null;
  const current = outcome?.registration;
  const group = Boolean(current && info?.settings.individualCheckIn && current.attendeeCount > 1 && current.status === "confirmed");

  return (
    <EventsShell hideTabs>
      <div className="fkr fkr--org">
        <Link to={`/events/${encodeURIComponent(eventId)}/registrations`} className="fkr-back">
          <ArrowLeft size={18} aria-hidden="true" /> Registrations
        </Link>

        {loadError && (
          <EventEmptyState
            tone="default"
            title={loadError.status === 403 ? "Only the organizer and check-in staff can check people in" : "Check-in couldn't load"}
            body={loadError.message}
            action={
              <Link to={`/events/${encodeURIComponent(eventId)}`} className="fke-btn fke-btn--primary">
                Back to event
              </Link>
            }
          />
        )}

        {info && (
          <>
            <header className="fkr-orghead">
              <div>
                <span className="fkr-eyebrow">QR check-in</span>
                <h1>{info.event.title}</h1>
                {when && (
                  <p>
                    {when.day} · {when.time}
                  </p>
                )}
              </div>
              {stats && (
                <div className="fkr-checkin-count" aria-live="polite">
                  <UserCheck size={26} aria-hidden="true" />
                  <div>
                    <strong>
                      {stats.checkedInPeople} / {stats.confirmedPeople}
                    </strong>
                    <span>checked in</span>
                  </div>
                </div>
              )}
            </header>

            <div className="fkr-checkin">
              <section className="fkr-card fkr-scanner" aria-label="Scanner">
                <div className={`fkr-scanner__view ${camera === "on" ? "is-on" : ""}`}>
                  <video ref={videoRef} muted playsInline aria-label="Camera preview" />
                  {camera !== "on" && (
                    <div className="fkr-scanner__placeholder">
                      <Camera size={42} aria-hidden="true" />
                      <p>
                        {camera === "unsupported"
                          ? "This browser can't scan QR codes. Type the registration ID below, or use Chrome on Android."
                          : camera === "denied"
                            ? "Camera access was blocked. Allow the camera, or type the registration ID below."
                            : "Scan attendee tickets with your camera."}
                      </p>
                    </div>
                  )}
                  {camera === "on" && <span className="fkr-scanner__frame" aria-hidden="true" />}
                </div>
                <div className="fkr-actions">
                  {camera === "on" || camera === "starting" ? (
                    <button type="button" className="fkr-btn fkr-btn--outline" onClick={stopCamera}>
                      <CameraOff size={18} aria-hidden="true" /> Stop camera
                    </button>
                  ) : (
                    <button type="button" className="fkr-btn fkr-btn--primary" onClick={() => void startCamera()} disabled={camera === "unsupported"}>
                      <Camera size={18} aria-hidden="true" /> Start scanning
                    </button>
                  )}
                </div>
                <form className="fkr-manual" onSubmit={manual}>
                  <label className="fkr-field" htmlFor="fkr-code">
                    <span className="fkr-label">
                      <Keyboard size={16} aria-hidden="true" /> Registration ID or ticket code
                    </span>
                    <span className="fkr-row">
                      <input id="fkr-code" className="fkr-input fkr-mono" placeholder="FKE-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
                      <button type="submit" className="fkr-btn fkr-btn--primary" disabled={busy || !code.trim()}>
                        {busy ? <LoaderCircle className="fkr-spin" size={18} aria-hidden="true" /> : "Check in"}
                      </button>
                    </span>
                  </label>
                </form>
              </section>

              <section className="fkr-card fkr-result" aria-live="assertive" aria-label="Result">
                {!outcome && <p className="fkr-muted">Scan a ticket or type a registration ID. Results appear here.</p>}
                {outcome && (
                  <div className={`fkr-result__box fkr-result__box--${outcome.tone}`}>
                    {outcome.tone === "ok" ? <CircleCheck size={40} aria-hidden="true" /> : <CircleAlert size={40} aria-hidden="true" />}
                    <div>
                      <h2>{outcome.title}</h2>
                      <p>{outcome.message}</p>
                      {current && (
                        <p className="fkr-muted">
                          {current.registrationNumber} · {current.attendeeCount} × {current.ticketName}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {group && current && (
                  <ul className="fkr-group">
                    {current.attendees.map((a, i) => (
                      <li key={i}>
                        <span>
                          {a.name}
                          <small>{a.checkedInAt ? `In at ${new Date(a.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Not checked in"}</small>
                        </span>
                        <button type="button" className={`fkr-btn fkr-btn--sm ${a.checkedInAt ? "fkr-btn--ghost" : "fkr-btn--primary"}`} disabled={busy} onClick={() => void submit({ registrationId: current.id, attendeeIndex: i, undo: Boolean(a.checkedInAt) })}>
                          {a.checkedInAt ? "Undo" : "Check in"}
                        </button>
                      </li>
                    ))}
                    <li>
                      <span>Everyone on this ticket</span>
                      <button type="button" className="fkr-btn fkr-btn--sm fkr-btn--outline" disabled={busy} onClick={() => void submit({ registrationId: current.id })}>
                        Check in all
                      </button>
                    </li>
                  </ul>
                )}
                {current && !group && outcome?.tone !== "error" && current.attendanceStatus !== "not_checked_in" && (
                  <button type="button" className="fkr-link-btn" onClick={() => void submit({ registrationId: current.id, undo: true })} disabled={busy}>
                    <RotateCcw size={14} aria-hidden="true" /> Undo this check-in
                  </button>
                )}

                {log.length > 0 && (
                  <>
                    <h3 className="fkr-log__title">Recent</h3>
                    <ul className="fkr-log">
                      {log.map((o) => (
                        <li key={o.at} className={`fkr-log__item fkr-log__item--${o.tone}`}>
                          <span>{new Date(o.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                          <span>{o.registration?.attendeeName ?? o.title}</span>
                          <small>{o.title}</small>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </EventsShell>
  );
}
