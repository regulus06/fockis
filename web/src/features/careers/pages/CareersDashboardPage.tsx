import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Bookmark, BriefcaseBusiness, CalendarCheck, CircleCheck, Circle, FileText, Search } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { StatCard } from '../../employer/components/shared/StatCard';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { ApplicationStageBadge } from '../components/ApplicationStageBadge';
import { CareersError, SignedIn } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { JobCard } from '../components/JobCard';
import { displayName, useCareerUser } from '../hooks/useCareerUser';
import { useSavedJobs } from '../hooks/useSavedJobs';
import { applicationsApi } from '../services/applicationsApi';
import { careersApi } from '../services/careersApi';
import { profileApi } from '../services/profileApi';
import { STAGE_OF } from '../utils/applicationStatus';
import { formatDate } from '../utils/jobFormat';
import type { CareerProfile, FockisUser, Job } from '../types';

export function CareersDashboardPage() {
  return <SignedIn>{(user) => <Overview user={user} />}</SignedIn>;
}

function completenessChecks(profile: CareerProfile | null) {
  return [
    { label: 'Add a headline', done: Boolean(profile?.headline) },
    { label: 'Write a short summary', done: Boolean(profile?.summary) },
    { label: 'Upload your resume', done: Boolean(profile?.resume) },
    { label: 'Add education', done: Boolean(profile?.education.length) },
    { label: 'Add work experience', done: Boolean(profile?.experience.length) },
    { label: 'List at least 3 skills', done: (profile?.skills.length ?? 0) >= 3 },
  ];
}

/** Recommend open jobs that share skills or words with the profile; newest first otherwise. */
function recommend(jobs: Job[], profile: CareerProfile | null, excluded: Set<string>): Job[] {
  const terms = new Set(
    [...(profile?.skills ?? []), ...(profile?.headline ?? '').split(/\s+/)]
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 2),
  );
  const scored = jobs
    .filter((job) => !excluded.has(job.id))
    .map((job) => {
      const hay = `${job.title} ${job.skills.join(' ')}`.toLowerCase();
      let score = 0;
      terms.forEach((term) => {
        if (hay.includes(term)) score += 1;
      });
      return { job, score };
    });
  scored.sort((a, b) => b.score - a.score || new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime());
  return scored.slice(0, 4).map((s) => s.job);
}

