/**
 * MinistryCheckInPage.tsx
 * -----------------------------------------------------------------------------
 * /organizations/:organizationId/ministries/:ministryId/check-in/:sessionId?t=TOKEN
 *
 * Where the QR code leads. A signed-in member is checked in automatically
 * (the server records the arrival time and decides Present/Late); scanning
 * again shows the existing check-in instead of creating a second one.
 * -----------------------------------------------------------------------------
 */

import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CalendarDays, CheckCircle2, Clock, Loader2, MapPin, XCircle } from "lucide-react";

import { getAuthToken } from "../api/organizationApi";
import { errorMessage, useOrgFonts } from "../ui/orgUi";
import { attendanceApi, fmtTime, fmtYmd, SESSION_LABEL, STATUS_LABEL, type AttendanceSession, type CheckInResult } from "../ministry/attendance/attendanceApi";
import "../styles/ChurchWebsite.scss";
import "../styles/MinistryPage.scss";
import "../styles/MinistryAttendance.scss";

export default function MinistryCheckInPage(): React.JSX.Element {
  useOrgFonts("#f2f6fc");
  const { organizationId = "", ministryId = "", sessionId = "" } = useParams();
  const [params] = useSearchParams();
  const token = params.get("t") ?? undefined;
  const signedIn = Boolean(getAuthToken());
  const started = useRef(false);

  const [info, setInfo] = useState<{ ministryName: string; session: AttendanceSession } | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ministryPage = `/organizations/${encodeURIComponent(organizationId)}/ministries/${encodeURIComponent(ministryId)}`;
  const signIn = "/login?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search);

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      setResult(await attendanceApi.checkIn(organizationId, ministryId, sessionId, token));
    } catch (err) {
      setError(errorMessage(err, "Check-in failed."));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!signedIn || started.current) return;
    started.current = true;
    const c = new AbortController();
    attendanceApi
      .checkInInfo(organizationId, ministryId, sessionId, c.signal)
      .then((i) => {
        setInfo(i);
        if (i.myRecord) {
          setResult({ already: true, meeting: i.session.title, occurrenceDate: i.session.occurrenceDate, timeZone: i.session.timeZone, scheduledStartAt: i.session.scheduledStartAt, record: i.myRecord });
        } else if (token) {
          void checkIn(); // scanning the QR code is the check-in
        }
      })
      .catch((err) => setError(errorMessage(err, "This check-in link isn't valid.")));
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId, ministryId, sessionId, signedIn]);

  const s = info?.session;
  const r = result?.record;

  return (
    <div className="cw">
      <div className="ci">
        <div className="ci__card mp-card">
          {!signedIn ? (
            <>
              <h1>Check in</h1>
              <p>Sign in to Fockis to check in to this meeting.</p>
              <Link to={signIn} className="cw-btn cw-btn--primary cw-btn--block">
                Sign in to check in
              </Link>
            </>
          ) : result && r ? (
            <>
              <CheckCircle2 className={"ci__icon" + (r.status === "late" ? " is-late" : "")} aria-hidden="true" />
              <h1>{result.already ? "You're already checked in" : "You are checked in!"}</h1>
              <dl className="ci__facts">
                <dt>Meeting</dt>
                <dd>{result.meeting}</dd>
                <dt>Date</dt>
                <dd>{fmtYmd(result.occurrenceDate)}</dd>
                <dt>Scheduled start</dt>
                <dd>{fmtTime(result.scheduledStartAt, result.timeZone)}</dd>
                <dt>Actual arrival</dt>
                <dd>{r.actualArrivalAt ? fmtTime(r.actualArrivalAt, result.timeZone) : "Recorded by a leader"}</dd>
                <dt>Status</dt>
                <dd>
                  <span className={"at-pill at-pill--" + r.status}>{STATUS_LABEL[r.status]}</span>
                </dd>
                {r.status === "late" && (
                  <>
                    <dt>Late by</dt>
                    <dd>{r.lateMinutes != null ? `${r.lateMinutes} minute${r.lateMinutes === 1 ? "" : "s"}` : "—"}</dd>
                  </>
                )}
              </dl>
              <Link to={ministryPage} className="cw-btn cw-btn--outline cw-btn--block">
                Go to {info?.ministryName ?? "the ministry"}
              </Link>
            </>
          ) : error ? (
            <>
              <XCircle className="ci__icon is-error" aria-hidden="true" />
              <h1>Couldn't check you in</h1>
              <p>{error}</p>
              {s && (s.status === "open" || s.status === "in_progress") && info && (
                <button type="button" className="cw-btn cw-btn--primary cw-btn--block" onClick={checkIn} disabled={busy}>
                  Try again
                </button>
              )}
              <Link to={ministryPage} className="cw-btn cw-btn--outline cw-btn--block">
                Back to the ministry
              </Link>
            </>
          ) : !s ? (
            <div className="cw-loading">
              <Loader2 className="cw-spin" aria-hidden="true" /> Loading…
            </div>
          ) : (
            <>
              <p className="ci__eyebrow">{info?.ministryName}</p>
              <h1>{s.title}</h1>
              <ul className="ci__meta">
                <li>
                  <CalendarDays aria-hidden="true" /> {fmtYmd(s.occurrenceDate, "full")}
                </li>
                <li>
                  <Clock aria-hidden="true" /> Starts {fmtTime(s.scheduledStartAt, s.timeZone)}
                </li>
                {s.location && (
                  <li>
                    <MapPin aria-hidden="true" /> {s.location}
                  </li>
                )}
              </ul>
              <span className={"at-pill at-pill--" + s.status}>{SESSION_LABEL[s.status]}</span>
              <button type="button" className="cw-btn cw-btn--primary cw-btn--block cw-btn--lg" onClick={checkIn} disabled={busy}>
                {busy ? <Loader2 className="cw-spin" aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />} Check me in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
