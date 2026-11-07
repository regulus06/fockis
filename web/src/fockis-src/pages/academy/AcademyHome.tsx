import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/academy/market/Icon";
import { HeroDuo } from "../../components/academy/market/Art";
import { Person } from "../../components/academy/market/Shared";
import { LoadState } from "../../components/academy/learn/CourseCard";
import FaCourseCard from "../../components/academy/market/FaCourseCard";
import { useAcademyLoad } from "../../lib/useAcademyLoad";
import { getCatalogCourses, shortDate } from "../../lib/academyLearnApi";
import { getEvents, getFaculty } from "../../lib/academyApi";

/**
 * ============================================================================
 * FOCKIS ACADEMY — HOMEPAGE (design board screen 2: Learning Marketplace)
 * ============================================================================
 *
 * Every list on this page comes from the real Academy backend:
 *   Featured courses  → GET /academy/courses/catalog
 *   Upcoming seminars → GET /academy/events
 *   Instructors       → GET /academy/faculty
 *
 * No invented statistics, ratings or prices. The institutional homepage
 * (design board screen 1) is at /academy/campus.
 */

const OFFERINGS = [
  { name: "Courses", icon: "book", href: "/academy/learn" },
  { name: "Live Classes", icon: "monitor", href: "/academy/online-learning" },
  { name: "Seminars", icon: "mic", href: "/academy/calendar" },
  { name: "Workshops", icon: "users", href: "/academy/calendar" },
  { name: "Certificates", icon: "award", href: "/academy/portal/certificates" },
  { name: "Career Learning", icon: "shield", href: "/academy/career" },
];

/** Each runs a real search over course names and descriptions. */
const CATEGORIES = [
  { name: "Technology", q: "technology", icon: "cpu", tone: "blue" },
  { name: "Business", q: "business", icon: "chart", tone: "purple" },
  { name: "Culinary Arts", q: "culinary", icon: "chef", tone: "amber" },
  { name: "Health & Wellness", q: "health", icon: "heart", tone: "red" },
  { name: "Design & Arts", q: "design", icon: "palette", tone: "green" },
  { name: "Education", q: "education", icon: "cap", tone: "sky" },
];

