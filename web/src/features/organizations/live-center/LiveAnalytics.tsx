/**
 * LiveAnalytics.tsx — Analytics tab and the per-livestream attendance dialog.
 * All numbers come from the server (viewing sessions and Fockis Live counters).
 */

import { useEffect, useState } from "react";
import { BarChart3, Download, Eye, Heart, MessageCircle, Repeat, Share2, Timer, TrendingUp, UserCheck, Users, X } from "lucide-react";

import { errorMessage } from "../ui/orgUi";
import { downloadCsv } from "../events-center/csv";
import { liveApi, STATUS_LABEL, VISIBILITY_LABEL, type AttendanceReport, type LiveAnalytics as Analytics } from "./liveApi";

const day = (d: Date) => d.toISOString().slice(0, 10);

export function LiveAnalyticsTab({ organizationId }: { organizationId: string }) {
  const [from, setFrom] = useState(() => day(new Date(Date.now() - 90 * 86400e3)));
  const [to, setTo] = useState(() => day(new Date()));
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    liveApi
      .analytics(organizationId, new Date(`${from}T00:00:00`).toISOString(), new Date(`${to}T23:59:59`).toISOString(), controller.signal)
      .then(setData)
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Analytics could not be loaded.")))
      .finally(() => !controller.signal.aborted && setLoading(false));
    return () => controller.abort();
  }, [organizationId, from, to]);

  function exportCsv() {
    if (!data) return;
    downloadCsv(
      `livestream-analytics-${from}-to-${to}.csv`,
      ["Livestream", "Date", "Status", "Visibility", "Duration (min)", "Views", "Unique viewers", "Member attendees", "Peak viewers", "Replay views"],
      data.streams.map((s) => [
        s.title,
        new Date(s.scheduledStart).toISOString(),
        STATUS_LABEL[s.status],
        VISIBILITY_LABEL[s.visibility],
        s.durationMinutes ?? "",
        s.views,
        s.uniqueViewers,
        s.memberAttendees,
        s.peakViewers,
        s.replayViews,
      ]),
    );
  }

  const t = data?.totals;
  const tiles = t
    ? [
        { l: "Total livestreams", v: t.livestreams, i: BarChart3 },
        { l: "Completed broadcasts", v: t.completed, i: TrendingUp },
        { l: "Total views", v: t.totalViews, i: Eye },
        { l: "Unique viewers", v: t.uniqueViewers, i: Users },
        { l: "Peak concurrent viewers", v: t.peakConcurrent, i: TrendingUp },
        { l: "Average viewing time", v: t.averageViewMinutes === null ? "—" : `${t.averageViewMinutes} min`, i: Timer },
        { l: "Members who attended", v: t.memberAttendees, i: UserCheck },
        { l: "Member vs public views", v: `${t.memberViews} / ${t.publicViews}`, i: Users },
        { l: "Replay views", v: t.replayViews, i: Repeat },
        { l: "Likes", v: t.likes, i: Heart },
        { l: "Chat messages", v: t.comments, i: MessageCircle },
        { l: "Shares", v: t.shares, i: Share2 },
      ]
    : [];

  return (
    <section className="lv-card">
      <header className="lv-card__head">
        <h2>
          <BarChart3 aria-hidden="true" /> Analytics
        </h2>
        <div className="lv-range">
          <label>
            From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            To <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button type="button" className="lv-btn lv-btn--outline lv-btn--sm" disabled={!data?.streams.length} onClick={exportCsv}>
            <Download aria-hidden="true" /> Export CSV
          </button>
        </div>
      </header>
      {error ? (
        <div className="lv-alert lv-alert--error">{error}</div>
      ) : loading && !data ? (
        <div className="lv-skeleton-grid">{Array.from({ length: 8 }, (_, i) => <div key={i} className="lv-skeleton" />)}</div>
      ) : (
        <>
          <div className={`lv-tiles${loading ? " is-loading" : ""}`}>
            {tiles.map((x) => (
              <div key={x.l} className="lv-tile">
                <x.i aria-hidden="true" />
                <strong>{typeof x.v === "number" ? x.v.toLocaleString() : x.v}</strong>
                <span>{x.l}</span>
              </div>
            ))}
          </div>
          <p className="lv-muted">
            Views are counted when someone passes the access check and presses Join or Watch — opening a page is not counted. Average viewing time comes from the watch page's activity
            signal. Peak viewers for Fockis Live broadcasts come from the live room.
          </p>
          {data && data.streams.length > 0 ? (
            <div className="lv-table-wrap">
              <table className="lv-table">
                <thead>
                  <tr>
                    <th scope="col">Livestream</th>
                    <th scope="col">Date</th>
                    <th scope="col">Status</th>
                    <th scope="col">Views</th>
                    <th scope="col">Unique</th>
                    <th scope="col">Members</th>
                    <th scope="col">Peak</th>
                    <th scope="col">Replays</th>
                  </tr>
                </thead>
                <tbody>
                  {data.streams.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Livestream">
                        <strong>{s.title}</strong>
                      </td>
                      <td data-label="Date">{new Date(s.scheduledStart).toLocaleDateString()}</td>
                      <td data-label="Status">{STATUS_LABEL[s.status]}</td>
                      <td data-label="Views">{s.views}</td>
                      <td data-label="Unique">{s.uniqueViewers}</td>
                      <td data-label="Members">{s.memberAttendees}</td>
                      <td data-label="Peak">{s.peakViewers}</td>
                      <td data-label="Replays">{s.replayViews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="lv-empty">No livestreams in this period.</p>
          )}
        </>
      )}
    </section>
  );
}

export function AttendanceDialog({ organizationId, liveId, onClose }: { organizationId: string; liveId: string; onClose: () => void }) {
  const [data, setData] = useState<AttendanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    liveApi
      .attendance(organizationId, liveId, controller.signal)
      .then(setData)
      .catch((err) => !controller.signal.aborted && setError(errorMessage(err, "Attendance could not be loaded.")));
    return () => controller.abort();
  }, [organizationId, liveId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lv-modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="lv-modal__box is-wide" role="dialog" aria-modal="true" aria-label="Livestream analytics and attendance">
        <header className="lv-modal__head">
          <div>
            <h2>Analytics &amp; Attendance</h2>
            {data && <small className="lv-muted">{data.livestream.title}</small>}
          </div>
          <button type="button" className="lv-icon-btn" aria-label="Close" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="lv-modal__body">
          {error ? (
            <div className="lv-alert lv-alert--error">{error}</div>
          ) : !data ? (
            <p className="lv-empty">Loading…</p>
          ) : (
            <>
              {!data.livestream.attendanceEnabled && <div className="lv-alert">Attendance tracking is turned off for this livestream.</div>}
              <div className="lv-tiles lv-tiles--sm">
                <div className="lv-tile">
                  <strong>{data.attendees.length}</strong>
                  <span>People who joined</span>
                </div>
                <div className="lv-tile">
                  <strong>{data.attendees.filter((a) => a.isMember).length}</strong>
                  <span>Members</span>
                </div>
                <div className="lv-tile">
                  <strong>{data.attendees.length ? Math.round(data.attendees.reduce((n, a) => n + a.minutes, 0) / data.attendees.length) : 0} min</strong>
                  <span>Average time</span>
                </div>
              </div>
              {data.attendees.length ? (
                <div className="lv-table-wrap">
                  <table className="lv-table">
                    <thead>
                      <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Member</th>
                        <th scope="col">Joined</th>
                        <th scope="col">Left</th>
                        <th scope="col">Minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendees.map((a, i) => (
                        <tr key={`${a.name}-${i}`}>
                          <td data-label="Name">{a.name}</td>
                          <td data-label="Member">{a.isMember ? "Yes" : "No"}</td>
                          <td data-label="Joined">{new Date(a.firstJoin).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td>
                          <td data-label="Left">{new Date(a.lastLeave).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</td>
                          <td data-label="Minutes">{a.minutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="lv-empty">Nobody has joined yet.</p>
              )}
            </>
          )}
        </div>
        {data && data.attendees.length > 0 && (
          <footer className="lv-modal__foot">
            <button
              type="button"
              className="lv-btn lv-btn--primary"
              onClick={() =>
                downloadCsv(
                  `livestream-attendance-${data.livestream.id}.csv`,
                  ["Name", "Member", "Joined", "Left", "Minutes", "Sessions"],
                  data.attendees.map((a) => [a.name, a.isMember ? "Yes" : "No", new Date(a.firstJoin).toISOString(), new Date(a.lastLeave).toISOString(), a.minutes, a.sessions]),
                )
              }
            >
              <Download aria-hidden="true" /> Export attendance
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}
