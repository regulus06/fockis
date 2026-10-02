import { useNavigate } from 'react-router-dom';

import { JobCard, CareersSearchBar } from '../components';
import { useJobs } from '../hooks';

import type { Job } from '../types';

import styles from '../styles/CoopsPage.module.scss';

export function CoopsPage() {
  const navigate = useNavigate();

  const {
    jobs,
    total,
    isLoading,
    error,
  } = useJobs('coops');

  const openJob = (job: Job) => {
    navigate(`/careers/jobs/${job.id}`);
  };

  const easyApply = (job: Job) => {
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  const handleSearch = () => {
    navigate('/careers/search', {
      state: {
        jobType: 'co-op',
      },
    });
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.eyebrow}>
          Co-operative education
        </div>

        <h1>
          Find a co-op that builds <em>real experience</em>
        </h1>

        <p className={styles.sub}>
          Multi-month rotations with academic credit,
          structured around your school's co-op calendar.
        </p>

        <CareersSearchBar
          keywordPlaceholder="Role, company, or term"
          onSearch={handleSearch}
        />

        <div className={styles.chipRow}>
          <span className={styles.chipTeal}>Paid</span>
          <span className={styles.chip}>Academic credit</span>
          <span className={styles.chip}>Hybrid</span>
          <span className={styles.chip}>16 weeks</span>
        </div>
      </section>

      <div className={styles.results}>
        <div className={styles.toolbar}>
          <div>
            <b>{total}</b> co-ops found
          </div>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {isLoading ? (
          <div className={styles.loading}>
            Loading co-ops…
          </div>
        ) : jobs.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🔎</div>

            <h3>No co-ops found</h3>

            <p>
              Try searching for another role, company,
              location, or term.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {jobs.map((job: Job) => (
              <JobCard
                key={job.id}
                job={job}
                onOpen={openJob}
                onEasyApply={easyApply}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}