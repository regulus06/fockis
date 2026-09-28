import { useEffect, useState } from 'react';
import { getCourseModules } from '../../lib/academyApi';
import PageHero from '../../components/academy/PageHero';
import LmsCoursePage from '../../components/academy/LmsCoursePage';

export default function AcademyLms() {
  const [modules, setModules] = useState<string[]>([]);

  useEffect(() => {
    getCourseModules('CYBER 101').then(setModules).catch((err) => console.error('Failed to load course modules', err));
  }, []);

  return (
    <>
      <PageHero crumb="Students" title="Fockis Learn" subtitle="CYBER 101 — Introduction to Cybersecurity" />
      <section className="section">
        <div className="wrap">
          <LmsCoursePage modules={modules} />
        </div>
      </section>
    </>
  );
}
