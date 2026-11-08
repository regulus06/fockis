import { useMemo } from "react";
import { academyToken } from "../../lib/academySession";
import { Link } from "react-router-dom";
import { LoadState } from "../../components/academy/learn/CourseCard";
import { Icon } from "../../components/academy/market/Icon";
import { DashShell, Progress, Stat, type SideItem } from "../../components/academy/market/Shared";
import { themeFor } from "../../components/academy/market/FaCourseCard";
import { useAcademyLoad } from "../../lib/useAcademyLoad";
import { getStudentCourses, getStudentDashboard, type StudentCourse } from "../../lib/academyApi";
import { shortDate } from "../../lib/academyLearnApi";
import { schoolsApi, type PublicSchool } from "../../lib/institutionsApi";
import { KIND_LABEL, formatPrice, type Kind } from "../../lib/studioApi";

/**
 * /academy/portal — Student Dashboard (design board screen 10).
 * Real data only:
 *   GET /academy/students/dashboard
 *   GET /academy/courses/student
 */

export const STUDENT_NAV: SideItem[] = [
  { label: "Dashboard", icon: "grid", to: "/academy/portal" },
  { label: "Browse Courses", icon: "search", to: "/academy/learn" },
  { label: "Seminars & Events", icon: "mic", to: "/academy/calendar" },
  { label: "Certificates", icon: "award", to: "/academy/portal/certificates" },
  { label: "Creator Studio", icon: "layers", to: "/academy/studio" },
  { label: "Academy Home", icon: "home", to: "/academy" },
];

const ICONS = ["shield", "chef", "globe", "cpu", "palette", "chart"];
const TONES = ["blue", "amber", "purple", "green", "red", "sky"];

export function isCompleted(c: StudentCourse) {
  return (c.progress ?? 0) >= 100 || /complet|passed|finished/i.test(String(c.enrollmentStatus ?? ""));
}

