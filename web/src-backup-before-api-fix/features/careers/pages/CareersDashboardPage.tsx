import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { StatCard, StatusPill, JobCard } from '../components';
import { useMyApplications, useJobs } from '../hooks';

import type { Job } from '../types';

import styles from '../styles/CareersDashboardPage.module.scss';

const TABS = [
  'overview',
  'tracker',
  'saved',
  'recommended',
  'profile',
] as const;

type Tab = (typeof TABS)[number];

export function CareersDashboardPage() {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>('overview');

  const {
    applications,
    isLoading,
  } = useMyApplications();

  const {
    jobs: recommended,
  } = useJobs('jobs');

  const openJob = (job: Job) => {
    navigate(`/careers/jobs/${job.id}`);
  };

  const easyApply = (job: Job) => {
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  const interviewCount = applications.filter(
    (application) => application.status === 'interview',
  ).length;

  return (
    <div className={styles.page}>
      {/* ============================================================
          HEADER
      ============================================================ */}
      <div className={styles.header}>
        <h1>Your careers dashboard</h1>

        <p>
          Welcome back — here's where things stand.
        </p>
      </div>

      <div className={styles.layout}>
        {/* ==========================================================
            DASHBOARD NAVIGATION
        ========================================================== */}
        <nav className={styles.nav}>
          {TABS.map((currentTab) => (
            <button
              key={currentTab}
              type="button"
              className={
                tab === currentTab
                  ? styles.active
                  : ''
              }
              onClick={() => setTab(currentTab)}
            >
              {currentTab === 'overview' && 'Overview'}

              {currentTab === 'tracker' &&
                'Application tracker'}

              {currentTab === 'saved' &&
                'Saved jobs'}

              {currentTab === 'recommended' &&
                'Recommended'}

              {currentTab === 'profile' &&
                'Profile'}
            </button>
          ))}
        </nav>

        <div>
          {/* ========================================================
              PROFILE COMPLETION
          ======================================================== */}
          <div className={styles.progressCard}>
            <div>
              <div className={styles.progressTitle}>
                Profile completion
              </div>

              <div className={styles.progressSub}>
                Add a resume to boost your match rate
              </div>
            </div>

            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{ width: '72%' }}
              />
            </div>

            <div className={styles.mono}>
              72%
            </div>
          </div>

          {/* ========================================================
              STATS
          ======================================================== */}
          <div className={styles.stats}>
            <StatCard
              value={applications.length}
              label="Applications"
              trend="+3 this week"
            />

            <StatCard
              value={interviewCount}
              label="Interviews"
            />

            <StatCard
              value={21}
              label="Saved jobs"
            />

            <StatCard
              value={recommended.length}
              label="Recommended"
            />
          </div>

          {/* ========================================================
              APPLICATION TRACKER
          ======================================================== */}
          <div className={styles.sectionHead}>
            <h2>Application tracker</h2>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              Loading applications…
            </div>
          ) : applications.length === 0 ? (
            <div className={styles.loading}>
              No applications yet.
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>

              <tbody>
                {applications.map((application) => (
                  <tr key={application.id}>
                    <td className={styles.roleCell}>
                      {application.jobTitle}
                    </td>

                    <td>
                      {application.companyName}
                    </td>

                    <td>
                      {application.jobType}
                    </td>

                    <td>
                      <StatusPill
                        status={application.status}
                      />
                    </td>

                    <td className={styles.mono}>
                      {new Date(
                        application.updatedAt,
                      ).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* ========================================================
              RECOMMENDED JOBS
          ======================================================== */}
          <div
            className={styles.sectionHead}
            style={{ marginTop: 32 }}
          >
            <h2>Recommended for you</h2>
          </div>

          {recommended.length === 0 ? (
            <div className={styles.loading}>
              No recommended jobs available.
            </div>
          ) : (
            <div className={styles.rail}>
              {recommended
                .slice(0, 3)
                .map((job) => (
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
    </div>
  );
}