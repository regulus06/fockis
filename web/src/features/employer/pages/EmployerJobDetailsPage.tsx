import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ExternalLink, Eye, FileText, Globe, Info, Pause, Pencil, Play, Trash2, UserCheck, Users } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { StatCard } from '../components/shared/StatCard';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { JobStatusBadge, JobTypeBadge } from '../components/shared/EmployerStatusBadge';
import { FunnelChart } from '../components/charts/FunnelChart';
import { useEmployerJobDetails } from '../hooks/useEmployerJobDetails';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { getErrorMessage } from '../hooks/useEmployerQuery';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import { EMPLOYER_BASE_PATH, SALARY_PERIOD_LABELS, WORKPLACE_LABELS } from '../utils/employerConstants';
import { formatEmployerDate, formatEmployerNumber } from '../utils/employerFormatters';
import type { EmployerJob } from '../types';

function salaryLabel(job: EmployerJob) {
  const fmt = (n: number) => formatEmployerNumber(n);
  const range =
    job.salaryMin != null && job.salaryMax != null
      ? `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)}`
      : job.salaryMin != null
        ? fmt(job.salaryMin)
        : job.salaryMax != null
          ? fmt(job.salaryMax)
          : job.salary;
  if (!range) return 'Not specified';
  const period = job.salaryPeriod ? ` ${SALARY_PERIOD_LABELS[job.salaryPeriod]}` : '';
  return `${job.currency ? `${job.currency} ` : ''}${range}${period}`;
}

const STATUS_HELP: Record<EmployerJob['status'], string> = {
  active: 'Visible in Fockis job search and accepting applications.',
  pending_approval: 'Waiting for Fockis review. It will appear in public search once approved.',
  paused: 'Hidden from candidates. Activate it to accept applications again.',
  expired: 'The application deadline has passed. Edit the deadline to reopen it.',
};

