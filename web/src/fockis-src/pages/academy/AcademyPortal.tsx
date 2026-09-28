import { useEffect, useState } from 'react';
import { getStudentCourses, getStudentDashboard, StudentDashboard } from '../../lib/academyApi';
import { Course } from '../../types/academy';
import PageHero from '../../components/academy/PageHero';
import DashboardPreview from '../../components/academy/DashboardPreview';

export default function AcademyPortal() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<StudentDashboard | null>(null);

  useEffect(() => {
    getStudentCourses('demo-student').then(setCourses).catch((err) => console.error('Failed to load courses', err));
    getStudentDashboard('demo-student').then(setStats).catch((err) => console.error('Failed to load dashboard', err));
  }, []);

  return (
    <>
      <PageHero crumb="Students" title="Student Portal" subtitle="Welcome back — here is a snapshot of your academic year." />
      <section className="section">
        <div className="wrap">
          <DashboardPreview stats={stats} courses={courses} />
        </div>
      </section>
    </>
  );
}
