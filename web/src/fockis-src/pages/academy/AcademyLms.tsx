import { Link } from 'react-router-dom';
import PageHero from '../../components/academy/PageHero';
import { StateLine } from '../../components/academy/market/FaBlocks';
import { Icon } from '../../components/academy/market/Icon';
import { Progress } from '../../components/academy/market/Shared';
import { themeFor } from '../../components/academy/market/FaCourseCard';
import { useAcademyLoad } from '../../lib/useAcademyLoad';
import { getStoredToken, getStudentCourses, type StudentCourse } from '../../lib/academyApi';
import { instructorName } from '../../lib/academyLearnApi';

/**
 * /academy/lms — Fockis Learn. Lists the signed-in student's real courses
 * (GET /academy/courses/student) with progress and a link into each
 * course's classroom. (Replaces the old hard-coded "CYBER 101" demo.)
 */
export default function AcademyLms() {
  const hasToken = !!getStoredToken();
  const { state, reload } = useAcademyLoad(() => (hasToken ? getStudentCourses() : Promise.resolve([] as StudentCourse[])), [hasToken]);

  return (
    <div className="fa-root fa-page">
      <PageHero crumb="Students" title="Fockis Learn" subtitle="Your courses, lessons and live classrooms in one place." icon="book" actions={<Link className="fa-btn fa-btn--white" to="/academy/portal">Student Dashboard</Link>} />
      <div className="fa-container fa-section">
        {!hasToken ? (
          <div className="fa-card fa-gate">
            <h2>Sign in to Fockis Learn</h2>
            <p className="fa-muted">Sign in with your Academy account to see your courses.</p>
            <div className="fa-gate__btns">
              <Link className="fa-btn fa-btn--primary" to="/academy/admin/login">Sign in to Academy</Link>
              <Link className="fa-btn fa-btn--outline" to="/academy/learn">Browse courses</Link>
            </div>
          </div>
        ) : (
          <>
            <StateLine loading={state.status === 'loading'} error={state.status === 'error' ? state.error : false} onRetry={reload} />
            {state.status === 'ready' && state.data.length === 0 && (
              <div className="fa-card fa-pad fa-empty">
                <Icon name="book" size={30} />
                <b>You aren’t enrolled in any courses yet</b>
                <Link className="fa-btn fa-btn--primary" to="/academy/learn">Find a course</Link>
              </div>
            )}
            {state.status === 'ready' && state.data.length > 0 && (
              <div className="fa-fgrid fa-fgrid--3">
                {state.data.map((c) => {
                  const p = Math.max(0, Math.min(100, Math.round(c.progress ?? 0)));
                  const mods = Array.isArray(c.modules) ? c.modules.length : 0;
                  return (
                    <div key={c.enrollmentId || c.code} className="fa-card fa-lms">
                      <span className="fa-lms__thumb" style={{ background: themeFor(c.code) }}>
                        <Icon name="book" size={26} stroke={1.5} />
                        <em>{c.code}</em>
                      </span>
                      <div className="fa-lms__body">
                        <b>{c.name}</b>
                        <small className="fa-muted">{instructorName(c)} · {mods} {mods === 1 ? 'lesson' : 'lessons'}</small>
                        <div className="fa-lms__prog">
                          <Progress value={p} />
                          <span>{p}%</span>
                        </div>
                        <div className="fa-job__btns">
                          <Link className="fa-btn fa-btn--primary fa-btn--xs" to={`/academy/classroom/${encodeURIComponent(c.code)}`}>Continue</Link>
                          <Link className="fa-btn fa-btn--outline fa-btn--xs" to={`/academy/learn/${encodeURIComponent(c.code)}`}>Course page</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
