import { useMemo, useState } from 'react';
import { JobListing, JobType } from '../../types/academy';
import { useAcademyToast } from '../../lib/academyToastStore';
import { submitJobApplication } from '../../lib/academyApi';

const TYPES: (JobType | 'all')[] = ['all', 'job', 'internship', 'apprenticeship'];

export default function CareerBoard({ jobs, hideFilters = false }: { jobs: JobListing[]; hideFilters?: boolean }) {
  const [filter, setFilter] = useState<JobType | 'all'>('all');
  const [activeJob, setActiveJob] = useState<JobListing | null>(null);
  const showToast = useAcademyToast((s) => s.showToast);

  const filtered = useMemo(
    () => (hideFilters || filter === 'all' ? jobs : jobs.filter((j) => j.type === filter)),
    [filter, jobs, hideFilters]
  );

  async function handleApply(job: JobListing) {
    setActiveJob(null);
    if (!job._id) {
      showToast("Couldn't submit application — job id missing.");
      return;
    }
    try {
      await submitJobApplication(job._id);
      showToast(`Application started: ${job.title}`);
    } catch (err) {
      console.error('Failed to submit job application', err);
      showToast("Couldn't submit application. Please try again.");
    }
  }

  return (
    <>
      {!hideFilters && (
        <div className="filter-row">
          {TYPES.map((t) => (
            <button key={t} className={`chip${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>
              {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1) + 's'}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-3">
        {filtered.map((job) => (
          <div className="card job-card" key={job.title}>
            <div className="row-top">
              <div>
                <h3 style={{ fontSize: 16.5 }}>{job.title}</h3>
                <p style={{ fontSize: 13.5, marginTop: 4 }}>{job.company} · {job.loc}</p>
              </div>
              <span className="badge badge-gold">{job.type}</span>
            </div>
            <p style={{ marginTop: 12, fontSize: 14 }}>
              Pay: <strong style={{ color: 'var(--ink)' }}>{job.pay}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button className="btn btn-outline btn-sm" onClick={() => setActiveJob(job)}>View Job</button>
              <button className="btn btn-navy btn-sm" onClick={() => handleApply(job)}>Apply</button>
            </div>
          </div>
        ))}
      </div>

      <div className={`modal-overlay${activeJob ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && setActiveJob(null)}>
        {activeJob && (
          <div className="modal-box">
            <button className="modal-close" onClick={() => setActiveJob(null)}>&times;</button>
            <span className="badge badge-gold">{activeJob.type}</span>
            <h2 style={{ marginTop: 12 }}>{activeJob.title}</h2>
            <p style={{ marginTop: 6 }}>{activeJob.company} · {activeJob.loc}</p>
            <p style={{ marginTop: 16, fontWeight: 600, color: 'var(--ink)' }}>Pay: {activeJob.pay}</p>
            <p style={{ marginTop: 14 }}>{activeJob.desc}</p>
            <button className="btn btn-navy" style={{ marginTop: 22 }} onClick={() => handleApply(activeJob)}>
              Apply Now
            </button>
          </div>
        )}
      </div>
    </>
  );
}
