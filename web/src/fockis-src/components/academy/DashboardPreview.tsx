import { Link } from 'react-router-dom';
import { Course } from '../../types/academy';
import { StudentDashboard } from '../../lib/academyApi';

export default function DashboardPreview({ stats, courses }: { stats: StudentDashboard | null; courses: Course[] }) {
  return (
    <div className="dash-frame">
      <div className="dash-topbar">
        <strong>Welcome back, {stats?.name ?? '…'}</strong>
        <span className="badge badge-gold">Fall 2026</span>
      </div>
      <div className="dash-body">
        <div className="stat-row">
          <div className="stat-box"><span>{stats ? stats.gpa.toFixed(1) : '—'}</span><small>Current GPA</small></div>
          <div className="stat-box"><span>{stats?.creditsCompleted ?? '—'}</span><small>Credits Completed</small></div>
          <div className="stat-box"><span>{stats?.currentCourseCount ?? courses.length}</span><small>Current Courses</small></div>
          <div className="stat-box"><span>{stats ? `${stats.attendancePct}%` : '—'}</span><small>Attendance</small></div>
        </div>
        <h3 style={{ fontSize: 16, marginBottom: 6 }}>Current Courses</h3>
        <div>
          {courses.length === 0 && <p>No enrollments to show yet.</p>}
          {courses.map((c) => (
            <div className="course-row" key={c.code}>
              <span className="course-code">{c.code}</span>
              <div className="course-info">
                <strong>{c.name}</strong>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${c.progress}%` }} />
                </div>
              </div>
              <span className="badge badge-navy">{c.grade}</span>
            </div>
          ))}
        </div>
        <Link className="btn btn-navy" style={{ marginTop: 22, display: 'inline-flex' }} to="/academy/lms">
          Continue Learning
        </Link>
      </div>
    </div>
  );
}
