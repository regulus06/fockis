import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Briefcase,
  CalendarClock,
  CircleCheck,
  Clock3,
  ExternalLink,
  GraduationCap,
  Laptop,
  MapPin,
  Share2,
} from 'lucide-react';
import ui from '../../employer/styles/EmployerShared.module.scss';
import styles from '../styles/CareersPages.module.scss';
import { EmployerLoading } from '../../employer/components/shared/EmployerLoading';
import { useEmployerQuery } from '../../employer/hooks/useEmployerQuery';
import { useNotify } from '../../employer/store/employerNotificationStore';
import { Badge, ApplicationStatusBadge } from '../../employer/components/shared/EmployerStatusBadge';
import { CareersError } from '../components/CareersState';
import { CompanyLogo } from '../components/CompanyLogo';
import { SaveJobButton } from '../components/SaveJobButton';
import { useJobDetails } from '../hooks/useJobDetails';
import { useCareerUser } from '../hooks/useCareerUser';
import { careersApi } from '../services/careersApi';
import { companiesApi } from '../services/companiesApi';
import { applicationsApi } from '../services/applicationsApi';
import { isExternalJob, openExternalApplication } from '../utils/externalApply';
import {
  EXPERIENCE_LABELS,
  REQUIREMENT_HEADING,
  RESPONSIBILITY_HEADING,
  WORKPLACE_LABELS,
  deadlinePassed,
  formatDate,
  formatSalary,
  placeLabel,
  postedLabel,
  splitDescription,
  typeLabel,
} from '../utils/jobFormat';

type Tab = 'overview' | 'requirements' | 'benefits' | 'company';