export default function AcademyHome() {
  const courses = useAcademyLoad(getCatalogCourses);
  const events = useAcademyLoad(getEvents);
  const faculty = useAcademyLoad(getFaculty);

  const featured = useMemo(() => (courses.state.status === "ready" ? courses.state.data.slice(0, 8) : []), [courses.state]);

  const upcoming = useMemo(() => {
    if (events.state.status !== "ready") return [];
    const now = Date.now();
    return events.state.data
      .filter((e) => e.isActive !== false)
      .map((e) => ({ e, when: new Date(e.startDate || e.date || "").getTime() }))
      .filter(({ when }) => Number.isNaN(when) || when >= now - 86400000)
      .sort((a, b) => (a.when || 0) - (b.when || 0))
      .slice(0, 4)
      .map(({ e }) => e);
  }, [events.state]);

  return (
    <div className="fa-root fa-page">
      <div className="fa-container">
        {/* HERO */}
        <section className="fa-mhero">
          <div className="fa-mhero__copy">
            <h1>
              Learn • Teach • Host • Earn
              <br />
              on Fockis Academy
            </h1>
            <p>Discover courses, attend live classes, join seminars and workshops, or become an instructor and share your expertise.</p>
            <div className="fa-mhero__btns">
              <Link className="fa-btn fa-btn--primary" to="/academy/learn">
                Explore Courses
              </Link>
              <Link className="fa-btn fa-btn--white" to="/academy/teach">
                Become an Instructor
              </Link>
            </div>
          </div>
          <HeroDuo className="fa-mhero__art" />
        </section>

        {/* OFFERINGS */}
        <section className="fa-offer">
          {OFFERINGS.map((o) => (
            <Link key={o.name} to={o.href} className="fa-offer__item">
              <Icon name={o.icon} size={26} stroke={1.6} />
              <span>{o.name}</span>
            </Link>
          ))}
        </section>

        {/* CATEGORIES */}
        <section className="fa-section">
          <h3 className="fa-h3">Explore by Category</h3>
          <div className="fa-cats">
            {CATEGORIES.map((c) => (
              <Link key={c.name} to={`/academy/learn?q=${encodeURIComponent(c.q)}`} className={`fa-cat tone-${c.tone}`}>
                <Icon name={c.icon} size={22} />
                <span>{c.name}</span>
              </Link>
            ))}
            <Link to="/academy/learn" className="fa-cat tone-gray">
              <span>More</span>
            </Link>
          </div>
        </section>

        {/* FEATURED COURSES */}
        <section className="fa-section">
          <div className="fa-sechead">
            <h3 className="fa-h3">Featured Courses</h3>
            <Link className="fa-link" to="/academy/learn">
              View all <Icon name="right" size={14} />
            </Link>
          </div>
          {courses.state.status === "loading" && <LoadState status="loading" />}
          {courses.state.status === "error" && <LoadState status="error" error={courses.state.error} onRetry={courses.reload} />}
          {courses.state.status === "ready" &&
            (featured.length === 0 ? (
              <LoadState status="empty" empty="No courses are published yet." />
            ) : (
              <div className="fa-cgrid">
                {featured.map((c) => (
                  <FaCourseCard key={c._id || c.code} course={c} />
                ))}
              </div>
            ))}
        </section>

        {/* SEMINARS & EVENTS */}
        <section className="fa-section">
          <div className="fa-sechead">
            <h3 className="fa-h3">Upcoming Seminars & Workshops</h3>
            <Link className="fa-link" to="/academy/calendar">
              Calendar <Icon name="right" size={14} />
            </Link>
          </div>
          {events.state.status === "loading" && <LoadState status="loading" />}
          {events.state.status === "error" && <LoadState status="error" error={events.state.error} onRetry={events.reload} />}
          {events.state.status === "ready" &&
            (upcoming.length === 0 ? (
              <LoadState status="empty" empty="No upcoming seminars scheduled." />
            ) : (
              <div className="fa-egrid">
                {upcoming.map((e) => {
                  const id = String(e._id || e.id || "");
                  return (
                    <Link key={id || e.title} to={id ? `/academy/events/${encodeURIComponent(id)}` : "/academy/calendar"} className="fa-card fa-ecard">
                      <span className="fa-ecard__date">
                        <Icon name="calendar" size={14} /> {shortDate(e.startDate || e.date) || "Date to be announced"}
                        {e.startTime ? ` · ${e.startTime}` : ""}
                      </span>
                      <b>{e.title}</b>
                      {(e.location || (e.loc as string | undefined)) && (
                        <small>
                          <Icon name="monitor" size={12} /> {(e.location || (e.loc as string | undefined))}
                        </small>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
        </section>

        {/* INSTRUCTORS */}
        <section className="fa-section">
          <div className="fa-sechead">
            <h3 className="fa-h3">Our Instructors</h3>
            <Link className="fa-link" to="/academy/faculty">
              All instructors <Icon name="right" size={14} />
            </Link>
          </div>
          {faculty.state.status === "loading" && <LoadState status="loading" />}
          {faculty.state.status === "error" && <LoadState status="error" error={faculty.state.error} onRetry={faculty.reload} />}
          {faculty.state.status === "ready" &&
            (faculty.state.data.length === 0 ? (
              <LoadState status="empty" empty="Instructor profiles will appear here." />
            ) : (
              <div className="fa-igrid">
                {faculty.state.data
                  .filter((p) => p.isActive !== false)
                  .slice(0, 6)
                  .map((p, i) => {
                    const photo = (p.photoUrl || p.imageUrl || p.avatarUrl) as string | undefined;
                    return (
                      <Link key={String(p._id || p.id || p.name)} to="/academy/faculty" className="fa-card fa-icard">
                        {photo ? <img src={photo} alt="" /> : <Person look={{ skin: i % 6, hair: i % 6, shirt: "#1d5ee8", style: i % 2 ? "long" : "short" }} size={64} />}
                        <b>{p.name}</b>
                        {Boolean(p.title || p.position || p.pos) && <small>{String(p.title || p.position || p.pos)}</small>}
                      </Link>
                    );
                  })}
              </div>
            ))}
        </section>

        <section className="fa-cta">
          <div>
            <h2>Have something to teach?</h2>
            <p>Create courses, host seminars and help learners build real skills on Fockis Academy.</p>
          </div>
          <Link className="fa-btn fa-btn--white" to="/academy/teach">
            Become an Instructor
          </Link>
        </section>
      </div>
    </div>
  );
}
