import { useEffect, useMemo, useState } from 'react';
import { getAllEnrollments } from '../../../lib/academyApi';
import AdminTable, { AdminColumn } from '../../../components/academy/admin/AdminTable';

interface EnrollmentRow {
  _id: string;
  student: { name?: string; email?: string; slug?: string } | null;
  courseCode: string;
  courseName: string;
  progress: number;
  grade: string;
  createdAt: string;
}

export default function AcademyAdminEnrollments() {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');

  function load() {
    setLoading(true);
    setError(false);
    getAllEnrollments()
      .then((data) => setEnrollments(data as EnrollmentRow[]))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const courses = useMemo(() => [...new Set(enrollments.map((e) => e.courseCode))], [enrollments]);

  const filtered = enrollments.filter((e) => {
    const studentName = e.student?.name ?? '';
    const matchesSearch = `${studentName} ${e.courseName}`.toLowerCase().includes(search.toLowerCase());
    const matchesCourse = courseFilter === 'all' || e.courseCode === courseFilter;
    return matchesSearch && matchesCourse;
  });

  const columns: AdminColumn<EnrollmentRow>[] = [
    { key: 'student', label: 'Student', render: (e) => e.student?.name ?? <em style={{ color: 'var(--ink-soft)' }}>Deleted student</em> },
    { key: 'course', label: 'Course', render: (e) => <span><span className="mono">{e.courseCode}</span> — {e.courseName}</span> },
    {
      key: 'progress', label: 'Progress', render: (e) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="progress-track" style={{ width: 90 }}><div className="progress-fill" style={{ width: `${e.progress}%` }} /></div>
          <span style={{ fontSize: 12.5 }}>{e.progress}%</span>
        </div>
      ),
    },
    { key: 'grade', label: 'Grade', render: (e) => e.grade },
    { key: 'enrolled', label: 'Enrolled', render: (e) => new Date(e.createdAt).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="admin-page-head">
        <div><h1>Enrollments</h1><p>Every student's enrollment across every course, read from real MongoDB records.</p></div>
      </div>
      <div className="admin-toolbar">
        <div className="admin-search"><input placeholder="Search by student or course…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <select className="admin-filter-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
          <option value="all">All Courses</option>
          {courses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <AdminTable
        columns={columns} rows={filtered} rowKey={(e) => e._id} loading={loading} error={error}
        emptyMessage={search || courseFilter !== 'all' ? 'No enrollments match your filters.' : 'No enrollments yet.'} onRetry={load}
      />
    </div>
  );
}
