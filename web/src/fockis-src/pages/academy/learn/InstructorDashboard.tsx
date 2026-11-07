import { useMemo, useState } from "react";
import { academyToken } from "../../../lib/academySession";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LoadState } from "../../../components/academy/learn/CourseCard";
import CourseVisibilityControl from "../../../components/academy/instructor/CourseVisibilityControl";
import { Icon } from "../../../components/academy/market/Icon";
import { AreaChart, DashShell, Person, Stat, type SideItem } from "../../../components/academy/market/Shared";
import { themeFor } from "../../../components/academy/market/FaCourseCard";
import { useAcademyLoad } from "../../../lib/useAcademyLoad";
import { useAcademyToast } from "../../../lib/academyToastStore";
import { createCourse, getEvents, getMe, type AcademyUser } from "../../../lib/academyApi";
import {
  getEnrollmentRows,
  getMyCourses,
  setCourseEnrollmentOpen,
  setCourseVisibility,
  shortDate,
  type EnrollmentRow,
  type LearnCourse,
  type Visibility,
} from "../../../lib/academyLearnApi";
import "../../../styles/academy-market.scss";

/**
 * ============================================================================
 * INSTRUCTOR DASHBOARD  (/academy/instructor) — design board screen 5
 * ============================================================================
 *
 * Uses the existing Academy login (academyToken) and real endpoints:
 *   GET   /academy/auth/me
 *   GET   /academy/courses/mine            (instructor's own courses)
 *   GET   /academy/courses/enrollments/all (filtered to the instructor's courses)
 *   GET   /academy/events                  (upcoming classes / seminars)
 *   POST  /academy/courses                 (quick create)
 *   PATCH /academy/courses/:code           (visibility / enrollment; owner-only on the backend)
 *
 * Earnings, quizzes and attendance are not shown: they need backend support
 * (payments + live sessions) before they can show real numbers.
 * ============================================================================
 */

const TEACHING_ROLES = ["instructor", "staff", "administrator"];

type Section = "overview" | "courses" | "students";
type Tab = "all" | Visibility;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "public", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "hidden", label: "Hidden" },
  { key: "private", label: "Private" },
];

const LABELS: Record<Section, string> = { overview: "Overview", courses: "My Courses", students: "Students" };

function studentIdOf(e: EnrollmentRow): string {
  const s = e.studentId;
  if (s && typeof s === "object") return String(s._id ?? "");
  return String(s ?? "");
}

function visOf(c: LearnCourse): Visibility {
  return c.visibility ?? "public";
}

/** Enrollments per month for the last 6 months (from real enrollment dates). */
function monthlySeries(rows: EnrollmentRow[]) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 5 + i, 1));
  const counts = months.map(() => 0);
  rows.forEach((r) => {
    const d = new Date(String(r.createdAt ?? ""));
    if (Number.isNaN(d.getTime())) return;
    const idx = months.findIndex((m) => m.getFullYear() === d.getFullYear() && m.getMonth() === d.getMonth());
    if (idx >= 0) counts[idx]++;
  });
  return { labels: months.map((m) => m.toLocaleDateString(undefined, { month: "short" })), data: counts };
}

