import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ExternalLink, Trash2 } from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/SeekerPages.module.scss';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { EmployerEmptyState } from '../../employer/components/shared/EmployerEmptyState';
import { Badge } from '../../employer/components/shared/EmployerStatusBadge';
import { getErrorMessage, useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { useNotify } from '../../employer/store/employerNotificationStore';
import { ApplicationStageBadge } from '../components/ApplicationStageBadge';
import { CareersError, SignedIn } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { useSavedJobs } from '../hooks/useSavedJobs';
import { applicationsApi } from '../services/applicationsApi';
import { isExternalJob, openExternalApplication } from '../utils/externalApply';
import { deadlinePassed, formatDate, formatSalary, placeLabel, typeLabel } from '../utils/jobFormat';
import type { ApplicationStatus } from '../types';

export function SavedJobsPage() {
  return <SignedIn>{() => <SavedJobs />}</SignedIn>;
}

function SavedJobs() {
  const notify = useNotify();
  const { entries, loaded, isLoading, error, load, toggleSave } = useSavedJobs();
  const applications = useEmployerQuery(() => applicationsApi.getMyApplications(), []);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    void load(true);
  }, [load]);

  const appliedStatus = useMemo(() => {
    const map = new Map<string, ApplicationStatus>();
    (applications.data ?? []).forEach((a) => a.job && map.set(a.job.id, a.status));
    return map;
  }, [applications.data]);

  const remove = async (jobId: string, title: string) => {
    setRemoving(jobId);
    try {
      await toggleSave(jobId);
      notify(`Removed "${title}" from saved jobs.`);
    } catch (err) {
      notify(getErrorMessage(err, 'Could not remove this job.'), 'error');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Saved Jobs</h1>
          <p>{loaded ? `${entries.length} saved job${entries.length === 1 ? '' : 's'}` : 'Jobs you bookmarked to come back to.'}</p>
        </div>
        <Link to="/careers/jobs" className={ui.btnSecondary}>Browse jobs</Link>
      </div>

      <div className={ui.card}>
        {isLoading && !loaded ? (
          <EmployerLoading label="Loading saved jobs…" />
        ) : error ? (
          <CareersError message={error} onRetry={() => void load(true)} />
        ) : entries.length === 0 ? (
          <EmployerEmptyState
            icon={<Bookmark size={22} />}
            title="No saved jobs"
            description="Tap the bookmark on any job to save it here."
            action={<Link to="/careers/jobs" className={ui.btnPrimary}>Find jobs</Link>}
          />
        ) : (
          <ul className={styles.rows}>
            {entries.map((entry) => {
              const job = entry.job;
              const status = appliedStatus.get(entry.jobId);
              const closed = !job || deadlinePassed(job);
              return (
                <li key={entry.id} className={styles.rowItem}>
                  <CompanyLogo name={job?.company.name ?? 'Job'} src={job?.company.logoUrl} />
                  <div className={styles.rowMain}>
                    {job ? <Link to={`/careers/jobs/${job.id}`} className={styles.rowTitle}>{job.title}</Link> : <strong>This job is no longer available</strong>}
                    <span>
                      {job ? `${job.company.name} · ${placeLabel(job)} · ${typeLabel(job)}` : 'The employer closed or removed it.'}
                    </span>
                    <span>
                      {job && formatSalary(job) ? `${formatSalary(job)} · ` : ''}Saved {formatDate(entry.savedAt)}
                    </span>
                  </div>
                  <div className={styles.rowEnd}>
                    {status ? (
                      <ApplicationStageBadge status={status} />
                    ) : closed ? (
                      <Badge tone="neutral">Closed</Badge>
                    ) : (
                      <Badge tone="success">Open</Badge>
                    )}
                    {job && !status && !closed && (
                      isExternalJob(job) ? (
                        <button type="button" className={`${ui.btnPrimary} ${ui.btnSm}`} onClick={() => openExternalApplication(job.applicationUrl)}>
                          Apply <ExternalLink size={13} />
                        </button>
                      ) : (
                        <Link to={`/careers/jobs/${job.id}/apply`} className={`${ui.btnPrimary} ${ui.btnSm}`}>Apply</Link>
                      )
                    )}
                    <button
                      type="button"
                      className={`${ui.iconBtn}`}
                      onClick={() => void remove(entry.jobId, job?.title ?? 'job')}
                      disabled={removing === entry.jobId}
                      aria-label={`Remove ${job?.title ?? 'job'} from saved jobs`}
                      title="Remove"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default SavedJobsPage;
