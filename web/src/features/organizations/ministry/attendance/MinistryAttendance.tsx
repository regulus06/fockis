/**
 * MinistryAttendance.tsx
 * -----------------------------------------------------------------------------
 * Attendance inside the ministry page (sidebar → Attendance). Renders the
 * center column and the right column of the ministry layout.
 *
 *   ?tab=attendance                         dashboard (selected date)
 *   ?tab=attendance&view=take&session=ID    Take Attendance for one meeting date
 *   ?tab=attendance&view=session&session=ID full record of one meeting date
 *   ?tab=attendance&view=history            all sessions, filters, pagination
 *   ?tab=attendance&view=member&member=ID   one member's attendance history
 *   ?tab=attendance&view=reports            reports & analytics
 *
 * Members without attendance permissions see "My Attendance" (their own
 * history and a Check in button while a meeting's check-in is open).
 * Every number comes from the API — nothing here is sample data.
 * -----------------------------------------------------------------------------
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileClock,
  History,
  Info,
  ListChecks,
  Loader2,
  MapPin,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  UserCheck,
  UserRound,
  UserRoundSearch,
  UserX,
  UsersRound,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { mediaUrl } from "../../api/dashboardApi";
import { Alert, errorMessage } from "../../ui/orgUi";
import { ConfirmDialog, NewSessionDialog, QrDialog, RecordDialog, SettingsDialog } from "./AttendanceDialogs";
import {
  attendanceApi,
  fmtDateTime,
  fmtTime,
  fmtYmd,
  lateText,
  localYmdNow,
  METHOD_LABEL,
  SESSION_LABEL,
  STATUS_LABEL,
  type AttendanceDashboard,
  type AttendanceReport,
  type AttendanceSession,
  type AttendanceStatus,
  type MemberHistory,
  type Paged,
  type RosterRow,
  type SessionDetail,
} from "./attendanceApi";
import "../../styles/MinistryAttendance.scss";

/* ============================================================================
 * Small pieces
 * ========================================================================== */

