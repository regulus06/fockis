import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJobs } from '../../lib/academyApi';
import { JobListing } from '../../types/academy';
import PageHero from '../../components/academy/PageHero';
import CareerBoard from '../../components/academy/CareerBoard';
import { useContentSection } from '../../lib/useContentSection';

export default function AcademyCareer() {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const services = useContentSection('career-services');

  useEffect(() => {
    getJobs()
      .then(setJobs)
      .catch((err) => console.error('Failed to load jobs', err));
  }, []);

  return (
    <>
      <PageHero crumb="Career Center" title="Turn Education Into a Career" subtitle="Job placement, internships, and coaching built directly into your Fockis Academy experience." />
      <section className="section">
        <div className="wrap">
          {services.loading && <p>Loading…</p>}
          {!services.loading && services.error && <p>Couldn&apos;t load this section right now.</p>}
          {!services.loading && !services.error && (
            <div className="grid grid-3" style={{ marginBottom: 48 }}>
              {services.items.map((i) => (
                <div className="card" style={{ padding: 20 }} key={i._id ?? i.title}>
                  <h3 style={{ fontSize: 15 }}>{i.title}</h3>
                </div>
              ))}
            </div>
          )}

          <div className="section-head" style={{ marginBottom: 24 }}>
            <div className="eyebrow">Job Board</div>
            <h2>Open Roles for Fockis Students</h2>
          </div>
          <CareerBoard jobs={jobs} />

          <div className="divider"></div>

          <div className="section-head">
            <div className="eyebrow">For Employers</div>
            <h2>Partner With Fockis Academy</h2>
            <p>Hire students, post internships, sponsor programs, and recruit graduates before they enter the open market.</p>
          </div>
          <Link className="btn btn-navy" to="/academy/employers">Become an Employer Partner</Link>
        </div>
      </section>
    </>
  );
}
