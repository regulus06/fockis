import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getAdmissionApplications,
  getAllEnrollments,
  updateApplicationStatus,
  type AdmissionApplication,
} from "../../../lib/academyApi";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { getAdminActivity, getAdminStats } from "../../../lib/academyLearnApi";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { AdminLoading, AdminError } from "../../../components/academy/admin/AdminStates";
import { Icon } from "../../../components/academy/market/Icon";
import { AreaChart, Badge, Person, Stat } from "../../../components/academy/market/Shared";
import "../../../styles/academy-market.scss";

/**
 * /academy/admin/dashboard — design board screen 13.
 * Every number is a real MongoDB count:
 *   GET /academy/admin/stats, GET /academy/courses/enrollments/all,
 *   GET /academy/admissions/applications, GET /academy/activity/recent
 * Approve / review buttons call PATCH /academy/admissions/applications/:id/status.
 */

const QUICK_ACTIONS = [
  { label: "Add Program", href: "/academy/admin/programs", icon: "layers" },
  { label: "Manage Courses", href: "/academy/admin/courses", icon: "book" },
  { label: "Publish News", href: "/academy/admin/news", icon: "file" },
  { label: "Post a Job", href: "/academy/admin/jobs", icon: "briefcase" },
];

function statusTone(s = ""): "green" | "amber" | "red" | "purple" | "blue" {
  const v = s.toLowerCase();
  if (/approv|accept|admit/.test(v)) return "green";
  if (/reject|declin/.test(v)) return "red";
  if (/review/.test(v)) return "purple";
  if (/pend|new|submit/.test(v)) return "amber";
  return "blue";
}

function appName(a: AdmissionApplication) {
  return a.name || [a.firstName, a.lastName].filter(Boolean).join(" ") || a.email;
}

