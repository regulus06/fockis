import { useEffect, useState } from 'react';
import { getFaculty } from '../../lib/academyApi';
import { FacultyMember } from '../../types/academy';
import PageHero from '../../components/academy/PageHero';
import FacultyGrid from '../../components/academy/FacultyGrid';

export default function AcademyFaculty() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);

  useEffect(() => {
    getFaculty()
      .then(setFaculty)
      .catch((err) => console.error('Failed to load faculty', err));
  }, []);

  return (
    <>
      <PageHero crumb="About" title="Meet Our Faculty" subtitle="Instructors and program leaders across every Fockis Academy department." />
      <section className="section">
        <div className="wrap">
          <FacultyGrid faculty={faculty} />
        </div>
      </section>
    </>
  );
}