function QuickCreate({ me, onClose, onCreated }: { me: AcademyUser; onClose: () => void; onCreated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setErr(null);
    try {
      await createCourse({
        code: String(f.get("code") || "").trim(),
        name: String(f.get("name") || "").trim(),
        description: String(f.get("description") || "").trim() || undefined,
        instructor: me.name,
      });
      onCreated();
      onClose();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not create the course.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fa-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="fa-card fa-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Quick create course">
        <div className="fa-cardhead">
          <h4>Quick create course</h4>
          <button type="button" className="fa-icon-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="fa-fields">
          <div className="fa-row2">
            <label className="fa-field">
              <span>
                Course code<i>*</i>
              </span>
              <input name="code" required maxLength={20} placeholder="e.g. CYB101" />
            </label>
            <label className="fa-field">
              <span>
                Course name<i>*</i>
              </span>
              <input name="name" required maxLength={140} />
            </label>
          </div>
          <label className="fa-field">
            <span>Description</span>
            <input name="description" maxLength={600} />
          </label>
          {err && (
            <p className="fa-error" role="alert">
              {err}
            </p>
          )}
        </div>
        <div className="fa-builder__foot">
          <button type="button" className="fa-btn fa-btn--outline" onClick={onClose}>
            Cancel
          </button>
          <button className="fa-btn fa-btn--primary" disabled={busy}>
            {busy ? "Creating…" : "Create course"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Gate({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="fa-root fa-page fa-page--soft">
      <div className="fa-container fa-narrow">
        <div className="fa-card fa-gate">
          <h2>{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function InstructorDashboard() {
  const { section = "overview" } = useParams();
  const sec = (["overview", "courses", "students"].includes(section) ? section : "overview") as Section;
  const navigate = useNavigate();
  const hasToken = !!academyToken();
  const me = useAcademyLoad(() => (hasToken ? getMe() : Promise.reject(new Error("not-signed-in"))), [hasToken]);
  const isTeacher = me.state.status === "ready" && TEACHING_ROLES.includes(String(me.state.data.role));

  const courses = useAcademyLoad(() => (isTeacher ? getMyCourses() : Promise.resolve([] as LearnCourse[])), [isTeacher]);
  const enrollments = useAcademyLoad(() => (isTeacher ? getEnrollmentRows() : Promise.resolve([] as EnrollmentRow[])), [isTeacher]);
  const events = useAcademyLoad(() => (isTeacher ? getEvents() : Promise.resolve([])), [isTeacher]);
  const toast = useAcademyToast((s: { showToast: (message: string) => void }) => s.showToast);
  const [tab, setTab] = useState<Tab>("all");
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState(false);

  const myCodes = useMemo(
    () => new Set(courses.state.status === "ready" ? courses.state.data.map((c) => c.code.toUpperCase()) : []),
    [courses.state],
  );
  const myEnrollments = useMemo(
    () => (enrollments.state.status === "ready" ? enrollments.state.data.filter((e) => myCodes.has(String(e.courseCode ?? "").toUpperCase())) : []),
    [enrollments.state, myCodes],
  );
  const studentsByCourse = useMemo(() => {
    const m = new Map<string, number>();
    myEnrollments.forEach((e) => {
      const k = String(e.courseCode ?? "").toUpperCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    });
    return m;
  }, [myEnrollments]);
  const series = useMemo(() => monthlySeries(myEnrollments), [myEnrollments]);
  const upcoming = useMemo(() => {
    if (events.state.status !== "ready") return [];
    const now = Date.now() - 86400000;
    return events.state.data
      .filter((e) => e.isActive !== false)
      .map((e) => ({ e, when: new Date(e.startDate || e.date || "").getTime() }))
      .filter(({ when }) => !Number.isNaN(when) && when >= now)
      .sort((a, b) => a.when - b.when)
      .slice(0, 3)
      .map(({ e }) => e);
  }, [events.state]);

  // ---------- Gates (real Academy login + role) ----------
  if (!hasToken || (me.state.status === "error" && /not-signed-in|401|unauthor/i.test(me.state.error))) {
    return (
      <Gate title="Instructor Dashboard">
        <p className="fa-muted">Sign in with your Fockis Academy account to manage your courses.</p>
        <div className="fa-gate__btns">
          <Link className="fa-btn fa-btn--primary" to="/academy/login">
            Sign in to Academy
          </Link>
          <Link className="fa-btn fa-btn--outline" to="/academy/teach">
            Become an instructor
          </Link>
        </div>
      </Gate>
    );
  }
  if (me.state.status === "loading") {
    return (
      <Gate title="Instructor Dashboard">
        <LoadState status="loading" />
      </Gate>
    );
  }
  if (me.state.status === "error") {
    return (
      <Gate title="Instructor Dashboard">
        <p className="fa-muted">We couldn&apos;t load your Academy profile. {me.state.error}</p>
        <button className="fa-btn fa-btn--primary" onClick={me.reload}>
          Try again
        </button>
      </Gate>
    );
  }
  if (!isTeacher) {
    return (
      <Gate title="Teach on Fockis Academy">
        <p className="fa-muted">Your account isn&apos;t an instructor account yet. Apply and the Academy team will review it.</p>
        <div className="fa-gate__btns">
          <Link className="fa-btn fa-btn--primary" to="/academy/teach/apply">
            Apply to be an instructor
          </Link>
        </div>
      </Gate>
    );
  }

  const user = me.state.data;
  const courseList = courses.state.status === "ready" ? courses.state.data : [];
  const visible = tab === "all" ? courseList : courseList.filter((c) => visOf(c) === tab);
  const totalModules = courseList.reduce((n, c) => n + (c.modules?.length ?? 0), 0);
  const uniqueStudents = new Set(myEnrollments.map(studentIdOf).filter(Boolean)).size;
  const published = courseList.filter((c) => visOf(c) === "public").length;
  const ready = courses.state.status === "ready";
  const firstCourse = courseList[0]?.code;

  const patchCourse = (updated: LearnCourse) =>
    courses.setData((rows) => rows.map((r) => (r.code === updated.code ? { ...r, ...updated } : r)));

  const nav: SideItem[] = [
    { label: "Overview", icon: "grid", to: "/academy/instructor" },
    { label: "My Courses", icon: "book", to: "/academy/instructor/courses" },
    { label: "Create Course", icon: "plus", to: "/academy/instructor/course/new" },
    { label: "Students", icon: "users", to: "/academy/instructor/students" },
    { label: "Live Classroom", icon: "monitor", to: firstCourse ? `/academy/classroom/${encodeURIComponent(firstCourse)}` : "/academy/instructor/course/new" },
    { label: "Certificates", icon: "award", to: "/academy/instructor/certificates" },
    { label: "Seminars & Events", icon: "mic", to: "/academy/calendar" },
    { label: "Academy Home", icon: "home", to: "/academy" },
  ];

  const table = (
    <div className="fa-card">
      <div className="fa-tablehead">
        <div>
          <b>My Courses</b>
          <small>Visibility and enrollment are saved to the backend instantly.</small>
        </div>
        <div className="fa-seg fa-seg--sm" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "is-on" : ""} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {courses.state.status === "loading" && <LoadState status="loading" />}
      {courses.state.status === "error" && <LoadState status="error" error={courses.state.error} onRetry={courses.reload} />}
      {ready &&
        (visible.length === 0 ? (
          <LoadState status="empty" empty={tab === "all" ? "You don't have any courses yet. Use Create New to add one." : "No courses in this list."} />
        ) : (
          <div className="fa-tablewrap">
            <table className="fa-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Visibility</th>
                  <th>Enrollment</th>
                  <th>Students</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => {
                  const v = visOf(c);
                  return (
                    <tr key={c._id || c.code}>
                      <td>
                        <span className="fa-who">
                          <span className="fa-thumb" style={{ background: themeFor(c.code) }}>
                            <Icon name="book" size={15} />
                          </span>
                          <span>
                            {c.name}
                            <small className="fa-sub">
                              {c.code}
                              {c.updatedAt ? ` · Updated ${shortDate(String(c.updatedAt))}` : ""}
                            </small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <CourseVisibilityControl
                          value={v}
                          onChange={async (next) => {
                            try {
                              patchCourse(await setCourseVisibility(c.code, next));
                              toast("Visibility updated");
                            } catch (e) {
                              toast(e instanceof Error ? e.message : "Could not update visibility");
                            }
                          }}
                        />
                      </td>
                      <td>
                        <label className="fa-switch">
                          <input
                            type="checkbox"
                            checked={c.enrollmentOpen !== false}
                            aria-label={`Enrollment open for ${c.name}`}
                            onChange={async (e) => {
                              try {
                                patchCourse(await setCourseEnrollmentOpen(c.code, e.target.checked));
                              } catch (ex) {
                                toast(ex instanceof Error ? ex.message : "Could not update enrollment");
                              }
                            }}
                          />
                          <span />
                        </label>
                      </td>
                      <td>{studentsByCourse.get(c.code.toUpperCase()) ?? 0}</td>
                      <td className="fa-actions">
                        <Link className="fa-btn fa-btn--xs fa-btn--outline" to={`/academy/classroom/${encodeURIComponent(c.code)}`}>
                          Classroom
                        </Link>
                        <Link className="fa-icon-btn" to={`/academy/learn/${encodeURIComponent(c.code)}`} aria-label={`View ${c.name}`} title="View course page">
                          <Icon name="expand" size={15} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );

  return (
    <div className="fa-root">
      <DashShell items={nav} active={LABELS[sec]} sub="Instructor">
        <div className="fa-dhead">
          <div>
            <h2>
              {sec === "overview" ? (
                <>
                  Welcome back, {user.name} <span className="fa-wave">👋</span>
                </>
              ) : (
                LABELS[sec]
              )}
            </h2>
            <p>Manage your courses, classes and learning content.</p>
          </div>
          <div className="fa-dropdown">
            <button className="fa-btn fa-btn--primary" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              Create New <Icon name="chevron" size={14} />
            </button>
            {menu && (
              <div className="fa-dropdown__menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => navigate("/academy/instructor/course/new")}>
                  <Icon name="book" size={15} /> Course (full builder)
                </button>
                <button
                  onClick={() => {
                    setMenu(false);
                    setCreating(true);
                  }}
                >
                  <Icon name="plus" size={15} /> Quick course
                </button>
                {firstCourse && (
                  <button onClick={() => navigate(`/academy/classroom/${encodeURIComponent(firstCourse)}`)}>
                    <Icon name="monitor" size={15} /> Live class
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {sec === "overview" && (
          <>
            <div className="fa-stats fa-stats--6">
              <Stat icon="book" value={ready ? String(courseList.length) : "—"} label="Total Courses" tone="green" />
              <Stat icon="users" value={ready ? uniqueStudents.toLocaleString() : "—"} label="Total Students" tone="blue" />
              <Stat icon="clipboard" value={ready ? myEnrollments.length.toLocaleString() : "—"} label="Enrollments" tone="purple" />
              <Stat icon="calendar" value={events.state.status === "ready" ? String(upcoming.length) : "—"} label="Upcoming Classes" tone="red" />
              <Stat icon="play" value={ready ? String(totalModules) : "—"} label="Lessons" tone="amber" />
              <Stat icon="globe" value={ready ? String(published) : "—"} label="Published" tone="sky" />
            </div>
            <div className="fa-dgrid">
              <div className="fa-card fa-pad">
                <div className="fa-cardhead">
                  <h4>Enrollment Overview</h4>
                  <small className="fa-muted">Last 6 months</small>
                </div>
                {enrollments.state.status === "ready" ? (
                  <AreaChart data={series.data} labels={series.labels} max={Math.max(4, Math.ceil(Math.max(...series.data) * 1.25))} />
                ) : (
                  <LoadState status={enrollments.state.status === "loading" ? "loading" : "error"} error={enrollments.state.status === "error" ? enrollments.state.error : undefined} onRetry={enrollments.reload} />
                )}
              </div>
              <div className="fa-card fa-pad">
                <div className="fa-cardhead">
                  <h4>Upcoming Classes</h4>
                  <Link className="fa-link" to="/academy/calendar">
                    View all
                  </Link>
                </div>
                {events.state.status === "loading" && <LoadState status="loading" />}
                {events.state.status === "error" && <LoadState status="error" error={events.state.error} onRetry={events.reload} />}
                {events.state.status === "ready" &&
                  (upcoming.length === 0 ? (
                    <p className="fa-muted">Nothing scheduled yet.</p>
                  ) : (
                    <ul className="fa-upcoming">
                      {upcoming.map((e, i) => {
                        const id = String(e._id || e.id || "");
                        return (
                          <li key={id || e.title}>
                            <Person look={{ skin: (i * 2) % 6, hair: i % 6, shirt: ["#1d5ee8", "#e05d7a", "#0ea5a4"][i % 3], style: i % 2 ? "long" : "short" }} size={36} />
                            <div>
                              <b>{e.title}</b>
                              <small>
                                {shortDate(e.startDate || e.date)}
                                {e.startTime ? `, ${e.startTime}` : ""}
                              </small>
                            </div>
                            <Link className={`fa-btn fa-btn--xs ${i === 0 ? "fa-btn--primary" : "fa-btn--outline"}`} to={id ? `/academy/events/${encodeURIComponent(id)}` : "/academy/calendar"}>
                              {i === 0 ? "Open" : "View"}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  ))}
              </div>
            </div>
            <div className="fa-section">{table}</div>
          </>
        )}

        {sec === "courses" && table}

        {sec === "students" && (
          <div className="fa-card">
            {enrollments.state.status === "loading" && <LoadState status="loading" />}
            {enrollments.state.status === "error" && <LoadState status="error" error={enrollments.state.error} onRetry={enrollments.reload} />}
            {enrollments.state.status === "ready" &&
              (myEnrollments.length === 0 ? (
                <LoadState status="empty" empty="No students are enrolled in your courses yet." />
              ) : (
                <div className="fa-tablewrap">
                  <table className="fa-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Enrolled</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myEnrollments.map((e, i) => {
                        const s = e.studentId as unknown;
                        const name = s && typeof s === "object" && "name" in s ? String((s as { name?: unknown }).name ?? "Student") : "Student";
                        const email = s && typeof s === "object" && "email" in s ? String((s as { email?: unknown }).email ?? "") : "";
                        return (
                          <tr key={String(e._id ?? i)}>
                            <td>
                              <span className="fa-who">
                                <Person look={{ skin: i % 6, hair: (i + 2) % 6, shirt: "#2f6fed", style: i % 2 ? "long" : "short" }} size={28} />
                                <span>
                                  {name}
                                  {email && <small className="fa-sub">{email}</small>}
                                </span>
                              </span>
                            </td>
                            <td>{e.courseCode}</td>
                            <td>{shortDate(e.createdAt)}</td>
                            <td>{e.progress ?? 0}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </DashShell>

      {creating && <QuickCreate me={user} onClose={() => setCreating(false)} onCreated={courses.reload} />}
    </div>
  );
}