function Card({ icon: Icon, title, action, children, className = "" }: { icon: LucideIcon; title: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={"mp-card " + className}>
      <div className="mp-card__head">
        <h2>
          <Icon aria-hidden="true" /> {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Avatar({ name, url, size = 40 }: { name: string; url: string | null; size?: number }) {
  const src = mediaUrl(url);
  const [broken, setBroken] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span className="mp-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {src && !broken ? <img src={src} alt="" onError={() => setBroken(true)} /> : initials}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={"at-pill at-pill--" + status}>{STATUS_LABEL[status] ?? SESSION_LABEL[status as keyof typeof SESSION_LABEL] ?? status}</span>;
}

function SessionPill({ s }: { s: AttendanceSession }) {
  return (
    <span className={"at-pill at-pill--" + s.status}>
      {s.status === "open" || s.status === "in_progress" ? <i className="at-dot" aria-hidden="true" /> : null}
      {SESSION_LABEL[s.status]}
    </span>
  );
}

function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="cw-loading">
      <Loader2 className="cw-spin" aria-hidden="true" /> {label}
    </div>
  );
}

function Empty({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <p className="mp-empty">
      {children}
      {hint && <small>{hint}</small>}
    </p>
  );
}

const pct = (n: number | null | undefined) => (n == null ? "—" : `${n}%`);
const timeRange = (s: AttendanceSession) => `${fmtTime(s.scheduledStartAt, s.timeZone)}${s.scheduledEndAt ? ` – ${fmtTime(s.scheduledEndAt, s.timeZone)}` : ""}`;

/** Donut chart for the summary card. */
function Donut({ value }: { value: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <svg className="at-donut" viewBox="0 0 128 128" role="img" aria-label={`Average attendance ${pct(value)}`}>
      <circle cx="64" cy="64" r={r} className="at-donut__track" />
      <circle cx="64" cy="64" r={r} className="at-donut__value" strokeDasharray={`${(v / 100) * c} ${c}`} transform="rotate(-90 64 64)" />
      <text x="64" y="62" textAnchor="middle" className="at-donut__num">
        {pct(value)}
      </text>
      <text x="64" y="80" textAnchor="middle" className="at-donut__label">
        Avg. Attendance
      </text>
    </svg>
  );
}

/** Bar chart of checked-in counts per session (newest on the right). */
function TrendBars({ sessions, metric }: { sessions: AttendanceSession[]; metric: "checkedIn" | "late" | "absent" | "rate" }) {
  if (sessions.length === 0) return <Empty>No past meetings in this period yet.</Empty>;
  const values = sessions.map((s) => (metric === "rate" ? (s.counts.rate ?? 0) : s.counts[metric]));
  const max = metric === "rate" ? 100 : Math.max(5, ...values);
  const step = max <= 10 ? 2 : max <= 50 ? 10 : max <= 100 ? 20 : Math.ceil(max / 5 / 10) * 10;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => top - i * step);
  return (
    <div className="at-chart" role="img" aria-label="Attendance trend">
      <div className="at-chart__axis">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="at-chart__plot">
        {sessions.map((s, i) => {
          const v = values[i];
          const last = i === sessions.length - 1;
          return (
            <div key={s.id} className="at-chart__col" title={`${s.title} — ${fmtYmd(s.occurrenceDate)}`}>
              <div className="at-chart__barwrap">
                <b>{metric === "rate" ? `${v}%` : v}</b>
                <div className={"at-chart__bar" + (last ? " is-last" : "")} style={{ height: `${top ? (v / top) * 100 : 0}%` }} />
              </div>
              <span className="at-chart__x">
                {fmtYmd(s.occurrenceDate, "short")}
                <small>({pct(s.counts.rate)})</small>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================================
 * Main component
 * ========================================================================== */

export interface MinistryAttendanceProps {
  organizationId: string;
  ministryId: string;
  ministryName: string;
  ministryPhotoUrl: string | null;
  canView: boolean;
  canManage: boolean;
  /** Opens another ministry tab (e.g. "schedule"). */
  goTab: (tab: string) => void;
}

type View = "dashboard" | "take" | "session" | "history" | "member" | "reports";
type Dialog =
  | null
  | { kind: "qr"; sessionId: string }
  | { kind: "settings" }
  | { kind: "new" }
  | { kind: "pick"; purpose: "take" | "qr" }
  | { kind: "record"; row: RosterRow; status?: AttendanceStatus; detail: SessionDetail }
  | { kind: "confirm"; title: string; body: ReactNode; label: string; danger?: boolean; reason?: boolean; reasonRequired?: boolean; run: (reason: string) => Promise<void> };

export default function MinistryAttendance(props: MinistryAttendanceProps): React.JSX.Element {
  const { organizationId: o, ministryId: m, canView, canManage } = props;
  const [params, setParams] = useSearchParams();
  const view = (params.get("view") as View) || "dashboard";
  const sessionId = params.get("session") ?? "";
  const memberId = params.get("member") ?? "";

  const [date, setDate] = useState<string>(params.get("date") ?? "");
  const [trendRange, setTrendRange] = useState<"month" | "quarter" | "year">("month");
  const [dash, setDash] = useState<AttendanceDashboard | null>(null);
  const [dashError, setDashError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const nav = useCallback(
    (next: Partial<Record<"view" | "session" | "member" | "date", string | null>>) => {
      const p = new URLSearchParams(params);
      p.set("tab", "attendance");
      for (const [k, v] of Object.entries(next)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      if (next.view === "dashboard") {
        p.delete("view");
        p.delete("session");
        p.delete("member");
      }
      setParams(p);
      const grid = document.querySelector(".mp-grid");
      if (grid && grid.getBoundingClientRect().top < 0) window.scrollTo({ top: window.scrollY + grid.getBoundingClientRect().top - 80, behavior: "smooth" });
    },
    [params, setParams],
  );

  /* Dashboard data (also feeds the right column on every view). Live: polls every 15 s. */
  useEffect(() => {
    if (!canView) return;
    const controller = new AbortController();
    attendanceApi
      .dashboard(o, m, { date: date || undefined, trend: trendRange }, controller.signal)
      .then((d) => {
        if (controller.signal.aborted) return;
        setDash(d);
        setDashError(null);
        if (!date) setDate(d.date);
      })
      .catch((err) => !controller.signal.aborted && setDashError(errorMessage(err, "Attendance could not be loaded.")));
    const timer = window.setInterval(() => setTick((t) => t + 1), 15_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [o, m, date, trendRange, canView, tick]);

  const done = (text: string) => {
    setDialog(null);
    setNotice({ tone: "ok", text });
    refresh();
  };

  /* -------------------------------------------------- quick action helpers */

  function takeAttendance() {
    const sessions = (dash?.sessions ?? []).filter((s) => s.state !== "canceled");
    if (sessions.length === 1) nav({ view: "take", session: sessions[0].id });
    else if (sessions.length > 1) setDialog({ kind: "pick", purpose: "take" });
    else setDialog({ kind: "new" });
  }

  function openQr() {
    const sessions = (dash?.sessions ?? []).filter((s) => s.state === "scheduled");
    if (sessions.length === 1) setDialog({ kind: "qr", sessionId: sessions[0].id });
    else if (sessions.length > 1) setDialog({ kind: "pick", purpose: "qr" });
    else setNotice({ tone: "error", text: "There's no meeting on this date to check in to. Pick another date or create a meeting." });
  }

  async function exportRange() {
    try {
      await attendanceApi.exportCsv(o, m, {});
      setNotice({ tone: "ok", text: "Attendance for the last 90 days was downloaded (opens in Excel)." });
    } catch (err) {
      setNotice({ tone: "error", text: errorMessage(err, "The export failed.") });
    }
  }

  /* ---------------------------------------------------- member-only mode */

  if (!canView) {
    return (
      <>
        <main className="mp-main">
          <MyAttendance o={o} m={m} />
        </main>
        <aside className="mp-right" aria-label="Attendance">
          <Card icon={Info} title="About Attendance">
            <p className="mp-note">
              Check in when you arrive by scanning the meeting's QR code, or with the Check in button while check-in is open. Your status is based on the meeting's start time.
            </p>
          </Card>
        </aside>
      </>
    );
  }

  /* ---------------------------------------------------------- center view */

  let center: ReactNode;
  if (view === "take" && sessionId) {
    center = <TakeAttendance o={o} m={m} sessionId={sessionId} tick={tick} canManage={canManage} nav={nav} setDialog={setDialog} setNotice={setNotice} refresh={refresh} />;
  } else if (view === "session" && sessionId) {
    center = <SessionRecord o={o} m={m} sessionId={sessionId} tick={tick} canManage={canManage} nav={nav} setDialog={setDialog} setNotice={setNotice} refresh={refresh} />;
  } else if (view === "history") {
    center = <AttendanceHistory o={o} m={m} nav={nav} />;
  } else if (view === "member" && memberId) {
    center = <MemberAttendance o={o} m={m} membershipId={memberId} nav={nav} />;
  } else if (view === "reports") {
    center = <AttendanceReports o={o} m={m} nav={nav} setNotice={setNotice} />;
  } else {
    center = (
      <Dashboard
        dash={dash}
        error={dashError}
        date={date}
        setDate={(d) => {
          setDate(d);
          nav({ date: d });
        }}
        trendRange={trendRange}
        setTrendRange={setTrendRange}
        canManage={canManage}
        photoUrl={props.ministryPhotoUrl}
        nav={nav}
        takeAttendance={takeAttendance}
        openQr={openQr}
        setDialog={setDialog}
        goSchedule={() => props.goTab("schedule")}
      />
    );
  }

  /* ---------------------------------------------------------- right column */

  const t = dash?.totals;
  const right = (
    <aside className="mp-right" aria-label="Attendance summary, upcoming meetings and quick actions">
      <Card icon={ShieldCheck} title="Attendance Summary">
        {!dash ? (
          <Loading />
        ) : (
          <div className="at-summary">
            <Donut value={t?.rate ?? null} />
            <ul className="at-legend">
              <li>
                <i className="at-dot at-dot--present" /> Present <b>{t?.present ?? 0}</b>
              </li>
              <li>
                <i className="at-dot at-dot--absent" /> Absent <b>{t?.absent ?? 0}</b>
              </li>
              <li>
                <i className="at-dot at-dot--late" /> Late <b>{t?.late ?? 0}</b>
              </li>
              <li>
                <i className="at-dot at-dot--none" /> Not Checked In <b>{t?.notCheckedIn ?? 0}</b>
              </li>
            </ul>
          </div>
        )}
        {dash && <p className="at-caption">{fmtYmd(dash.date)} · Excused members are not counted against the rate.</p>}
      </Card>

      <Card icon={CalendarDays} title="Upcoming Meetings">
        {!dash ? (
          <Loading />
        ) : dash.upcoming.length === 0 ? (
          <Empty hint={canManage ? "Add meetings with dates and times in Meetings & Schedule." : undefined}>No upcoming meetings.</Empty>
        ) : (
          <ul className="mp-schedule at-upcoming">
            {dash.upcoming.slice(0, 3).map((s) => (
              <li key={s.id}>
                <span className="mp-schedule__icon">
                  <CalendarDays aria-hidden="true" />
                </span>
                <button type="button" className="at-linkrow" onClick={() => nav({ view: "session", session: s.id })}>
                  <strong>{s.title}</strong>
                  <small>
                    <CalendarDays aria-hidden="true" /> {fmtYmd(s.occurrenceDate, "long")} • {fmtTime(s.scheduledStartAt, s.timeZone)}
                  </small>
                  {s.location && (
                    <small>
                      <MapPin aria-hidden="true" /> {s.location}
                    </small>
                  )}
                  {s.status === "canceled" && <StatusPill status="canceled" />}
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => props.goTab("schedule")}>
          View Full Schedule <ArrowRight aria-hidden="true" />
        </button>
      </Card>

      <Card icon={Zap} title="Quick Actions" className="mp-quick">
        {canManage && (
          <button type="button" className="cw-btn cw-btn--primary cw-btn--block" onClick={takeAttendance}>
            <Plus aria-hidden="true" /> Take Attendance
          </button>
        )}
        {canManage && dash?.settings.qrCheckIn && (
          <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={openQr}>
            <QrCode aria-hidden="true" /> Generate QR Code
          </button>
        )}
        <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => nav({ view: "reports" })}>
          <BarChart3 aria-hidden="true" /> View Reports & Analytics
        </button>
        <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={exportRange}>
          <Download aria-hidden="true" /> Export Attendance
        </button>
        {canManage && dash && (
          <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => setDialog({ kind: "settings" })}>
            <Settings aria-hidden="true" /> Attendance Settings
          </button>
        )}
      </Card>
    </aside>
  );

  /* -------------------------------------------------------------- dialogs */

  const dialogs = (
    <>
      {dialog?.kind === "qr" && <QrDialog organizationId={o} ministryId={m} sessionId={dialog.sessionId} onClose={() => setDialog(null)} />}
      {dialog?.kind === "settings" && dash && <SettingsDialog organizationId={o} ministryId={m} initial={dash.settings} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "new" && (
        <NewSessionDialog
          organizationId={o}
          ministryId={m}
          date={date || localYmdNow()}
          onClose={() => setDialog(null)}
          onDone={(id) => {
            setDialog(null);
            refresh();
            nav({ view: "take", session: id });
          }}
        />
      )}
      {dialog?.kind === "pick" && dash && (
        <ConfirmDialog
          title={dialog.purpose === "take" ? "Which meeting?" : "QR code for which meeting?"}
          confirmLabel="Close"
          onClose={() => setDialog(null)}
          onConfirm={async () => setDialog(null)}
        >
          <ul className="at-pick">
            {dash.sessions
              .filter((s) => s.state !== "canceled")
              .map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className="cw-btn cw-btn--outline cw-btn--block"
                    onClick={() => (dialog.purpose === "take" ? (setDialog(null), nav({ view: "take", session: s.id })) : setDialog({ kind: "qr", sessionId: s.id }))}
                  >
                    {s.title} · {timeRange(s)}
                  </button>
                </li>
              ))}
            {dialog.purpose === "take" && (
              <li>
                <button type="button" className="cw-btn cw-btn--outline cw-btn--block" onClick={() => setDialog({ kind: "new" })}>
                  <Plus aria-hidden="true" /> Another meeting
                </button>
              </li>
            )}
          </ul>
        </ConfirmDialog>
      )}
      {dialog?.kind === "record" && (
        <RecordDialog
          organizationId={o}
          ministryId={m}
          session={dialog.detail.session}
          settings={dialog.detail.settings}
          row={dialog.row}
          initialStatus={dialog.status}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {dialog?.kind === "confirm" && (
        <ConfirmDialog
          title={dialog.title}
          confirmLabel={dialog.label}
          danger={dialog.danger}
          reason={dialog.reason}
          reasonRequired={dialog.reasonRequired}
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            await dialog.run(reason);
          }}
        >
          {dialog.body}
        </ConfirmDialog>
      )}
    </>
  );

  return (
    <>
      <main className="mp-main at">
        {notice && (
          <div className="at-notice">
            <Alert tone={notice.tone === "ok" ? "ok" : "error"}>{notice.text}</Alert>
          </div>
        )}
        {center}
      </main>
      {right}
      {dialogs}
    </>
  );
}

/* ============================================================================
 * Dashboard
 * ========================================================================== */

type Nav = (next: Partial<Record<"view" | "session" | "member" | "date", string | null>>) => void;

function Dashboard(p: {
  dash: AttendanceDashboard | null;
  error: string | null;
  date: string;
  setDate: (d: string) => void;
  trendRange: "month" | "quarter" | "year";
  setTrendRange: (r: "month" | "quarter" | "year") => void;
  canManage: boolean;
  photoUrl: string | null;
  nav: Nav;
  takeAttendance: () => void;
  openQr: () => void;
  setDialog: (d: Dialog) => void;
  goSchedule: () => void;
}) {
  const { dash, nav } = p;
  const dateInput = useRef<HTMLInputElement | null>(null);


  if (p.error && !dash) return <Empty>{p.error}</Empty>;
  if (!dash) return <Loading label="Loading attendance…" />;

  const t = dash.totals;
  const stats: { key: string; icon: LucideIcon; label: string; value: number; text: string }[] = [
    { key: "present", icon: UserCheck, label: "Present", value: t.present, text: "Checked in on time" },
    { key: "absent", icon: UserX, label: "Absent", value: t.absent, text: "Confirmed absent" },
    { key: "late", icon: Clock, label: "Late", value: t.late, text: "Arrived after the start time" },
    { key: "none", icon: UserRoundSearch, label: "Not Checked In", value: t.notCheckedIn, text: "Awaiting attendance" },
  ];
  const thumb = mediaUrl(p.photoUrl);

  return (
    <div className="mp-col">
      {/* header */}
      <section className="mp-card at-head">
        <div className="at-head__title">
          <CalendarCheck aria-hidden="true" />
          <div>
            <h2>Attendance Management</h2>
            <p>Track member attendance, manage check-ins, and monitor participation.</p>
          </div>
        </div>
        <div className="at-head__actions">
          <div className="at-date">
            <label className="at-date__btn">
              <CalendarDays aria-hidden="true" />
              <span>{fmtYmd(p.date || dash.date)}</span>
              <ChevronDown aria-hidden="true" />
              <input
                ref={dateInput}
                type="date"
                value={p.date || dash.date}
                onChange={(e) => e.target.value && p.setDate(e.target.value)}
                aria-label="Attendance date"
                onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
              />
            </label>
          </div>
          {p.canManage && (
            <button type="button" className="cw-btn cw-btn--primary" onClick={p.takeAttendance}>
              <Plus aria-hidden="true" /> Take Attendance
            </button>
          )}
          {p.canManage && dash.settings.qrCheckIn && (
            <button type="button" className="cw-btn cw-btn--outline" onClick={p.openQr}>
              <QrCode aria-hidden="true" /> QR Check-in
            </button>
          )}
        </div>
      </section>

      {/* stats */}
      <div className="at-stats">
        {stats.map((s) => (
          <div key={s.key} className={"at-stat at-stat--" + s.key}>
            <s.icon aria-hidden="true" />
            <div>
              <strong>{s.label}</strong>
              <b>{s.value}</b>
              <span>{s.text}</span>
            </div>
          </div>
        ))}
      </div>

      {dash.meetingsWithoutTimes.length > 0 && p.canManage && (
        <p className="at-warn">
          <Info aria-hidden="true" /> {dash.meetingsWithoutTimes.join(", ")} {dash.meetingsWithoutTimes.length === 1 ? "has" : "have"} no date and time yet, so no attendance sessions are created.{" "}
          <button type="button" onClick={p.goSchedule}>
            Set the schedule
          </button>
        </p>
      )}

      {/* scheduled meetings */}
      <Card icon={CalendarDays} title={dash.date === dash.today ? "Today's Scheduled Meetings" : `Scheduled Meetings — ${fmtYmd(dash.date, "short")}`}>
        {dash.sessions.length === 0 ? (
          <Empty hint={p.canManage ? "Use Take Attendance to record a one-time meeting, or add meetings in Meetings & Schedule." : undefined}>No meetings on this date.</Empty>
        ) : (
          <ul className="at-sessions">
            {dash.sessions.map((s) => {
              const c = s.counts;
              const ratio = c.expected > 0 ? Math.min(100, Math.round((c.checkedIn / c.expected) * 100)) : 0;
              return (
                <li key={s.id} className="at-session">
                  <span className="at-session__thumb" style={thumb ? { backgroundImage: `url("${thumb}")` } : undefined}>
                    {!thumb && <CalendarCheck aria-hidden="true" />}
                  </span>
                  <div className="at-session__info">
                    <strong>{s.title}</strong>
                    <div className="at-session__meta">
                      <span>
                        <CalendarDays aria-hidden="true" /> {fmtYmd(s.occurrenceDate, "full")}
                      </span>
                      <span>
                        <Clock aria-hidden="true" /> {timeRange(s)}
                      </span>
                      {s.location && (
                        <span>
                          <MapPin aria-hidden="true" /> {s.location}
                        </span>
                      )}
                      <span>
                        <UsersRound aria-hidden="true" /> {c.expected} expected member{c.expected === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  <div className="at-session__progress">
                    <SessionPill s={s} />
                    <span>
                      <b>{c.checkedIn}</b> / {c.expected} checked in ({ratio}%)
                    </span>
                    <div className="at-bar">
                      <i style={{ width: `${ratio}%` }} />
                    </div>
                  </div>
                  <div className="at-session__actions">
                    {p.canManage && s.state !== "canceled" && (
                      <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => nav({ view: "take", session: s.id })}>
                        Open Attendance <ArrowRight aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => nav({ view: "session", session: s.id })}>
                      <Info aria-hidden="true" /> View Details
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* live + trend */}
      <div className="mp-two at-two">
        <Card
          icon={CalendarCheck}
          title="Recent Check-Ins (Live)"
          action={
            dash.sessions[0] ? (
              <button type="button" className="mp-more" onClick={() => nav({ view: "session", session: dash.sessions[0].id })}>
                View All <ArrowRight aria-hidden="true" />
              </button>
            ) : undefined
          }
        >
          {dash.recentCheckIns.length === 0 ? (
            <Empty>No check-ins on this date yet. This list updates automatically.</Empty>
          ) : (
            <ul className="at-live">
              {dash.recentCheckIns.map((r) => (
                <li key={r.id}>
                  <Avatar name={r.memberName} url={r.memberAvatarUrl} size={38} />
                  <button type="button" className="at-linkrow" onClick={() => nav({ view: "member", member: r.membershipId })}>
                    <strong>{r.memberName}</strong>
                    <small>
                      {r.actualArrivalAt ? `Checked in at ${fmtTime(r.actualArrivalAt, dash.timeZone)}` : `Recorded ${fmtTime(r.recordedAt, dash.timeZone)} (arrival time not given)`}
                      {r.status === "late" && r.lateMinutes ? ` · ${lateText(r.lateMinutes)}` : ""} · {METHOD_LABEL[r.recordingMethod]}
                    </small>
                  </button>
                  <StatusPill status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          icon={BarChart3}
          title="Attendance Trend"
          action={
            <label className="at-select">
              <select value={p.trendRange} onChange={(e) => p.setTrendRange(e.target.value as "month" | "quarter" | "year")} aria-label="Trend period">
                <option value="month">This Month</option>
                <option value="quarter">Last 3 Months</option>
                <option value="year">This Year</option>
              </select>
              <ChevronDown aria-hidden="true" />
            </label>
          }
        >
          <TrendBars sessions={dash.trend.slice(-6)} metric="checkedIn" />
        </Card>
      </div>

      {/* history */}
      <Card
        icon={History}
        title="Attendance History"
        action={
          <button type="button" className="mp-more" onClick={() => nav({ view: "history" })}>
            View Full History <ArrowRight aria-hidden="true" />
          </button>
        }
      >
        <SessionTable sessions={dash.history} nav={nav} />
      </Card>
    </div>
  );
}

function SessionTable({ sessions, nav, showStatus }: { sessions: AttendanceSession[]; nav: Nav; showStatus?: boolean }) {
  if (sessions.length === 0) return <Empty>No past meetings yet.</Empty>;
  return (
    <div className="at-tablewrap">
      <table className="at-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Meeting / Activity</th>
            <th className="num">Expected</th>
            <th className="num">Present</th>
            <th className="num">Absent</th>
            <th className="num">Late</th>
            <th className="num">Excused</th>
            <th className="num">Attendance Rate</th>
            {showStatus && <th>Status</th>}
            <th className="act">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => {
            const future = s.status === "upcoming";
            const dash = s.state === "canceled" || future;
            return (
              <tr key={s.id}>
                <td>{fmtYmd(s.occurrenceDate, "long").replace(/^\w+, /, "")}</td>
                <td>
                  {s.title}
                  {!showStatus && s.state === "canceled" && <StatusPill status="canceled" />}
                </td>
                <td className="num">{s.counts.expected}</td>
                <td className="num">{dash ? "—" : s.counts.present}</td>
                <td className="num">{dash ? "—" : s.counts.absent}</td>
                <td className="num">{dash ? "—" : s.counts.late}</td>
                <td className="num">{dash ? "—" : s.counts.excused}</td>
                <td className="num">{dash ? "—" : pct(s.counts.rate)}</td>
                {showStatus && (
                  <td>
                    <SessionPill s={s} />
                  </td>
                )}
                <td className="act">
                  <button type="button" className="at-view" onClick={() => nav({ view: "session", session: s.id })}>
                    <Eye aria-hidden="true" /> View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ============================================================================
 * Shared: load one session
 * ========================================================================== */

function useSession(o: string, m: string, sessionId: string, tick: number) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    attendanceApi
      .session(o, m, sessionId, controller.signal)
      .then((d) => !controller.signal.aborted && (setDetail(d), setError(null)))
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "This attendance record could not be loaded.")));
    return () => controller.abort();
  }, [o, m, sessionId, tick]);
  return { detail, error, setDetail };
}

interface SessionViewProps {
  o: string;
  m: string;
  sessionId: string;
  tick: number;
  canManage: boolean;
  nav: Nav;
  setDialog: (d: Dialog) => void;
  setNotice: (n: { tone: "ok" | "error"; text: string } | null) => void;
  refresh: () => void;
}

function SessionHeader({ d, children, back }: { d: SessionDetail; children?: ReactNode; back: () => void }) {
  const s = d.session;
  const c = s.counts;
  return (
    <section className="mp-card at-shead">
      <button type="button" className="at-back" onClick={back}>
        <ArrowLeft aria-hidden="true" /> Back
      </button>
      <div className="at-shead__main">
        <div>
          <h2>{s.title}</h2>
          <div className="at-session__meta">
            <span>
              <CalendarDays aria-hidden="true" /> {fmtYmd(s.occurrenceDate, "full")}
            </span>
            <span>
              <Clock aria-hidden="true" /> {timeRange(s)} <small>({s.timeZone.replace(/_/g, " ")})</small>
            </span>
            {s.location && (
              <span>
                <MapPin aria-hidden="true" /> {s.location}
              </span>
            )}
          </div>
          {s.state === "canceled" && s.cancelReason && <p className="at-caption">Canceled: {s.cancelReason}</p>}
        </div>
        <SessionPill s={s} />
      </div>
      <div className="at-mini">
        <span>
          <b>{c.expected}</b> Expected
        </span>
        <span className="g">
          <b>{c.present}</b> Present
        </span>
        <span className="o">
          <b>{c.late}</b> Late
        </span>
        <span className="r">
          <b>{c.absent}</b> Absent
        </span>
        <span>
          <b>{c.excused}</b> Excused
        </span>
        <span className="n">
          <b>{c.notCheckedIn}</b> Not Checked In
        </span>
        <span>
          <b>{pct(c.rate)}</b> Rate
        </span>
      </div>
      {children && <div className="at-shead__actions">{children}</div>}
    </section>
  );
}

/** Finalize / reopen / cancel / restore / open-close check-in buttons. */
function SessionActions({ d, o, m, setDialog, setNotice, refresh, setDetail }: { d: SessionDetail; o: string; m: string; setDialog: (x: Dialog) => void; setNotice: SessionViewProps["setNotice"]; refresh: () => void; setDetail: (x: SessionDetail) => void }) {
  const s = d.session;
  const run = (fn: () => Promise<SessionDetail>, msg: string) => async () => {
    const next = await fn();
    setDetail(next);
    setDialog(null);
    setNotice({ tone: "ok", text: msg });
    refresh();
  };
  const notChecked = s.counts.notCheckedIn;
  return (
    <>
      {s.state === "scheduled" && (s.status === "upcoming" || s.status === "awaiting_review") && (
        <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => attendanceApi.window(o, m, s.id, "open").then(setDetail).then(refresh).catch((e) => setNotice({ tone: "error", text: errorMessage(e, "Could not open check-in.") }))}>
          Open check-in now
        </button>
      )}
      {s.state === "scheduled" && (s.status === "open" || s.status === "in_progress") && (
        <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => attendanceApi.window(o, m, s.id, "close").then(setDetail).then(refresh).catch((e) => setNotice({ tone: "error", text: errorMessage(e, "Could not close check-in.") }))}>
          Close check-in
        </button>
      )}
      {s.state === "scheduled" && d.settings.qrCheckIn && (
        <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => setDialog({ kind: "qr", sessionId: s.id })}>
          <QrCode aria-hidden="true" /> QR code
        </button>
      )}
      {s.state === "scheduled" && (
        <button
          type="button"
          className="cw-btn cw-btn--primary cw-btn--sm"
          onClick={() =>
            setDialog({
              kind: "confirm",
              title: "Finalize attendance",
              label: notChecked ? "Finalize — mark absent" : "Finalize",
              body: (
                <>
                  <p>
                    Finalizing locks in this meeting's attendance. {notChecked ? <b>{notChecked} expected member{notChecked === 1 ? " has" : "s have"} no check-in.</b> : "Everyone expected has a record."}
                  </p>
                  {notChecked > 0 && (
                    <p>
                      They will be marked <b>Absent</b>. To excuse them instead, use{" "}
                      <button
                        type="button"
                        className="at-inline"
                        onClick={() => run(() => attendanceApi.finalize(o, m, s.id, "excused"), "Finalized — members without a check-in were marked excused.")().catch((e) => setNotice({ tone: "error", text: errorMessage(e, "Could not finalize.") }))}
                      >
                        mark them excused
                      </button>
                      .
                    </p>
                  )}
                </>
              ),
              run: () => run(() => attendanceApi.finalize(o, m, s.id, "absent"), "Attendance finalized.")(),
            })
          }
        >
          <CheckCircle2 aria-hidden="true" /> Finalize
        </button>
      )}
      {s.state === "finalized" && d.settings.allowReopen && (
        <button
          type="button"
          className="cw-btn cw-btn--outline cw-btn--sm"
          onClick={() =>
            setDialog({
              kind: "confirm",
              title: "Reopen this session?",
              label: "Reopen",
              reason: true,
              body: <p>Reopening lets you change records again. Records stay as they are; the reopening is logged.</p>,
              run: (reason) => run(() => attendanceApi.reopen(o, m, s.id, reason), "Session reopened.")(),
            })
          }
        >
          <RotateCcw aria-hidden="true" /> Reopen
        </button>
      )}
      {s.state === "scheduled" && (
        <button
          type="button"
          className="cw-btn cw-btn--outline cw-btn--sm at-btn--warn"
          onClick={() =>
            setDialog({
              kind: "confirm",
              title: "Cancel this meeting date?",
              label: "Cancel meeting",
              danger: true,
              reason: true,
              body: <p>Only this date is canceled. No one is marked absent, and other dates of this meeting are not affected.</p>,
              run: (reason) => run(() => attendanceApi.cancel(o, m, s.id, reason), "This meeting date was canceled.")(),
            })
          }
        >
          <XCircle aria-hidden="true" /> Cancel meeting
        </button>
      )}
      {s.state === "canceled" && (
        <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => run(() => attendanceApi.restore(o, m, s.id), "Meeting restored.")().catch((e) => setNotice({ tone: "error", text: errorMessage(e, "Could not restore.") }))}>
          <RotateCcw aria-hidden="true" /> Restore meeting
        </button>
      )}
    </>
  );
}

/* ============================================================================
 * Take Attendance
 * ========================================================================== */

type RowFilter = "all" | "none" | "present" | "late" | "absent" | "excused";

function TakeAttendance(p: SessionViewProps) {
  const { o, m, sessionId, nav } = p;
  // Faster refresh while taking attendance (live QR check-ins).
  const [localTick, setLocalTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setLocalTick((x) => x + 1), 8000);
    return () => window.clearInterval(t);
  }, []);
  const { detail: d, error, setDetail } = useSession(o, m, sessionId, p.tick + localTick);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<RowFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    if (!d) return [];
    const needle = q.trim().toLowerCase();
    return d.roster.filter((r) => {
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      if (filter === "all") return true;
      if (filter === "none") return !r.record;
      return r.record?.status === filter;
    });
  }, [d, q, filter]);

  if (error && !d) return <Empty>{error}</Empty>;
  if (!d) return <Loading label="Loading members…" />;
  const s = d.session;
  const locked = s.state === "canceled" || (s.state === "finalized" && !d.settings.allowCorrectionsAfterFinalize);
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.membershipId));

  async function quick(row: RosterRow, status: AttendanceStatus) {
    if (row.record) {
      p.setDialog({ kind: "record", row, status, detail: d! }); // changing an existing record = correction
      return;
    }
    setBusy(true);
    try {
      const res = await attendanceApi.record(o, m, s.id, { membershipIds: [row.membershipId], status });
      if (res.rejected.length) throw new Error(res.rejected[0].reason);
      p.setNotice({ tone: "ok", text: `${row.name}: ${STATUS_LABEL[status]}.` });
      setDetail(await attendanceApi.session(o, m, s.id));
      p.refresh();
    } catch (err) {
      p.setNotice({ tone: "error", text: errorMessage(err, "Could not save.") });
    } finally {
      setBusy(false);
    }
  }

  function bulk(status: AttendanceStatus, ids: string[]) {
    if (ids.length === 0) return;
    const existing = d!.roster.filter((r) => ids.includes(r.membershipId) && r.record).length;
    p.setDialog({
      kind: "confirm",
      title: `Mark ${ids.length} member${ids.length === 1 ? "" : "s"} ${STATUS_LABEL[status]}?`,
      label: `Mark ${STATUS_LABEL[status]}`,
      danger: status === "absent",
      body: (
        <>
          <p>
            {ids.length - existing} member{ids.length - existing === 1 ? "" : "s"} will be recorded as <b>{STATUS_LABEL[status]}</b> (manual, no arrival time).
          </p>
          {existing > 0 && (
            <p>
              {existing} already {existing === 1 ? "has" : "have"} a record and will be <b>left unchanged</b>. Use “Correct” on a member to change an existing record.
            </p>
          )}
        </>
      ),
      run: async () => {
        const res = await attendanceApi.record(o, m, s.id, { membershipIds: ids, status });
        p.setDialog(null);
        setSelected(new Set());
        p.setNotice({
          tone: res.rejected.length ? "error" : "ok",
          text: `${res.saved} recorded as ${STATUS_LABEL[status]}${res.skipped.length ? `, ${res.skipped.length} already recorded (unchanged)` : ""}${res.rejected.length ? `, ${res.rejected.length} could not be recorded` : ""}.`,
        });
        setDetail(await attendanceApi.session(o, m, s.id));
        p.refresh();
      },
    });
  }

  const filters: { key: RowFilter; label: string; n: number }[] = [
    { key: "all", label: "All", n: d.roster.length },
    { key: "none", label: "Not Checked In", n: d.roster.filter((r) => !r.record).length },
    { key: "present", label: "Present", n: d.roster.filter((r) => r.record?.status === "present").length },
    { key: "late", label: "Late", n: d.roster.filter((r) => r.record?.status === "late").length },
    { key: "absent", label: "Absent", n: d.roster.filter((r) => r.record?.status === "absent").length },
    { key: "excused", label: "Excused", n: d.roster.filter((r) => r.record?.status === "excused").length },
  ];

  return (
    <div className="mp-col">
      <SessionHeader d={d} back={() => nav({ view: "dashboard" })}>
        <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => nav({ view: "session", session: s.id })}>
          <FileClock aria-hidden="true" /> Full record
        </button>
        {p.canManage && <SessionActions d={d} o={o} m={m} setDialog={p.setDialog} setNotice={p.setNotice} refresh={p.refresh} setDetail={setDetail} />}
      </SessionHeader>

      <Card icon={ListChecks} title="Take Attendance" action={<span className="mp-count">Updates automatically</span>}>
        {locked && <p className="at-warn">{s.state === "canceled" ? "This meeting date is canceled." : "This session is finalized. Reopen it to make changes."}</p>}
        <div className="at-toolbar">
          <label className="at-search">
            <Search aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members" aria-label="Search members" />
          </label>
          <div className="at-chips" role="tablist" aria-label="Filter">
            {filters.map((f) => (
              <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={"at-chip" + (filter === f.key ? " is-on" : "")} onClick={() => setFilter(f.key)}>
                {f.label} <small>{f.n}</small>
              </button>
            ))}
          </div>
        </div>

        {!locked && p.canManage && (
          <div className="at-bulk">
            <label className="md__check">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.membershipId)) : new Set())}
                aria-label="Select all shown"
              />
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </label>
            <button type="button" className="cw-btn cw-btn--sm at-btn--present" disabled={!selected.size || busy} onClick={() => bulk("present", [...selected])}>
              Mark Present
            </button>
            <button type="button" className="cw-btn cw-btn--sm at-btn--absent" disabled={!selected.size || busy} onClick={() => bulk("absent", [...selected])}>
              Mark Absent
            </button>
            <button type="button" className="cw-btn cw-btn--sm cw-btn--outline" disabled={!selected.size || busy} onClick={() => bulk("excused", [...selected])}>
              Mark Excused
            </button>
            <button
              type="button"
              className="cw-btn cw-btn--sm cw-btn--outline at-bulk__all"
              disabled={busy}
              onClick={() =>
                bulk(
                  "present",
                  d.roster.filter((r) => !r.record && r.expected).map((r) => r.membershipId),
                )
              }
            >
              Mark everyone not checked in Present
            </button>
          </div>
        )}

        {rows.length === 0 ? (
          <Empty hint={d.roster.length === 0 ? "Add members to this ministry in Settings → ministry members." : undefined}>{d.roster.length === 0 ? "This ministry has no members yet." : "No members match."}</Empty>
        ) : (
          <ul className="at-roster">
            {rows.map((r) => {
              const rec = r.record;
              return (
                <li key={r.membershipId} className={selected.has(r.membershipId) ? "is-selected" : ""}>
                  {!locked && p.canManage && (
                    <input
                      type="checkbox"
                      checked={selected.has(r.membershipId)}
                      onChange={(e) => {
                        const next = new Set(selected);
                        if (e.target.checked) next.add(r.membershipId);
                        else next.delete(r.membershipId);
                        setSelected(next);
                      }}
                      aria-label={`Select ${r.name}`}
                    />
                  )}
                  <Avatar name={r.name} url={r.avatarUrl} size={40} />
                  <div className="at-roster__who">
                    <button type="button" className="at-linkrow" onClick={() => nav({ view: "member", member: r.membershipId })}>
                      <strong>{r.name}</strong>
                    </button>
                    <small>
                      {rec
                        ? [
                            rec.actualArrivalAt ? `Arrived ${fmtTime(rec.actualArrivalAt, s.timeZone)}` : rec.status === "present" || rec.status === "late" ? "Arrival time not given" : "",
                            rec.status === "late" ? lateText(rec.lateMinutes) : "",
                            METHOD_LABEL[rec.recordingMethod],
                            rec.recordedByName && rec.recordingMethod !== "QR_CODE" && rec.recordingMethod !== "MEMBER_SELF_CHECKIN" ? `by ${rec.recordedByName}` : "",
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : r.expected
                          ? "No check-in yet"
                          : "Visitor"}
                    </small>
                  </div>
                  <StatusPill status={rec ? rec.status : "not_checked_in"} />
                  {!locked && p.canManage && (
                    <div className="at-roster__actions">
                      {!rec ? (
                        <>
                          <button type="button" className="at-act at-act--present" disabled={busy} onClick={() => quick(r, "present")} title="Mark Present (no arrival time)">
                            Present
                          </button>
                          <button type="button" className="at-act at-act--late" disabled={busy} onClick={() => p.setDialog({ kind: "record", row: r, status: "late", detail: d })} title="Mark Late with arrival time">
                            Late…
                          </button>
                          <button type="button" className="at-act at-act--absent" disabled={busy} onClick={() => quick(r, "absent")}>
                            Absent
                          </button>
                          <button type="button" className="at-act" disabled={busy} onClick={() => quick(r, "excused")}>
                            Excused
                          </button>
                          <button type="button" className="at-act" disabled={busy} onClick={() => p.setDialog({ kind: "record", row: r, status: "present", detail: d })} title="Enter actual arrival time">
                            <Clock aria-hidden="true" /> Arrival time
                          </button>
                        </>
                      ) : (
                        <button type="button" className="at-act" onClick={() => p.setDialog({ kind: "record", row: r, detail: d })}>
                          Correct
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
 * Session record (one meeting date)
 * ========================================================================== */

function SessionRecord(p: SessionViewProps) {
  const { o, m, sessionId, nav } = p;
  const { detail: d, error, setDetail } = useSession(o, m, sessionId, p.tick);
  if (error && !d) return <Empty>{error}</Empty>;
  if (!d) return <Loading />;
  const s = d.session;
  const recorded = d.roster.filter((r) => r.record);
  const missing = d.roster.filter((r) => !r.record && r.expected);
  const qr = recorded.filter((r) => r.record!.recordingMethod === "QR_CODE" || r.record!.recordingMethod === "MEMBER_SELF_CHECKIN").length;

  return (
    <div className="mp-col at-print">
      <SessionHeader d={d} back={() => nav({ view: "dashboard" })}>
        {p.canManage && s.state !== "canceled" && (
          <button type="button" className="cw-btn cw-btn--primary cw-btn--sm" onClick={() => nav({ view: "take", session: s.id })}>
            <ListChecks aria-hidden="true" /> Take Attendance
          </button>
        )}
        <button
          type="button"
          className="cw-btn cw-btn--outline cw-btn--sm"
          onClick={() => attendanceApi.exportCsv(o, m, { sessionId: s.id }).catch((e) => p.setNotice({ tone: "error", text: errorMessage(e, "Export failed.") }))}
        >
          <Download aria-hidden="true" /> Excel (CSV)
        </button>
        <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => window.print()}>
          <Printer aria-hidden="true" /> Print / PDF
        </button>
        {p.canManage && <SessionActions d={d} o={o} m={m} setDialog={p.setDialog} setNotice={p.setNotice} refresh={p.refresh} setDetail={setDetail} />}
      </SessionHeader>

      <Card icon={UserCheck} title={`Attendance Records (${recorded.length})`} action={<span className="mp-count">{qr} self / QR · {recorded.length - qr} manual</span>}>
        {recorded.length === 0 ? (
          <Empty>No one has been recorded for this meeting date yet.</Empty>
        ) : (
          <div className="at-tablewrap">
            <table className="at-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Status</th>
                  <th>Actual arrival</th>
                  <th>Late</th>
                  <th>Method</th>
                  <th>Recorded by</th>
                  <th>Recorded at</th>
                  {p.canManage && <th className="act" />}
                </tr>
              </thead>
              <tbody>
                {recorded.map((r) => {
                  const rec = r.record!;
                  return (
                    <tr key={r.membershipId}>
                      <td>
                        <button type="button" className="at-linkrow at-linkrow--inline" onClick={() => nav({ view: "member", member: r.membershipId })}>
                          {r.name}
                        </button>
                        {!r.expected && <small className="at-tag">Visitor</small>}
                      </td>
                      <td>
                        <StatusPill status={rec.status} />
                      </td>
                      <td>{fmtTime(rec.actualArrivalAt, s.timeZone)}</td>
                      <td>{rec.status === "late" ? (rec.lateMinutes != null ? `${rec.lateMinutes} min` : "unknown") : rec.status === "present" ? "0 min" : "—"}</td>
                      <td>{METHOD_LABEL[rec.recordingMethod]}</td>
                      <td>{rec.recordedByName || "—"}</td>
                      <td>{fmtDateTime(rec.recordedAt, s.timeZone)}</td>
                      {p.canManage && (
                        <td className="act">
                          {s.state !== "canceled" && (s.state !== "finalized" || d.settings.allowCorrectionsAfterFinalize) && (
                            <button type="button" className="at-view" onClick={() => p.setDialog({ kind: "record", row: r, detail: d })}>
                              Correct
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {s.state !== "canceled" && (
        <Card icon={UserRoundSearch} title={`Not Checked In (${missing.length})`}>
          {missing.length === 0 ? (
            <Empty>Everyone expected has a record.</Empty>
          ) : (
            <ul className="at-people">
              {missing.map((r) => (
                <li key={r.membershipId}>
                  <Avatar name={r.name} url={r.avatarUrl} size={30} /> {r.name}
                </li>
              ))}
            </ul>
          )}
          {s.state === "scheduled" && missing.length > 0 && <p className="at-caption">Not marked absent until a manager finalizes this session.</p>}
        </Card>
      )}

      <Card icon={History} title="Attendance Changes History">
        {d.corrections.length === 0 && d.log.length === 0 ? (
          <Empty>No corrections or changes to this session.</Empty>
        ) : (
          <ul className="at-audit">
            {d.corrections.map((c, i) => (
              <li key={`c${i}`}>
                <b>{c.memberName}</b>: {STATUS_LABEL[c.previousStatus ?? ""] ?? "—"}
                {c.previousArrivalAt ? ` (${fmtTime(c.previousArrivalAt, s.timeZone)})` : ""} → <b>{STATUS_LABEL[c.newStatus]}</b>
                {c.newArrivalAt ? ` (${fmtTime(c.newArrivalAt, s.timeZone)}, ${c.newLateMinutes ? `${c.newLateMinutes} min late` : "on time"})` : ""}
                <small>
                  {fmtDateTime(c.at, s.timeZone)} by {c.byName || "—"}
                  {c.reason ? ` — “${c.reason}”` : ""}
                  {c.afterFinalization ? " · after finalization" : ""}
                </small>
              </li>
            ))}
            {d.log.map((l, i) => (
              <li key={`l${i}`}>
                Session <b>{l.action}</b>
                {l.note ? ` — ${l.note}` : ""}
                <small>
                  {fmtDateTime(l.at, s.timeZone)} by {l.byName || "—"}
                </small>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
 * History
 * ========================================================================== */

const HISTORY_TABS: { key: string; label: string }[] = [
  { key: "", label: "All Sessions" },
  { key: "upcoming", label: "Upcoming" },
  { key: "open", label: "Open" },
  { key: "completed", label: "Completed" },
  { key: "awaiting_review", label: "Awaiting Review" },
  { key: "finalized", label: "Finalized" },
  { key: "canceled", label: "Canceled" },
];

function AttendanceHistory({ o, m, nav }: { o: string; m: string; nav: Nav }) {
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paged<AttendanceSession> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const t = window.setTimeout(() => {
      attendanceApi
        .sessions(o, m, { status: status || undefined, from: from || undefined, to: to || undefined, search: search || undefined, page, pageSize: 20 }, controller.signal)
        .then((d) => !controller.signal.aborted && (setData(d), setError(null)))
        .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "History could not be loaded.")));
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(t);
    };
  }, [o, m, status, from, to, search, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mp-col">
      <Card
        icon={History}
        title="Attendance History"
        action={
          <button type="button" className="at-back" onClick={() => nav({ view: "dashboard" })}>
            <ArrowLeft aria-hidden="true" /> Dashboard
          </button>
        }
      >
        <div className="at-chips" role="tablist">
          {HISTORY_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={status === t.key}
              className={"at-chip" + (status === t.key ? " is-on" : "")}
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="at-toolbar">
          <label className="at-search">
            <Search aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Meeting name"
              aria-label="Meeting name"
            />
          </label>
          <label className="at-range">
            From <input type="date" value={from} onChange={(e) => (setFrom(e.target.value), setPage(1))} />
          </label>
          <label className="at-range">
            To <input type="date" value={to} onChange={(e) => (setTo(e.target.value), setPage(1))} />
          </label>
        </div>
        {error ? <Empty>{error}</Empty> : !data ? <Loading /> : <SessionTable sessions={data.items} nav={nav} showStatus />}
        {data && data.total > data.pageSize && (
          <div className="at-pager">
            <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft aria-hidden="true" /> Previous
            </button>
            <span>
              Page {page} of {pages} · {data.total} sessions
            </span>
            <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight aria-hidden="true" />
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
 * Member attendance
 * ========================================================================== */

function MemberSummary({ h }: { h: MemberHistory }) {
  const s = h.summary;
  const items: [string, string | number, string?][] = [
    ["Expected sessions", s.expected],
    ["Attended", s.attended],
    ["Present", s.present, "g"],
    ["Late", s.late, "o"],
    ["Absent", s.absent, "r"],
    ["Not Checked In", s.notCheckedIn, "n"],
    ["Excused", s.excused],
    ["Attendance", pct(s.rate)],
    ["Avg. late", s.averageLateMinutes == null ? "—" : `${s.averageLateMinutes} min`],
  ];
  return (
    <>
      <div className="at-mini at-mini--grid">
        {items.map(([label, value, tone]) => (
          <span key={label} className={tone}>
            <b>{value}</b> {label}
          </span>
        ))}
      </div>
      <p className="at-caption">{h.denominator}</p>
    </>
  );
}

function MemberRows({ h, onOpen, onCheckIn, busyId }: { h: MemberHistory; onOpen?: (sessionId: string) => void; onCheckIn?: (sessionId: string) => void; busyId?: string }) {
  if (h.rows.length === 0) return <Empty>No meetings yet.</Empty>;
  return (
    <div className="at-tablewrap">
      <table className="at-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Meeting</th>
            <th>Arrival</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {h.rows.map(({ session: s, record: r, outcome }) => {
            const canCheckIn = onCheckIn && !r && (s.status === "open" || s.status === "in_progress");
            return (
              <tr key={s.id} className={onOpen ? "is-click" : ""} onClick={() => onOpen?.(s.id)}>
                <td>{fmtYmd(s.occurrenceDate, "long").replace(/^\w+, /, "")}</td>
                <td>
                  {s.title}
                  <small className="at-sub">starts {fmtTime(s.scheduledStartAt, s.timeZone)}</small>
                </td>
                <td>{r?.actualArrivalAt ? fmtTime(r.actualArrivalAt, s.timeZone) : "—"}</td>
                <td>
                  {canCheckIn ? (
                    <button
                      type="button"
                      className="cw-btn cw-btn--primary cw-btn--sm"
                      disabled={busyId === s.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCheckIn!(s.id);
                      }}
                    >
                      {busyId === s.id ? <Loader2 className="cw-spin" aria-hidden="true" /> : <UserCheck aria-hidden="true" />} Check in
                    </button>
                  ) : (
                    <>
                      <StatusPill status={outcome} />
                      {r?.status === "late" && <small className="at-sub">{lateText(r.lateMinutes)}</small>}
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MemberAttendance({ o, m, membershipId, nav }: { o: string; m: string; membershipId: string; nav: Nav }) {
  const [h, setH] = useState<MemberHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const c = new AbortController();
    setH(null);
    attendanceApi
      .member(o, m, membershipId, c.signal)
      .then((d) => !c.signal.aborted && setH(d))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "This member's attendance could not be loaded.")));
    return () => c.abort();
  }, [o, m, membershipId]);

  return (
    <div className="mp-col">
      <Card
        icon={UserRound}
        title={h ? `${h.member.name} — Attendance` : "Member Attendance"}
        action={
          <button type="button" className="at-back" onClick={() => nav({ view: "dashboard" })}>
            <ArrowLeft aria-hidden="true" /> Dashboard
          </button>
        }
      >
        {error ? (
          <Empty>{error}</Empty>
        ) : !h ? (
          <Loading />
        ) : (
          <>
            <div className="at-member">
              <Avatar name={h.member.name} url={h.member.avatarUrl} size={56} />
              <MemberSummary h={h} />
            </div>
            <MemberRows h={h} onOpen={(id) => nav({ view: "session", session: id })} />
          </>
        )}
      </Card>
    </div>
  );
}

/** Member's own view: history + check-in while open. */
function MyAttendance({ o, m }: { o: string; m: string }) {
  const [h, setH] = useState<MemberHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    attendanceApi
      .member(o, m, "me", c.signal)
      .then((d) => !c.signal.aborted && setH(d))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "Your attendance could not be loaded.")));
    return () => c.abort();
  }, [o, m, tick]);

  async function checkIn(sessionId: string) {
    setBusy(sessionId);
    try {
      const r = await attendanceApi.checkIn(o, m, sessionId);
      const late = r.record.status === "late" ? ` — late by ${r.record.lateMinutes} min` : "";
      setMsg({ tone: "ok", text: `You are checked in to ${r.meeting} at ${fmtTime(r.record.actualArrivalAt, r.timeZone)}: ${STATUS_LABEL[r.record.status]}${late}.` });
      setTick((t) => t + 1);
    } catch (err) {
      setMsg({ tone: "error", text: errorMessage(err, "Check-in failed.") });
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mp-col">
      {msg && <Alert tone={msg.tone === "ok" ? "ok" : "error"}>{msg.text}</Alert>}
      <Card icon={CalendarCheck} title="My Attendance">
        {error ? (
          <Empty>{error}</Empty>
        ) : !h ? (
          <Loading />
        ) : (
          <>
            <MemberSummary h={h} />
            <MemberRows h={h} onCheckIn={checkIn} busyId={busy} />
          </>
        )}
      </Card>
    </div>
  );
}

/* ============================================================================
 * Reports
 * ========================================================================== */

function AttendanceReports({ o, m, nav, setNotice }: { o: string; m: string; nav: Nav; setNotice: SessionViewProps["setNotice"] }) {
  const today = localYmdNow();
  const back90 = (() => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 90);
    return d.toISOString().slice(0, 10);
  })();
  const [from, setFrom] = useState(back90);
  const [to, setTo] = useState(today);
  const [metric, setMetric] = useState<"checkedIn" | "rate" | "late" | "absent">("rate");
  const [r, setR] = useState<AttendanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = new AbortController();
    setR(null);
    attendanceApi
      .report(o, m, { from, to }, c.signal)
      .then((d) => !c.signal.aborted && setR(d))
      .catch((err) => !c.signal.aborted && setError(errorMessage(err, "The report could not be loaded.")));
    return () => c.abort();
  }, [o, m, from, to]);

  const presets: [string, number][] = [
    ["This week", 7],
    ["This month", 31],
    ["This quarter", 92],
    ["This year", 365],
  ];

  return (
    <div className="mp-col at-print">
      <Card
        icon={BarChart3}
        title="Reports & Analytics"
        action={
          <button type="button" className="at-back" onClick={() => nav({ view: "dashboard" })}>
            <ArrowLeft aria-hidden="true" /> Dashboard
          </button>
        }
      >
        <div className="at-toolbar">
          <div className="at-chips">
            {presets.map(([label, days]) => (
              <button
                key={label}
                type="button"
                className="at-chip"
                onClick={() => {
                  const d = new Date(`${today}T12:00:00Z`);
                  d.setUTCDate(d.getUTCDate() - days);
                  setFrom(d.toISOString().slice(0, 10));
                  setTo(today);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="at-range">
            From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="at-range">
            To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button
            type="button"
            className="cw-btn cw-btn--outline cw-btn--sm"
            onClick={() => attendanceApi.exportCsv(o, m, { from, to }).catch((e) => setNotice({ tone: "error", text: errorMessage(e, "Export failed.") }))}
          >
            <Download aria-hidden="true" /> Excel (CSV)
          </button>
          <button type="button" className="cw-btn cw-btn--outline cw-btn--sm" onClick={() => window.print()}>
            <Printer aria-hidden="true" /> Print / PDF
          </button>
        </div>
        {error ? (
          <Empty>{error}</Empty>
        ) : !r ? (
          <Loading />
        ) : (
          <>
            <div className="at-mini at-mini--grid">
              <span>
                <b>{r.sessionsHeld}</b> Meetings held
              </span>
              <span>
                <b>{pct(r.totals.averageRate)}</b> Avg. attendance
              </span>
              <span className="g">
                <b>{r.totals.present}</b> Present
              </span>
              <span className="o">
                <b>{r.totals.late}</b> Late
              </span>
              <span className="r">
                <b>{r.totals.absent}</b> Absent
              </span>
              <span>
                <b>{r.totals.excused}</b> Excused
              </span>
              <span>
                <b>{r.sessionsCanceled}</b> Canceled
              </span>
              <span>
                <b>{r.manualCount}</b> Manual records
              </span>
            </div>
            <p className="at-caption">{r.denominator}</p>
          </>
        )}
      </Card>

      {r && (
        <>
          <Card
            icon={BarChart3}
            title="Attendance Trend"
            action={
              <label className="at-select">
                <select value={metric} onChange={(e) => setMetric(e.target.value as typeof metric)} aria-label="Measure">
                  <option value="rate">Attendance %</option>
                  <option value="checkedIn">Checked in</option>
                  <option value="late">Late arrivals</option>
                  <option value="absent">Absences</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </label>
            }
          >
            <TrendBars sessions={r.trend.slice(-12)} metric={metric} />
          </Card>

          <Card icon={UsersRound} title="Member Participation">
            {r.participation.length === 0 ? (
              <Empty>No attendance recorded in this period.</Empty>
            ) : (
              <div className="at-tablewrap">
                <table className="at-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th className="num">Attended</th>
                      <th className="num">Present</th>
                      <th className="num">Late</th>
                      <th className="num">Absent</th>
                      <th className="num">Excused</th>
                      <th className="num">Avg. late</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.participation.map((p) => (
                      <tr key={p.membershipId} className="is-click" onClick={() => nav({ view: "member", member: p.membershipId })}>
                        <td>{p.name}</td>
                        <td className="num">{p.attended}</td>
                        <td className="num">{p.present}</td>
                        <td className="num">{p.late}</td>
                        <td className="num">{p.absent}</td>
                        <td className="num">{p.excused}</td>
                        <td className="num">{p.averageLateMinutes == null ? "—" : `${p.averageLateMinutes} min`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card icon={FileClock} title="Corrections">
            {r.corrections.length === 0 ? (
              <Empty>No corrections in this period.</Empty>
            ) : (
              <ul className="at-audit">
                {r.corrections.map((c, i) => (
                  <li key={i}>
                    <b>{c.memberName}</b> · {c.sessionTitle} {fmtYmd(c.occurrenceDate, "short")}: {STATUS_LABEL[c.previousStatus ?? ""] ?? "—"} → <b>{STATUS_LABEL[c.newStatus]}</b>
                    <small>
                      {new Date(c.at).toLocaleString()} by {c.byName || "—"}
                      {c.reason ? ` — “${c.reason}”` : ""}
                      {c.afterFinalization ? " · after finalization" : ""}
                    </small>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