export function SignInGate({ what }: { what: string }) {
  return (
    <div className="fa-root fa-page fa-page--soft">
      <div className="fa-container fa-narrow">
        <div className="fa-card fa-gate">
          <h2>{what}</h2>
          <p className="fa-muted">Sign in with your Fockis Academy account to see your learning.</p>
          <div className="fa-gate__btns">
            <Link className="fa-btn fa-btn--primary" to="/academy/login">
              Sign in to Academy
            </Link>
            <Link className="fa-btn fa-btn--outline" to="/academy/learn">
              Browse courses
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AcademyPortal() {
  const hasToken = !!academyToken();
  const dash = useAcademyLoad(() => (hasToken ? getStudentDashboard() : Promise.reject(new Error("not-signed-in"))), [hasToken]);
  const courses = useAcademyLoad(() => (hasToken ? getStudentCourses() : Promise.resolve([] as StudentCourse[])), [hasToken]);
  const school = useAcademyLoad(() => (hasToken ? schoolsApi.mySchool().catch(() => null) : Promise.resolve(null)), [hasToken]);

  const list = courses.state.status === "ready" ? courses.state.data : [];
  const upcoming = useMemo(() => {
    if (dash.state.status !== "ready") return [];
    const now = Date.now() - 86400000;
    return (dash.state.data.upcomingEvents ?? [])
      .map((e) => ({ e, when: new Date(e.startDate || e.date || "").getTime() }))
      .filter(({ when }) => Number.isNaN(when) || when >= now)
      .sort((a, b) => (a.when || 0) - (b.when || 0))
      .slice(0, 4)
      .map(({ e }) => e);
  }, [dash.state]);

  if (!hasToken || (dash.state.status === "error" && /not-signed-in|401|unauthor/i.test(dash.state.error))) return <SignInGate what="Student Portal" />;

  const d = dash.state.status === "ready" ? dash.state.data : null;
  const name = d?.student?.name?.split(" ")[0];
  const assignments = Array.isArray(d?.assignments) ? d!.assignments!.length : 0;
  const completed = list.filter(isCompleted).length;

  return (
    <div className="fa-root">
      <DashShell items={STUDENT_NAV} active="Dashboard" sub="My Learning">
        <div className="fa-dhead">
          <div>
            <h2>
              Welcome back{name ? `, ${name}` : ""}! <span className="fa-wave">👋</span>
            </h2>
            <p>Continue your learning journey.</p>
          </div>
          <Link className="fa-btn fa-btn--primary" to="/academy/learn">
            <Icon name="search" size={15} /> Find a course
          </Link>
        </div>

        {dash.state.status === "error" && <LoadState status="error" error={dash.state.error} onRetry={dash.reload} />}

        <div className="fa-stats fa-stats--4">
          <Stat icon="book" value={courses.state.status === "ready" ? String(list.length) : "—"} label="Enrolled Courses" tone="blue" />
          <Stat icon="calendar" value={d ? String(upcoming.length) : "—"} label="Upcoming Classes" tone="green" />
          <Stat icon="file" value={d ? String(assignments) : "—"} label="Assignments" tone="amber" />
          <Stat icon="award" value={courses.state.status === "ready" ? String(completed) : "—"} label="Certificates" tone="purple" />
        </div>

        {school.state.status === "ready" && school.state.data && (
          <MySchool s={school.state.data} enrolled={new Set(list.map((c) => String(c.code).toUpperCase()))} />
        )}

        <div className="fa-dgrid">
          <div className="fa-card fa-pad">
            <div className="fa-cardhead">
              <h4>My Learning Progress</h4>
            </div>
            {courses.state.status === "loading" && <LoadState status="loading" />}
            {courses.state.status === "error" && <LoadState status="error" error={courses.state.error} onRetry={courses.reload} />}
            {courses.state.status === "ready" &&
              (list.length === 0 ? (
                <div className="fa-portal-empty">
                  <p className="fa-muted">You aren&apos;t enrolled in any class yet.</p>
                  <p>
                    {school.state.status === "ready" && school.state.data
                      ? "Pick a class from your school above and click Enroll — or browse all public classes."
                      : "Find a class, open it and click Enroll. It then shows up here."}
                  </p>
                  <Link className="fa-btn fa-btn--primary fa-btn--sm" to="/academy/learn">
                    <Icon name="search" size={14} /> Browse classes
                  </Link>
                </div>
              ) : (
                <ul className="fa-prog">
                  {list.map((c, i) => {
                    const p = Math.max(0, Math.min(100, Math.round(c.progress ?? 0)));
                    return (
                      <li key={c.enrollmentId || c.code}>
                        <span className={`fa-stat__ic tone-${TONES[i % TONES.length]}`}>
                          <Icon name={ICONS[i % ICONS.length]} size={16} />
                        </span>
                        <div>
                          <b>{c.name}</b>
                          <Progress value={p} />
                          {typeof c.enrollmentNumber === "string" && <small className="fa-sub">Enrollment ID <code>{c.enrollmentNumber}</code></small>}
                        </div>
                        <em>{p}%</em>
                        <Link className="fa-btn fa-btn--xs fa-btn--outline" to={`/academy/classroom/${encodeURIComponent(c.code)}`}>
                          Continue
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ))}
          </div>
          <div className="fa-card fa-pad">
            <div className="fa-cardhead">
              <h4>Upcoming Schedule</h4>
              <Link className="fa-link" to="/academy/calendar">
                Calendar
              </Link>
            </div>
            {dash.state.status === "loading" && <LoadState status="loading" />}
            {d &&
              (upcoming.length === 0 ? (
                <p className="fa-muted">Nothing scheduled.</p>
              ) : (
                <ul className="fa-upcoming">
                  {upcoming.map((e, i) => {
                    const id = String(e._id || e.id || "");
                    return (
                      <li key={id || e.title}>
                        <span className="fa-thumb" style={{ background: themeFor(e.title) }}>
                          <Icon name="calendar" size={15} />
                        </span>
                        <div>
                          <b>{e.title}</b>
                          <small>
                            {shortDate(e.startDate || e.date) || "Date TBA"}
                            {e.startTime ? `, ${e.startTime}` : ""}
                          </small>
                        </div>
                        <Link className={`fa-btn fa-btn--xs ${i === 0 ? "fa-btn--primary" : "fa-btn--outline"}`} to={id ? `/academy/events/${encodeURIComponent(id)}` : "/academy/calendar"}>
                          View
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ))}
          </div>
        </div>
      </DashShell>
    </div>
  );
}

/** School students: their school's classes (members-only ones too), one click to open and enroll. */
function MySchool({ s, enrolled }: { s: PublicSchool; enrolled: Set<string> }) {
  return (
    <div className="fa-card fa-pad fa-myschool">
      <div className="fa-cardhead">
        <h4>
          <Icon name="building" size={16} /> My school · {s.name}
        </h4>
        <Link className="fa-link" to={`/academy/schools/${encodeURIComponent(s.slug)}`}>
          School page
        </Link>
      </div>
      {s.classes.length === 0 ? (
        <p className="fa-muted">Your school hasn&apos;t published any classes yet.</p>
      ) : (
        <ul className="fa-myschool__list">
          {s.classes.map((c) => {
            const joined = enrolled.has(c.code.toUpperCase());
            return (
              <li key={c.code}>
                <div>
                  <b>{c.name}</b>
                  <small className="fa-muted">
                    {KIND_LABEL[c.kind as Kind] ?? "Class"} · {formatPrice(c.isFree, c.price, c.currency)}
                    {c.visibility === "school" ? " · members only" : ""}
                  </small>
                </div>
                {joined ? (
                  <Link className="fa-btn fa-btn--xs fa-btn--outline" to={`/academy/classroom/${encodeURIComponent(c.code)}`}>
                    Continue
                  </Link>
                ) : (
                  <Link className="fa-btn fa-btn--xs fa-btn--primary" to={`/academy/learn/${encodeURIComponent(c.code)}`}>
                    Open &amp; enroll
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
