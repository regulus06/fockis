/**
 * AttendanceDialogs.tsx
 * -----------------------------------------------------------------------------
 * Dialogs used by the attendance pages:
 *   RecordDialog        mark / correct one member (status, actual arrival, reason)
 *   ConfirmDialog       bulk actions, finalize, cancel, reopen (with optional reason)
 *   QrDialog            session QR code (full-screen for projecting)
 *   SettingsDialog      ministry attendance settings
 *   NewSessionDialog    one-time meeting not on the schedule
 * The server decides the official status and late minutes; these forms only
 * send what the manager knows (status, actual arrival time, reason).
 * -----------------------------------------------------------------------------
 */

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Copy, Expand, Loader2, Minimize, Printer } from "lucide-react";

import { qrMatrix, qrSvgPath } from "../../badges/qr";
import { errorMessage } from "../../ui/orgUi";
import { MinistryModal } from "../MinistryDialogs";
import {
  attendanceApi,
  checkInUrl,
  fmtTime,
  fmtYmd,
  lateText,
  METHOD_LABEL,
  SESSION_LABEL,
  STATUS_LABEL,
  type AttendanceSession,
  type AttendanceSettings,
  type AttendanceStatus,
  type RosterRow,
} from "./attendanceApi";

function Actions({ busy, label, onClose, danger }: { busy: boolean; label: string; onClose: () => void; danger?: boolean }) {
  return (
    <div className="md__actions">
      <button type="button" className="cw-btn cw-btn--outline" onClick={onClose} disabled={busy}>
        Cancel
      </button>
      <button type="submit" className={"cw-btn " + (danger ? "at-btn--danger" : "cw-btn--primary")} disabled={busy}>
        {busy && <Loader2 className="cw-spin" aria-hidden="true" />} {label}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------- record one */

export function RecordDialog({
  organizationId,
  ministryId,
  session,
  row,
  settings,
  initialStatus,
  onClose,
  onDone,
}: {
  organizationId: string;
  ministryId: string;
  session: AttendanceSession;
  row: RosterRow;
  settings: AttendanceSettings;
  initialStatus?: AttendanceStatus;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const existing = row.record;
  const [status, setStatus] = useState<AttendanceStatus>(initialStatus ?? existing?.status ?? "present");
  const [arrival, setArrival] = useState(existing?.arrivalLocal ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finalized = session.state === "finalized";
  const reasonRequired = Boolean(existing) && (settings.requireCorrectionReason || finalized);
  const start = fmtTime(session.scheduledStartAt, session.timeZone);
  const usesArrival = status === "present" || status === "late";

  // Preview of what the server will compute (same whole-minute rule).
  const preview = useMemo(() => {
    if (!usesArrival || !/^\d{2}:\d{2}$/.test(arrival)) return null;
    const startLocal = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: session.timeZone }).format(new Date(session.scheduledStartAt));
    const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    const diff = toMin(arrival) - toMin(startLocal);
    return diff > 0 ? `Late — ${diff} minute${diff === 1 ? "" : "s"}` : "Present — 0 minutes late";
  }, [arrival, session, usesArrival]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reasonRequired && !reason.trim()) return setError("Enter a reason for this correction.");
    setBusy(true);
    setError(null);
    try {
      const res = await attendanceApi.record(organizationId, ministryId, session.id, {
        membershipIds: [row.membershipId],
        status,
        arrivalTime: usesArrival && arrival ? arrival : undefined,
        reason: reason.trim() || undefined,
        overwrite: Boolean(existing),
      });
      if (res.rejected.length) throw new Error(res.rejected[0].reason);
      const label = STATUS_LABEL[res.officialStatus];
      const extra = res.officialStatus === "late" && res.lateMinutes ? ` — ${res.lateMinutes} min` : "";
      onDone(`${row.name}: ${label}${extra}.`);
    } catch (err) {
      setError(errorMessage(err, "The attendance could not be saved."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title={existing ? `Correct attendance — ${row.name}` : `Record attendance — ${row.name}`} onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <p className="md__hint">
          {session.title} · {fmtYmd(session.occurrenceDate)} · starts {start}
          {existing && (
            <>
              <br />
              Currently: <b>{STATUS_LABEL[existing.status]}</b>
              {existing.arrivalLocal ? ` at ${fmtTime(existing.actualArrivalAt, session.timeZone)}` : ""} ({METHOD_LABEL[existing.recordingMethod]})
            </>
          )}
        </p>
        <div className="at-seg" role="radiogroup" aria-label="Status">
          {(["present", "late", "absent", "excused"] as AttendanceStatus[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={status === s} className={"at-seg__btn at-seg__btn--" + s + (status === s ? " is-on" : "")} onClick={() => setStatus(s)}>
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        {usesArrival && (
          <label>
            Actual arrival time (optional, meeting's local time)
            <input type="time" value={arrival} onChange={(e) => setArrival(e.target.value)} />
            <small className="md__hint">
              If you know when they arrived, Fockis uses it to decide Present or Late — not the time you enter this.
              {preview && (
                <>
                  {" "}
                  <b>Result: {preview}</b>
                </>
              )}
            </small>
          </label>
        )}
        <label>
          Reason {reasonRequired ? "(required)" : "(optional)"}
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder={existing ? "e.g. Arrived on time but forgot to check in" : ""} />
        </label>
        {finalized && <p className="md__hint">This session is finalized — the change is recorded as a correction after finalization.</p>}
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label={existing ? "Save correction" : "Save"} onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

/* ------------------------------------------------------------ confirmation */

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger,
  reason,
  reasonRequired,
  onClose,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  reason?: boolean;
  reasonRequired?: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (reasonRequired && !text.trim()) return setError("Enter a reason.");
    setBusy(true);
    setError(null);
    try {
      await onConfirm(text.trim());
    } catch (err) {
      setError(errorMessage(err, "That didn't work."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title={title} onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <div className="md__hint at-confirm">{children}</div>
        {reason && (
          <label>
            Reason {reasonRequired ? "(required)" : "(optional)"}
            <textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          </label>
        )}
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label={confirmLabel} onClose={onClose} danger={danger} />
      </form>
    </MinistryModal>
  );
}

/* --------------------------------------------------------------------- QR */

export function QrDialog({ organizationId, ministryId, sessionId, onClose }: { organizationId: string; ministryId: string; sessionId: string; onClose: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof attendanceApi.qr>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [big, setBig] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    attendanceApi
      .qr(organizationId, ministryId, sessionId)
      .then(setData)
      .catch((err) => setError(errorMessage(err, "The QR code could not be loaded.")));
  }, [organizationId, ministryId, sessionId]);

  const url = data ? checkInUrl(organizationId, ministryId, data.sessionId, data.token) : "";
  const path = useMemo(() => (url ? qrSvgPath(qrMatrix(url)) : ""), [url]);
  const size = useMemo(() => (url ? qrMatrix(url).length + 8 : 0), [url]);

  return (
    <MinistryModal title="QR Check-in" onClose={onClose}>
      <div className={"at-qr" + (big ? " at-qr--big" : "")}>
        {error ? (
          <p className="md__error">{error}</p>
        ) : !data ? (
          <div className="cw-loading">
            <Loader2 className="cw-spin" aria-hidden="true" /> Preparing QR code…
          </div>
        ) : (
          <>
            <div className="at-qr__head">
              <strong>{data.title}</strong>
              <span>
                {fmtYmd(data.occurrenceDate)} · starts {fmtTime(data.scheduledStartAt, data.timeZone)}
              </span>
              <span className={"at-pill at-pill--" + data.status}>{SESSION_LABEL[data.status]}</span>
            </div>
            <svg className="at-qr__code" viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Check-in QR code" shapeRendering="crispEdges">
              <rect width={size} height={size} fill="#fff" />
              <path d={path} fill="#071a4a" />
            </svg>
            <p className="at-qr__note">
              Members scan with their phone camera and sign in to Fockis. Check-in is open {fmtTime(data.checkInOpensAt, data.timeZone)} – {fmtTime(data.checkInClosesAt, data.timeZone)}. This code only
              works for this meeting date.
            </p>
            <div className="md__actions at-qr__actions">
              <button
                type="button"
                className="cw-btn cw-btn--outline"
                onClick={() =>
                  navigator.clipboard?.writeText(url).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  })
                }
              >
                <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy link"}
              </button>
              <button type="button" className="cw-btn cw-btn--outline" onClick={() => window.print()}>
                <Printer aria-hidden="true" /> Print
              </button>
              <button type="button" className="cw-btn cw-btn--primary" onClick={() => setBig((v) => !v)}>
                {big ? <Minimize aria-hidden="true" /> : <Expand aria-hidden="true" />} {big ? "Exit full screen" : "Full screen"}
              </button>
            </div>
          </>
        )}
      </div>
    </MinistryModal>
  );
}

/* --------------------------------------------------------------- settings */

const ZONES: string[] = (() => {
  try {
    const f = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (f) return f("timeZone");
  } catch {
    /* older browsers */
  }
  return ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Port-au-Prince", "Europe/London", "Europe/Paris", "Africa/Lagos", "Africa/Accra", "UTC"];
})();

export function SettingsDialog({
  organizationId,
  ministryId,
  initial,
  onClose,
  onDone,
}: {
  organizationId: string;
  ministryId: string;
  initial: AttendanceSettings;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [s, setS] = useState<AttendanceSettings>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toggle = (k: keyof AttendanceSettings, label: string, hint?: string) => (
    <label className="md__check at-toggle">
      <input type="checkbox" checked={Boolean(s[k])} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  );

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await attendanceApi.settings(organizationId, ministryId, s);
      onDone("Attendance settings saved.");
    } catch (err) {
      setError(errorMessage(err, "The settings could not be saved."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title="Attendance Settings" onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <fieldset className="md__meeting">
          <legend>Check-in methods</legend>
          {toggle("qrCheckIn", "QR code check-in")}
          {toggle("selfCheckIn", "Member self check-in", "Signed-in ministry members can check themselves in while check-in is open.")}
          {toggle("manualAttendance", "Manual attendance by leaders", "For members without a phone.")}
          {toggle("allowVisitors", "Allow church members outside this ministry (visitors)")}
        </fieldset>
        <fieldset className="md__meeting">
          <legend>Check-in window</legend>
          <div className="md__row">
            <label>
              Opens (minutes before start)
              <input type="number" min={0} max={1440} value={s.opensMinutesBefore} onChange={(e) => setS({ ...s, opensMinutesBefore: Number(e.target.value) })} />
            </label>
            <label>
              Closes (minutes after end)
              <input type="number" min={0} max={1440} value={s.closesMinutesAfter} onChange={(e) => setS({ ...s, closesMinutesAfter: Number(e.target.value) })} />
            </label>
          </div>
          <p className="md__hint">The window only controls when members can check in. Lateness is always measured from the scheduled start — 1:01 PM is 1 minute late.</p>
          <label>
            Default time zone
            <select value={s.timeZone} onChange={(e) => setS({ ...s, timeZone: e.target.value })}>
              {(ZONES.includes(s.timeZone) ? ZONES : [s.timeZone, ...ZONES]).map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
        <fieldset className="md__meeting">
          <legend>Corrections & review</legend>
          {toggle("allowCorrections", "Allow corrections")}
          {toggle("requireCorrectionReason", "Require a reason for corrections")}
          {toggle("allowCorrectionsAfterFinalize", "Allow corrections after finalizing", "A reason is always required and the change is marked “after finalization”.")}
          {toggle("allowReopen", "Allow reopening finalized sessions")}
          {toggle("membersSeeOwnHistory", "Members can see their own attendance history")}
        </fieldset>
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Save Settings" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

/* ------------------------------------------------------- one-time session */

export function NewSessionDialog({
  organizationId,
  ministryId,
  date,
  onClose,
  onDone,
}: {
  organizationId: string;
  ministryId: string;
  date: string;
  onClose: () => void;
  onDone: (sessionId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState(date);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !day || !start) return setError("Enter a name, date and start time.");
    setBusy(true);
    setError(null);
    try {
      const res = await attendanceApi.createSession(organizationId, ministryId, { title: title.trim(), date: day, startTime: start, endTime: end || undefined, location: location.trim() || undefined });
      onDone(res.session.id);
    } catch (err) {
      setError(errorMessage(err, "The meeting could not be created."));
      setBusy(false);
    }
  }

  return (
    <MinistryModal title="Take Attendance for a New Meeting" onClose={onClose}>
      <form className="md__form" onSubmit={submit}>
        <p className="md__hint">For a one-time gathering. Regular meetings get their sessions automatically from Meetings & Schedule.</p>
        <label>
          Meeting name
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required autoFocus />
        </label>
        <div className="md__row">
          <label>
            Date
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} required />
          </label>
          <label>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} />
          </label>
        </div>
        <div className="md__row">
          <label>
            Starts
            <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <label>
            Ends (optional)
            <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </label>
        </div>
        {error && <p className="md__error">{error}</p>}
        <Actions busy={busy} label="Create & Take Attendance" onClose={onClose} />
      </form>
    </MinistryModal>
  );
}

export { lateText };