function monthly(rows: { createdAt?: string; enrolledAt?: string }[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const data = months.map(() => 0);
  rows.forEach((r) => {
    const d = new Date(String(r.enrolledAt || r.createdAt || ""));
    if (Number.isNaN(d.getTime())) return;
    const i = months.findIndex((m) => m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth());
    if (i >= 0) data[i]++;
  });
  return { labels: months.map((m) => m.toLocaleDateString(undefined, { month: "short" })), data };
}

export default function AcademyAdminDashboard() {
  const stats = useAcademyLoad(getAdminStats);
  const enrollments = useAcademyLoad(getAllEnrollments);
  const apps = useAcademyLoad(getAdmissionApplications);
  const activity = useAcademyLoad(() => getAdminActivity(8));
  const toast = useAcademyToast((s: { showToast: (message: string) => void }) => s.showToast);
  const [busyId, setBusyId] = useState<string | null>(null);

  const series = useMemo(() => monthly(enrollments.state.status === "ready" ? enrollments.state.data : []), [enrollments.state]);
  const recentApps = useMemo(
    () =>
      apps.state.status === "ready"
        ? [...apps.state.data].sort((a, b) => String(b.createdAt || b.submittedAt || "").localeCompare(String(a.createdAt || a.submittedAt || ""))).slice(0, 5)
        : [],
    [apps.state],
  );

  async function decide(a: AdmissionApplication, status: string) {
    const id = String(a._id || a.id || "");
    if (!id) return;
    setBusyId(id);
    try {
      const updated = await updateApplicationStatus(id, status);
      apps.setData((rows) => rows.map((r) => (String(r._id || r.id) === id ? { ...r, ...updated, status } : r)));
      toast(`${appName(a)}: ${status}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update the application");
    } finally {
      setBusyId(null);
    }
  }

  if (stats.state.status === "loading") return <AdminLoading label="Loading dashboard…" />;
  if (stats.state.status === "error") return <AdminError label={stats.state.error} onRetry={stats.reload} />;
  const s = stats.state.data;

  return (
    <div className="fa-root fa-admin">
      <div className="fa-dhead">
        <div>
          <h2>Academy Admin Dashboard</h2>
          <p>A live snapshot of Fockis Academy — every number below is a real count.</p>
        </div>
        <Link className="fa-btn fa-btn--primary" to="/academy/admin/courses">
          <Icon name="plus" size={15} /> New Course
        </Link>
      </div>

      <div className="fa-stats fa-stats--4">
        <Stat icon="book" value={s.courses.toLocaleString()} label="Total Courses" tone="blue" />
        <Stat icon="users" value={s.students.toLocaleString()} label="Students" tone="blue" />
        <Stat icon="user" value={(s.instructors || s.faculty).toLocaleString()} label="Instructors" tone="purple" />
        <Stat icon="clipboard" value={s.enrollments.toLocaleString()} label="Enrollments" tone="green" />
      </div>
      <div className="fa-stats fa-stats--4">
        <Stat icon="layers" value={s.programs.toLocaleString()} label="Programs" tone="sky" />
        <Stat icon="calendar" value={s.events.toLocaleString()} label="Events" tone="red" />
        <Stat icon="inbox" value={`${s.applications.toLocaleString()}`} label={`Applications · ${s.pendingApplications} pending`} tone="amber" />
        <Stat icon="message" value={s.contactMessages.toLocaleString()} label={`Messages · ${s.newContactMessages} unread`} tone="gray" />
      </div>

      <div className="fa-dgrid">
        <div className="fa-card fa-pad">
          <div className="fa-cardhead">
            <h4>Enrollments (Last 6 Months)</h4>
            <Link className="fa-link" to="/academy/admin/enrollments">
              Details
            </Link>
          </div>
          {enrollments.state.status === "ready" ? (
            <AreaChart data={series.data} labels={series.labels} max={Math.max(4, Math.ceil(Math.max(...series.data) * 1.25))} />
          ) : enrollments.state.status === "loading" ? (
            <p className="fa-muted">Loading…</p>
          ) : (
            <p className="fa-muted">Couldn&apos;t load enrollments. {enrollments.state.error}</p>
          )}
        </div>

        <div className="fa-card fa-pad">
          <div className="fa-cardhead">
            <h4>Recent Applications</h4>
            <Link className="fa-link" to="/academy/admin/admissions">
              View all
            </Link>
          </div>
          {apps.state.status === "loading" && <p className="fa-muted">Loading…</p>}
          {apps.state.status === "error" && <p className="fa-muted">Couldn&apos;t load applications. {apps.state.error}</p>}
          {apps.state.status === "ready" &&
            (recentApps.length === 0 ? (
              <p className="fa-muted">No applications yet.</p>
            ) : (
              <ul className="fa-upcoming">
                {recentApps.map((a, i) => {
                  const id = String(a._id || a.id || "");
                  const st = a.status || "pending";
                  const done = /approv|accept|admit|reject/i.test(st);
                  return (
                    <li key={id || a.email}>
                      <Person look={{ skin: (i * 2 + 1) % 6, hair: i % 6, shirt: ["#334155", "#8b5cf6", "#0ea5a4", "#e05d7a", "#2f6fed"][i % 5], style: i % 2 ? "long" : "short" }} size={34} />
                      <div>
                        <b>{appName(a)}</b>
                        <small>{a.programName || a.programCode || a.email}</small>
                      </div>
                      <div className="fa-appactions">
                        <Badge tone={statusTone(st)}>{st.charAt(0).toUpperCase() + st.slice(1)}</Badge>
                        {!done && (
                          <span className="fa-mini">
                            <button title="Approve" disabled={busyId === id} onClick={() => decide(a, "approved")}>
                              <Icon name="check" size={13} />
                            </button>
                            <button title="Mark under review" disabled={busyId === id} onClick={() => decide(a, "under review")}>
                              <Icon name="clock" size={13} />
                            </button>
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}
        </div>
      </div>

      <div className="fa-dgrid fa-section">
        <div className="fa-card fa-pad">
          <div className="fa-cardhead">
            <h4>Recent Activity</h4>
          </div>
          {activity.state.status === "loading" && <p className="fa-muted">Loading…</p>}
          {activity.state.status === "error" && <AdminError label={activity.state.error} onRetry={activity.reload} />}
          {activity.state.status === "ready" &&
            (activity.state.data.length === 0 ? (
              <p className="fa-muted">No recent activity yet.</p>
            ) : (
              <ul className="fa-upcoming">
                {activity.state.data.map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <span className="fa-stat__ic tone-blue">
                      <Icon name={item.type === "contact_message" ? "message" : item.type === "job_application" ? "briefcase" : "inbox"} size={15} />
                    </span>
                    <div>
                      <b>{item.title}</b>
                      <small>{new Date(item.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small>
                    </div>
                    <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  </li>
                ))}
              </ul>
            ))}
        </div>
        <div className="fa-card fa-pad">
          <div className="fa-cardhead">
            <h4>Quick Actions</h4>
          </div>
          <div className="fa-qa">
            {QUICK_ACTIONS.map((a) => (
              <Link key={a.href} className="fa-action" to={a.href}>
                <Icon name={a.icon} size={16} /> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