function Overview({ user }: { user: FockisUser }) {
  const applications = useEmployerQuery(() => applicationsApi.getMyApplications(), []);
  const profile = useEmployerQuery(() => profileApi.get(), []);
  const jobs = useEmployerQuery(() => careersApi.fetchAllJobs(), []);
  const saved = useSavedJobs();
  const newAlertMatches = useCareerUser((s) => s.newAlertMatches);

  useEffect(() => {
    void saved.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apps = applications.data ?? [];
  const interviews = apps.filter((a) => STAGE_OF[a.status] === 'interview').length;
  const applied = useMemo(() => new Set(apps.map((a) => a.job?.id).filter(Boolean) as string[]), [apps]);
  const recommended = useMemo(() => recommend(jobs.data ?? [], profile.data, applied), [jobs.data, profile.data, applied]);
  const checks = completenessChecks(profile.data);
  const firstName = user.firstName || displayName(user).split(' ')[0];

  return (
    <div className={styles.page}>
      <div className={styles.welcome}>
        <div>
          <h1>Welcome back{firstName ? `, ${firstName}` : ''}!</h1>
          <p>Here's what's happening with your job search.</p>
        </div>
        <div className={styles.welcomeActions}>
          <Link to="/careers/jobs" className={ui.btnPrimary}><Search size={16} /> Find jobs</Link>
          <Link to="/careers/profile" className={ui.btnSecondary}>Edit profile</Link>
        </div>
      </div>

      <div className={styles.stats}>
        <StatCard icon={<BriefcaseBusiness size={18} />} label="Applications" value={applications.loading ? null : apps.length} />
        <StatCard icon={<CalendarCheck size={18} />} label="Interviews" value={applications.loading ? null : interviews} />
        <StatCard icon={<Bookmark size={18} />} label="Saved Jobs" value={saved.loaded ? saved.entries.length : null} />
        <StatCard icon={<Bell size={18} />} label="New alert matches" value={newAlertMatches} />
      </div>

      <div className={styles.twoCol}>
        <div className={styles.stack}>
          <div className={ui.card}>
            <div className={styles.cardHead}>
              <h2>Recent Applications</h2>
              <Link to="/careers/applications" className={ui.linkBtn}>View all</Link>
            </div>
            {applications.loading ? (
              <EmployerLoading label="Loading applications…" />
            ) : applications.error ? (
              <CareersError message={applications.error} onRetry={applications.refetch} />
            ) : apps.length === 0 ? (
              <EmployerEmptyState
                icon={<BriefcaseBusiness size={22} />}
                title="No applications yet"
                description="When you apply to a job on Fockis it shows up here with its status."
                action={<Link to="/careers/jobs" className={ui.btnPrimary}>Browse jobs</Link>}
              />
            ) : (
              <ul className={styles.rows}>
                {apps.slice(0, 5).map((app) => (
                  <li key={app.id} className={styles.rowItem}>
                    <CompanyLogo name={app.job?.company.name ?? 'Job'} src={app.job?.company.logoUrl} size="sm" />
                    <div className={styles.rowMain}>
                      {app.job ? <Link to={`/careers/jobs/${app.job.id}`} className={styles.rowTitle}>{app.job.title}</Link> : <strong>Job no longer available</strong>}
                      <span>{app.job?.company.name ?? '—'} · Applied {formatDate(app.appliedAt)}</span>
                    </div>
                    <div className={styles.rowEnd}><ApplicationStageBadge status={app.status} /></div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className={styles.cardHead}>
              <h2>Recommended for you</h2>
              <Link to="/careers/jobs" className={ui.linkBtn}>See all jobs</Link>
            </div>
            {jobs.loading ? (
              <div className={ui.card}><EmployerLoading label="Finding jobs…" /></div>
            ) : jobs.error ? (
              <div className={ui.card}><CareersError message={jobs.error} onRetry={jobs.refetch} /></div>
            ) : recommended.length === 0 ? (
              <div className={ui.card}><EmployerEmptyState title="No open jobs right now" description="Check back soon or create a job alert." /></div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {recommended.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            )}
          </div>
        </div>

        <div className={styles.stack}>
          <div className={ui.card}>
            <div className={styles.cardHead}><h2>Profile strength</h2></div>
            {profile.loading ? (
              <EmployerLoading label="Loading profile…" />
            ) : profile.error ? (
              <CareersError message={profile.error} onRetry={profile.refetch} />
            ) : (
              <>
                <div className={styles.meterLabel}>
                  <span>Complete your profile to stand out to employers</span>
                  <strong>{profile.data?.completeness ?? 0}%</strong>
                </div>
                <div className={styles.meter} role="progressbar" aria-valuenow={profile.data?.completeness ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completeness">
                  <span style={{ width: `${profile.data?.completeness ?? 0}%` }} />
                </div>
                <ul className={styles.checklist}>
                  {checks.map((c) => (
                    <li key={c.label}>
                      {c.done ? <CircleCheck size={16} className={styles.done} /> : <Circle size={16} className={styles.todo} />}
                      {c.label}
                    </li>
                  ))}
                </ul>
                <Link to="/careers/profile" className={ui.btnSecondary} style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}>
                  Improve profile
                </Link>
              </>
            )}
          </div>

          <div className={ui.card}>
            <div className={styles.cardHead}><h2>My Resume</h2></div>
            {profile.data?.resume ? (
              <div className={styles.resumeBox}>
                <span className={styles.resumeIcon}><FileText size={20} /></span>
                <div className={styles.resumeText}>
                  <strong>{profile.data.resume.fileName}</strong>
                  <span>Uploaded {formatDate(profile.data.resume.uploadedAt)}</span>
                </div>
              </div>
            ) : (
              <p className={ui.prose} style={{ marginTop: 0 }}>Upload a resume once and attach it to every application in one click.</p>
            )}
            <Link to="/careers/resume" className={ui.btnSecondary} style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}>
              {profile.data?.resume ? 'Manage resume' : 'Upload resume'}
            </Link>
          </div>

          <div className={ui.card}>
            <div className={styles.cardHead}>
              <h2>Job Alerts</h2>
              <Link to="/careers/alerts" className={ui.linkBtn}>Manage</Link>
            </div>
            <p className={ui.prose} style={{ margin: 0 }}>
              {newAlertMatches > 0
                ? `${newAlertMatches} new job${newAlertMatches === 1 ? '' : 's'} match your alerts.`
                : profile.data?.jobAlertCount
                  ? 'No new matches since you last checked.'
                  : 'Save a search to get new matches here.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareersDashboardPage;