export function JobDetailsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const notify = useNotify();
  const user = useCareerUser((state) => state.user);
  const [tab, setTab] = useState<Tab>('overview');

  const { job, isLoading, error, refetch } = useJobDetails(jobId);

  const company = useEmployerQuery(() => companiesApi.getCompanyById(job?.company.id ?? ''), [job?.company.id], {
    enabled: Boolean(job?.company.id),
  });
  const similar = useEmployerQuery(() => (job ? careersApi.similarJobs(job) : Promise.resolve([])), [job?.id], { enabled: Boolean(job) });
  const mine = useEmployerQuery(() => applicationsApi.getMyApplications(), [user?.username, jobId], { enabled: Boolean(user) });

  const existing = mine.data?.find((app) => app.job?.id === jobId);
  const parts = useMemo(() => splitDescription(job?.description ?? ''), [job?.description]);

  if (isLoading && !job) return <div className={ui.card}><EmployerLoading label="Loading job…" /></div>;
  if (error || !job) {
    return (
      <div className={ui.card}>
        <CareersError message={error ?? 'This job is no longer available.'} onRetry={refetch} />
        <p style={{ textAlign: 'center' }}><Link to="/careers/jobs" className={ui.linkBtn}>Browse other jobs</Link></p>
      </div>
    );
  }

  const external = isExternalJob(job);
  const closed = deadlinePassed(job);
  const responsibilities = parts.sections.filter((s) => RESPONSIBILITY_HEADING.test(s.heading));
  const requirements = parts.sections.filter((s) => REQUIREMENT_HEADING.test(s.heading));
  const otherSections = parts.sections.filter((s) => !responsibilities.includes(s) && !requirements.includes(s));
  const verified = company.data?.verified ?? false;
  const salary = formatSalary(job);

  const apply = () => {
    if (external) {
      if (!openExternalApplication(job.applicationUrl)) notify('This application link is not valid.', 'error');
      return;
    }
    navigate(`/careers/jobs/${job.id}/apply`);
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${job.title} at ${job.company.name}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      notify('Job link copied to clipboard.');
    } catch {
      /* share sheet dismissed */
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/careers/jobs" className={ui.linkBtn} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        <ArrowLeft size={14} /> Back to jobs
      </Link>

      <div className={styles.detailLayout}>
        <div className={styles.page}>
          <div className={styles.detailHeader}>
            <div className={styles.cover}>{company.data?.coverImageUrl && <img src={company.data.coverImageUrl} alt="" />}</div>
            <div className={styles.headerBody}>
              <CompanyLogo name={job.company.name} src={job.company.logoUrl ?? company.data?.logoUrl} size="lg" />
              <div className={styles.headerText}>
                <div className={styles.companyLine}>
                  {job.company.id ? <Link to={`/careers/companies/${job.company.id}`}>{job.company.name}</Link> : job.company.name}
                  {verified && <BadgeCheck size={18} color="#1677e8" aria-label="Verified company" />}
                </div>
                <h1>{job.title}</h1>
                <div className={styles.headerMeta}>
                  <span><MapPin size={14} /> {placeLabel(job)}</span>
                  <span><Briefcase size={14} /> {typeLabel(job)}</span>
                  {salary && <span><Banknote size={14} /> {salary}</span>}
                  <span><Clock3 size={14} /> Posted {postedLabel(job.postedAt)}</span>
                </div>
                <div className={styles.headerActions}>
                  {existing ? (
                    <Link to="/careers/applications" className={`${ui.btnSecondary} ${styles.applyBtn}`}>
                      <CircleCheck size={16} color="#15803d" /> Applied · <ApplicationStatusBadge status={existing.status} />
                    </Link>
                  ) : (
                    <button type="button" className={`${ui.btnPrimary} ${styles.applyBtn}`} onClick={apply} disabled={closed}>
                      {closed ? 'Applications closed' : external ? <>Apply Now <ExternalLink size={15} /></> : 'Apply Now'}
                    </button>
                  )}
                  <SaveJobButton jobId={job.id} title={job.title} variant="button" />
                  <button type="button" className={ui.iconBtn} onClick={share} aria-label="Share this job" title="Share">
                    <Share2 size={18} />
                  </button>
                </div>
                {external && !existing && (
                  <p className={ui.hint} style={{ margin: '8px 0 0' }}>You'll apply on {job.company.name}'s website (opens in a new tab).</p>
                )}
              </div>
            </div>

            <div className={ui.tabs} role="tablist" aria-label="Job information" style={{ padding: '0 14px' }}>
              {(['overview', 'requirements', 'benefits', 'company'] as Tab[]).map((value) => (
                <button key={value} type="button" role="tab" className={ui.tab} aria-selected={tab === value} onClick={() => setTab(value)}>
                  {value[0].toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.tabPanel} role="tabpanel">
              {tab === 'overview' && (
                <>
                  <h2>Job Description</h2>
                  {parts.intro.map((line, i) => <p key={i}>{line}</p>)}
                  {[...responsibilities, ...otherSections].map((section) => (
                    <div key={section.heading}>
                      <h3>{RESPONSIBILITY_HEADING.test(section.heading) ? 'Key Responsibilities' : section.heading}</h3>
                      <ul>{section.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                  ))}
                  {!parts.intro.length && !parts.sections.length && <p>No description provided.</p>}
                </>
              )}

              {tab === 'requirements' && (
                <>
                  <h2>Requirements</h2>
                  {requirements.map((section) => (
                    <div key={section.heading}>
                      <h3>{section.heading}</h3>
                      <ul>{section.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
                    </div>
                  ))}
                  {job.experienceLevel && <p><strong>Experience level:</strong> {EXPERIENCE_LABELS[job.experienceLevel]}</p>}
                  {job.skills.length > 0 && (
                    <>
                      <h3>Skills</h3>
                      <div className={ui.chips}>{job.skills.map((skill) => <span key={skill} className={ui.tag}>{skill}</span>)}</div>
                    </>
                  )}
                  {!requirements.length && !job.skills.length && !job.experienceLevel && (
                    <p>The employer didn't list specific requirements. See the job description for details.</p>
                  )}
                </>
              )}

              {tab === 'benefits' && (
                <>
                  <h2>Benefits</h2>
                  {job.benefits.length ? <ul>{job.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul> : <p>The employer didn't list benefits for this job.</p>}
                  {salary && <p style={{ marginTop: 14 }}><strong>Compensation:</strong> {salary}</p>}
                </>
              )}

              {tab === 'company' && (
                <>
                  <h2>About {job.company.name}</h2>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{company.data?.about || job.companyDescription || 'No company description yet.'}</p>
                  <div className={ui.row}>
                    {job.company.id && <Link to={`/careers/companies/${job.company.id}`} className={`${ui.btnSecondary} ${ui.btnSm}`}>View company page</Link>}
                    {(company.data?.website || job.companyWebsite) && (
                      <a href={company.data?.website || job.companyWebsite} target="_blank" rel="noopener noreferrer" className={`${ui.btnSecondary} ${ui.btnSm}`}>
                        Website <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <aside className={styles.page}>
          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Job Summary</h2>
            <ul className={styles.summaryList}>
              <li><Briefcase size={17} /><div><span>Employment type</span>{typeLabel(job)}</div></li>
              <li><Laptop size={17} /><div><span>Workplace</span>{WORKPLACE_LABELS[job.workplace]}</div></li>
              <li><MapPin size={17} /><div><span>Location</span>{[job.city, job.stateProvince, job.country].filter(Boolean).join(', ')}</div></li>
              {salary && <li><Banknote size={17} /><div><span>Salary</span>{salary}</div></li>}
              {job.experienceLevel && <li><GraduationCap size={17} /><div><span>Experience</span>{EXPERIENCE_LABELS[job.experienceLevel]}</div></li>}
              <li>
                <CalendarClock size={17} />
                <div>
                  <span>Application deadline</span>
                  {job.applicationDeadline ? formatDate(job.applicationDeadline) : 'Open until filled'}
                  {closed && <> · <Badge tone="danger">Closed</Badge></>}
                </div>
              </li>
            </ul>
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Similar Jobs</h2>
            {similar.data?.length ? (
              <div className={styles.similar}>
                {similar.data.map((item) => (
                  <Link key={item.id} to={`/careers/jobs/${item.id}`} className={styles.similarItem}>
                    <CompanyLogo name={item.company.name} src={item.company.logoUrl} size="sm" />
                    <span style={{ minWidth: 0 }}>
                      <strong>{item.title}</strong>
                      <span>{item.company.name} · {placeLabel(item)}</span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className={ui.muted} style={{ margin: 0, fontSize: 13.5 }}>{similar.loading ? 'Finding similar jobs…' : 'No similar jobs right now.'}</p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default JobDetailsPage;
