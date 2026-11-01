import { Link } from 'react-router-dom';
import { Briefcase, MapPin } from 'lucide-react';
import styles from '../styles/JobCard.module.scss';
import { Badge } from '../../employer/components/shared/EmployerStatusBadge';
import { CompanyLogo } from './CompanyLogo';
import { SaveJobButton } from './SaveJobButton';
import type { Job } from '../types';
import { formatSalary, isNewJob, placeLabel, postedLabel, typeLabel } from '../utils/jobFormat';

/** Job listing card: logo, title, company, location, type, salary, save. */
export function JobCard({ job, showSave = true }: { job: Job; showSave?: boolean }) {
  const salary = formatSalary(job);
  return (
    <div className={`${styles.card} ${styles.relative}`}>
      <CompanyLogo name={job.company.name} src={job.company.logoUrl} />
      <div className={styles.body}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>
            <Link to={`/careers/jobs/${job.id}`}>{job.title}</Link>
          </h3>
          {isNewJob(job) && <Badge tone="success">New</Badge>}
          {job.kind !== 'job' && <Badge tone="orange">{typeLabel(job)}</Badge>}
        </div>
        <p className={styles.company}>
          {job.company.id ? <Link to={`/careers/companies/${job.company.id}`}>{job.company.name}</Link> : job.company.name}
        </p>
        <div className={styles.meta}>
          <span><MapPin size={13} aria-hidden="true" /> {placeLabel(job)}</span>
          <span><Briefcase size={13} aria-hidden="true" /> {typeLabel(job)}</span>
          {job.applyMode === 'external' && <span>Applies on company site</span>}
        </div>
      </div>
      <div className={styles.side}>
        {showSave && <SaveJobButton jobId={job.id} title={job.title} />}
        {salary && <span className={styles.salary}>{salary}</span>}
        <span className={styles.posted}>{postedLabel(job.postedAt)}</span>
      </div>
    </div>
  );
}

export default JobCard;
