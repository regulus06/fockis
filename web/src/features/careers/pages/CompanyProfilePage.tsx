import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { JobCard } from '../components';
import { companiesApi } from '../services';

import type { Company, Job } from '../types';

import styles from '../styles/CompanyProfilePage.module.scss';

export function CompanyProfilePage() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();

  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!companyId) return;

    const loadCompany = async () => {
      try {
        const [companyData, jobsData] = await Promise.all([
          companiesApi.getCompanyById(companyId),
          companiesApi.getCompanyJobs(companyId),
        ]);

        setCompany(companyData);
        setJobs(jobsData);
      } catch {
        setCompany(null);
        setJobs([]);
      }
    };

    void loadCompany();
  }, [companyId]);

  if (!company) {
    return (
      <div className={styles.loading}>
        Loading company…
      </div>
    );
  }

  const openJob = (job: Job) => {
    navigate(`/careers/jobs/${job.id}`);
  };

  const easyApply = (job: Job) => {
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  return (
    <div className={styles.page}>
      <div
        className={styles.cover}
        style={
          company.coverImageUrl
            ? {
                backgroundImage: `url(${company.coverImageUrl})`,
              }
            : undefined
        }
      >
        <div className={styles.headerCard}>
          <div className={styles.bigLogo}>
            {company.initials}
          </div>

          <div className={styles.nameBlock}>
            <div className={styles.name}>
              {company.name}

              {company.verified && (
                <span className={styles.verified}>
                  ✔
                </span>
              )}
            </div>

            <div className={styles.sub}>
              {company.industry} · {company.location} ·{' '}
              {company.employeeCount} employees
            </div>
          </div>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={styles.ghostBtn}
          onClick={() => {
            void navigator.clipboard?.writeText(
              window.location.href,
            );
          }}
        >
          ↗ Share
        </button>

        <button className={styles.outlineBtn}>
          Follow
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => navigate('/careers/search')}
        >
          View open roles
        </button>
      </div>

      <div className={styles.grid}>
        <div>
          <section>
            <h3>About</h3>
            <p>{company.about}</p>
          </section>

          {company.mission && (
            <section>
              <h3>Mission</h3>
              <p>{company.mission}</p>
            </section>
          )}

          <section>
            <h3>Culture & benefits</h3>

            <div className={styles.tags}>
              {company.benefits.map((benefit) => (
                <span
                  key={benefit.id}
                  className={styles.tag}
                >
                  {benefit.label}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h3>Open positions</h3>

            <div className={styles.jobList}>
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  layout="list"
                  onOpen={openJob}
                  onEasyApply={easyApply}
                />
              ))}
            </div>
          </section>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.infoCard}>
            <div className={styles.infoRow}>
              <span>Industry</span>
              <b>{company.industry}</b>
            </div>

            <div className={styles.infoRow}>
              <span>HQ</span>
              <b>{company.location}</b>
            </div>

            <div className={styles.infoRow}>
              <span>Company size</span>
              <b>{company.employeeCount}</b>
            </div>

            {company.website && (
              <div className={styles.infoRow}>
                <span>Website</span>
                <b className={styles.link}>
                  {company.website}
                </b>
              </div>
            )}

            {company.foundedYear && (
              <div className={styles.infoRow}>
                <span>Founded</span>
                <b>{company.foundedYear}</b>
              </div>
            )}
          </div>

          {company.rating && (
            <div className={styles.infoCard}>
              <div className={styles.reviewLabel}>
                Employee reviews
              </div>

              <div className={styles.rating}>
                {company.rating} / 5
              </div>

              <div className={styles.reviewCount}>
                Based on {company.reviewCount} reviews
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}