export function EmployerJobDetailsPage() {
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { isOwner, can } = useEmployerPermissions();
  const { data: job, loading, error, refetch } = useEmployerJobDetails(jobId);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggleActive = async () => {
    if (!job) return;
    setBusy(true);
    try {
      await employerApi.setJobActive(job.id, !job.isActive);
      notify(job.isActive ? 'Job paused.' : 'Job activated.');
      await refetch();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!job) return;
    await employerApi.deleteJob(job.id);
    notify(`"${job.title}" was deleted.`);
    navigate(`${EMPLOYER_BASE_PATH}/jobs`, { replace: true });
  };

  if (loading && !job) return <div className={ui.card}><EmployerLoading label="Loading job…" /></div>;
  if (error || !job) {
    return (
      <div className={ui.card}>
        <EmployerError title="Job unavailable" message={error ?? 'This job could not be found.'} onRetry={refetch} />
        <p style={{ textAlign: 'center' }}><Link to={`${EMPLOYER_BASE_PATH}/jobs`} className={ui.linkBtn}>Back to job listings</Link></p>
      </div>
    );
  }

  const pipeline = job.pipeline ?? {};
  const reached = (statuses: string[]) => statuses.reduce((sum, status) => sum + (pipeline[status] ?? 0), 0);
  const qualified = reached(['shortlisted', 'interview', 'offer']);

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title={job.title}
        description={`${job.company} · ${job.location}`}
        back={{ to: `${EMPLOYER_BASE_PATH}/jobs`, label: 'Job listings' }}
        art={false}
        action={
          <>
            {job.status === 'active' && (
              <a href={`/careers/jobs/${job.id}`} target="_blank" rel="noopener noreferrer" className={ui.btnSecondary}>
                <ExternalLink size={15} /> Public page
              </a>
            )}
            {can('manageJobs') && (
              <button type="button" className={ui.btnSecondary} onClick={toggleActive} disabled={busy}>
                {job.isActive ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Activate</>}
              </button>
            )}
            {isOwner && (
              <>
                <Link to={`${EMPLOYER_BASE_PATH}/jobs/${job.id}/edit`} className={ui.btnPrimary}><Pencil size={15} /> Edit</Link>
                <button type="button" className={ui.iconBtn} onClick={() => setConfirmDelete(true)} aria-label="Delete job" title="Delete job">
                  <Trash2 size={17} />
                </button>
              </>
            )}
          </>
        }
      />

      <div className={ui.row}>
        <JobStatusBadge status={job.status} />
        <JobTypeBadge type={job.type} />
        <span className={ui.muted} style={{ fontSize: 13 }}>{STATUS_HELP[job.status]}</span>
      </div>

      <div className={ui.statGrid}>
        <StatCard icon={<Eye size={19} />} label="Job Views" value={job.viewCount} />
        <StatCard icon={<FileText size={19} />} label="Applications" value={job.applicationsCount} />
        <StatCard icon={<UserCheck size={19} />} label="Qualified" value={qualified} hint="Shortlisted, interview or hired" />
        <StatCard
          icon={<Users size={19} />}
          label="View → apply rate"
          value={job.viewCount ? `${Math.round((job.applicationsCount / job.viewCount) * 1000) / 10}%` : '—'}
          hint={job.applicationMethod === 'external' ? 'External applications are not tracked' : undefined}
        />
      </div>

      <div className={ui.split}>
        <div className={ui.card}>
          <h2 className={ui.sectionTitle}>Description</h2>
          <div className={ui.prose}>{job.description}</div>
          {job.skills.length > 0 && (
            <>
              <h3 className={ui.sectionTitle} style={{ marginTop: 20 }}>Required skills</h3>
              <div className={ui.chips}>{job.skills.map((skill) => <span key={skill} className={ui.tag}>{skill}</span>)}</div>
            </>
          )}
          {job.benefits.length > 0 && (
            <>
              <h3 className={ui.sectionTitle} style={{ marginTop: 20 }}>Benefits</h3>
              <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc', color: '#4a5272', fontSize: 14, lineHeight: 1.7 }}>
                {job.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
              </ul>
            </>
          )}
          {job.companyDescription && (
            <>
              <h3 className={ui.sectionTitle} style={{ marginTop: 20 }}>About {job.company}</h3>
              <div className={ui.prose}>{job.companyDescription}</div>
            </>
          )}
        </div>

        <div className={ui.page}>
          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>Details</h2>
            <dl className={ui.dl}>
              <div><dt>Workplace</dt><dd>{WORKPLACE_LABELS[job.workplaceType]}</dd></div>
              <div><dt>Salary</dt><dd>{salaryLabel(job)}</dd></div>
              <div><dt>Published</dt><dd>{formatEmployerDate(job.createdAt)}</dd></div>
              <div><dt>Application deadline</dt><dd>{job.applicationDeadline ? formatEmployerDate(job.applicationDeadline) : 'None'}</dd></div>
              {job.companyWebsite && (
                <div><dt>Company website</dt><dd><a href={job.companyWebsite} target="_blank" rel="noopener noreferrer">{job.companyWebsite}</a></dd></div>
              )}
            </dl>
          </div>

          <div className={ui.card}>
            <h2 className={ui.sectionTitle}>How candidates apply</h2>
            {job.applicationMethod === 'external' && job.applicationUrl ? (
              <>
                <p style={{ margin: '0 0 10px', fontSize: 14 }}><Globe size={14} style={{ verticalAlign: -2 }} /> On your company website</p>
                <a href={job.applicationUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, overflowWrap: 'anywhere' }}>
                  {job.applicationUrl}
                </a>
                <p className={ui.notice} style={{ marginTop: 12 }}>
                  <Info size={16} /> Candidates who click Apply Now are redirected to this URL, so their applications don't appear in Fockis.
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 12px', fontSize: 14 }}>On Fockis with the Fockis application form.</p>
                <Link to={`${EMPLOYER_BASE_PATH}/applicants?jobId=${job.id}`} className={`${ui.btnSecondary} ${ui.btnSm}`}>
                  View {job.applicationsCount} applicant{job.applicationsCount === 1 ? '' : 's'}
                </Link>
              </>
            )}
          </div>

          {job.applicationsCount > 0 && (
            <div className={ui.card}>
              <h2 className={ui.sectionTitle}>Pipeline</h2>
              <FunnelChart
                stages={[
                  { stage: 'applied', label: 'All', count: job.applicationsCount },
                  { stage: 'viewed', label: 'Reviewed+', count: reached(['viewed', 'shortlisted', 'interview', 'offer']) },
                  { stage: 'shortlisted', label: 'Shortlisted+', count: qualified },
                  { stage: 'interview', label: 'Interview+', count: reached(['interview', 'offer']) },
                  { stage: 'offer', label: 'Hired', count: pipeline.offer ?? 0 },
                ]}
              />
              <p className={ui.muted} style={{ fontSize: 12, marginBottom: 0 }}>{pipeline.rejected ?? 0} rejected · by current status</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmActionModal
        open={confirmDelete}
        title="Delete this job?"
        description={`"${job.title}" will be permanently removed and its applications will no longer appear in your Employer Center. To hide it temporarily, pause it instead.`}
        confirmLabel="Delete job"
        variant="danger"
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}

export default EmployerJobDetailsPage;
