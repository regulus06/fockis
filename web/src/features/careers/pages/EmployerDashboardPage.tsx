
import { useState } from 'react';

import {
  StatCard,
  EmployerJobRow,
} from '../components';

import { useEmployerJobs } from '../hooks';

import { employerApi } from '../services';

import type { EmployerJobSummary } from '../types';

import styles from '../styles/EmployerDashboardPage.module.scss';

type JobType = 'internship' | 'co-op' | 'full-time' | 'part-time' | 'contract';
type Arrangement = 'remote' | 'hybrid' | 'on-site';

interface EmployerJobForm {
  title: string;
  company: string;
  jobType: JobType;
  city: string;
  country: string;
  location: string;
  arrangement: Arrangement;
  salaryRange: string;
  deadline: string;
  description: string;
  skills: string;
  benefits: string;
}

const INITIAL_FORM: EmployerJobForm = {
  title: '',
  company: '',
  jobType: 'internship',
  city: '',
  country: 'United States',
  location: '',
  arrangement: 'hybrid',
  salaryRange: '',
  deadline: '',
  description: '',
  skills: '',
  benefits: '',
};

export function EmployerDashboardPage() {
  const {
    jobs,
    stats,
    isLoading,
  } = useEmployerJobs();

  const [form, setForm] = useState<EmployerJobForm>(INITIAL_FORM);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof EmployerJobForm>(
    field: K,
    value: EmployerJobForm[K],
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleManage = (job: EmployerJobSummary) => {
    setStatus(
      `Selected "${job.title}". Job editing and applicant management require the corresponding employer management endpoints.`,
    );
  };

  const handlePublish = async () => {
    if (isSubmitting) return;

    const title = form.title.trim();
    const company = form.company.trim();
    const city = form.city.trim();
    const country = form.country.trim();
    const description = form.description.trim();

    if (!title || !company || !city || !country || !description) {
      setStatus(
        'Please complete the job title, company, city, country, and description.',
      );
      return;
    }

    if (form.deadline) {
      const deadline = new Date(`${form.deadline}T23:59:59`);

      if (Number.isNaN(deadline.getTime()) || deadline.getTime() < Date.now()) {
        setStatus('Please select a valid future application deadline.');
        return;
      }
    }

    const salaryText = form.salaryRange.trim().toLowerCase();

    const salaryPeriod =
      salaryText.includes('/hr') ||
      salaryText.includes('hour') ||
      salaryText.includes('hourly')
        ? 'hourly'
        : salaryText.includes('/day') ||
            salaryText.includes('daily')
          ? 'daily'
          : salaryText.includes('/week') ||
              salaryText.includes('weekly')
            ? 'weekly'
            : salaryText.includes('/month') ||
                salaryText.includes('monthly')
              ? 'monthly'
              : salaryText.includes('/yr') ||
                  salaryText.includes('year') ||
                  salaryText.includes('yearly')
                ? 'yearly'
                : salaryText
                  ? 'negotiable'
                  : undefined;

    const type =
      form.jobType === 'internship'
        ? 'internship'
        : form.jobType === 'co-op'
          ? 'coop'
          : 'job';

    const workplaceType =
      form.arrangement === 'remote'
        ? 'remote'
        : form.arrangement === 'hybrid'
          ? 'hybrid'
          : 'onsite';

    const skills = form.skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    const benefits = form.benefits
      .split(',')
      .map((benefit) => benefit.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    setStatus('Submitting your job for review…');

    try {
      await employerApi.postJob({
        title,
        company,
        city,
        country,
        location: form.location.trim() || `${city}, ${country}`,
        type,
        workplaceType,
        description,
        salary: form.salaryRange.trim() || undefined,
        currency: form.salaryRange.trim() ? 'USD' : undefined,
        salaryPeriod,
        remote: form.arrangement === 'remote',
        applicationDeadline: form.deadline || undefined,
        skills,
        benefits,
      });

      setStatus(
        'Your job was submitted successfully and is awaiting admin approval before appearing publicly.',
      );

      setForm(INITIAL_FORM);
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : 'Could not submit your job. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    if (isSubmitting) return;

    setForm(INITIAL_FORM);
    setStatus('The form has been cleared.');
  };

  return (
    <div className={styles.page}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1>Employer dashboard</h1>
          <p>Managing {jobs.length} job listings</p>
        </div>

        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => {
            document.getElementById('employer-job-form')?.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
            });
          }}
        >
          + Post a job
        </button>
      </div>

      {/* STATISTICS */}
      <div className={styles.stats}>
        <StatCard
          value={stats?.openJobs ?? '—'}
          label="Open jobs"
        />

        <StatCard
          value={stats?.totalApplicants ?? '—'}
          label="Total applicants"
        />

        <StatCard
          value={stats?.inInterview ?? '—'}
          label="In interview"
        />

        <StatCard
          value={stats ? `${stats.hireRate}%` : '—'}
          label="Applicant → hire rate"
        />
      </div>

      {/* MANAGE JOBS */}
      <div className={styles.sectionHead}>
        <h2>Manage jobs</h2>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          Loading employer jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className={styles.empty}>
          You haven't posted any jobs yet.
        </div>
      ) : (
        jobs.map((job) => (
          <EmployerJobRow
            key={job.id}
            job={job}
            onManage={handleManage}
          />
        ))
      )}

      {/* CREATE JOB */}
      <div
        id="employer-job-form"
        className={styles.sectionHead}
        style={{ marginTop: 32 }}
      >
        <h2>Create a job listing</h2>
      </div>

      <div className={styles.formCard}>
        {/* JOB TITLE AND COMPANY */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="job-title">Job title *</label>

            <input
              id="job-title"
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="e.g. Software Engineering Intern"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="job-company">Company name *</label>

            <input
              id="job-company"
              value={form.company}
              onChange={(event) => updateField('company', event.target.value)}
              placeholder="Your registered company name"
              required
            />
          </div>
        </div>

        {/* JOB TYPE AND ARRANGEMENT */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="job-type">Job type *</label>

            <select
              id="job-type"
              value={form.jobType}
              onChange={(event) =>
                updateField('jobType', event.target.value as JobType)
              }
            >
              <option value="internship">Internship</option>
              <option value="co-op">Co-op</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="job-arrangement">Work arrangement *</label>

            <select
              id="job-arrangement"
              value={form.arrangement}
              onChange={(event) =>
                updateField('arrangement', event.target.value as Arrangement)
              }
            >
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
              <option value="on-site">On-site</option>
            </select>
          </div>
        </div>

        {/* LOCATION */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="job-city">City *</label>

            <input
              id="job-city"
              value={form.city}
              onChange={(event) => updateField('city', event.target.value)}
              placeholder="e.g. Columbus"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="job-country">Country *</label>

            <input
              id="job-country"
              value={form.country}
              onChange={(event) => updateField('country', event.target.value)}
              placeholder="e.g. United States"
              required
            />
          </div>
        </div>

        <div className={styles.field}>
          <label htmlFor="job-location">Full location (optional)</label>

          <input
            id="job-location"
            value={form.location}
            onChange={(event) => updateField('location', event.target.value)}
            placeholder="e.g. Columbus, Ohio, United States"
          />
        </div>

        {/* SALARY AND DEADLINE */}
        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="job-salary">Salary range</label>

            <input
              id="job-salary"
              value={form.salaryRange}
              onChange={(event) =>
                updateField('salaryRange', event.target.value)
              }
              placeholder="$20–$25/hr"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="job-deadline">Application deadline</label>

            <input
              id="job-deadline"
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={form.deadline}
              onChange={(event) => updateField('deadline', event.target.value)}
            />
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className={styles.field}>
          <label htmlFor="job-description">Job description *</label>

          <textarea
            id="job-description"
            rows={5}
            value={form.description}
            onChange={(event) =>
              updateField('description', event.target.value)
            }
            placeholder="Describe the role, responsibilities, and expectations."
            required
          />
        </div>

        {/* SKILLS */}
        <div className={styles.field}>
          <label htmlFor="job-skills">Required skills</label>

          <input
            id="job-skills"
            value={form.skills}
            onChange={(event) => updateField('skills', event.target.value)}
            placeholder="Python, SQL, Communication"
          />

          <small>Separate skills with commas.</small>
        </div>

        {/* BENEFITS */}
        <div className={styles.field}>
          <label htmlFor="job-benefits">Benefits</label>

          <input
            id="job-benefits"
            value={form.benefits}
            onChange={(event) => updateField('benefits', event.target.value)}
            placeholder="Health insurance, Paid time off, Training"
          />

          <small>Separate benefits with commas.</small>
        </div>

        {/* STATUS */}
        {status && (
          <p
            className={styles.status}
            role="status"
            aria-live="polite"
          >
            {status}
          </p>
        )}

        {/* ACTIONS */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={handleClear}
            disabled={isSubmitting}
          >
            Clear form
          </button>

          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => void handlePublish()}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting…' : 'Submit job for approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
