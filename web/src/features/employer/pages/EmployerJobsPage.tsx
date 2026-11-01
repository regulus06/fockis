import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Eye, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EmployerPagination } from '../components/shared/EmployerPagination';
import { ActionMenu } from '../components/shared/ActionMenu';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { JobStatusBadge, JobTypeBadge } from '../components/shared/EmployerStatusBadge';
import { useEmployerJobs } from '../hooks/useEmployerJobs';
import { useDebouncedValue, getErrorMessage } from '../hooks/useEmployerQuery';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { EmployerJob } from '../types';
import { EMPLOYER_BASE_PATH, JOB_STATUS_LABELS, JOB_TYPE_LABELS } from '../utils/employerConstants';
import { formatEmployerDate } from '../utils/employerFormatters';

const PAGE_SIZE = 10;

export function EmployerJobsPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const { isOwner, can } = useEmployerPermissions();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, loading, error, refetch } = useEmployerJobs({
    search: debouncedSearch,
    type,
    status,
    page,
    limit: PAGE_SIZE,
  });

  const [toDelete, setToDelete] = useState<EmployerJob | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const toggleActive = async (job: EmployerJob) => {
    setBusyId(job.id);
    try {
      await employerApi.setJobActive(job.id, !job.isActive);
      notify(job.isActive ? `"${job.title}" is paused and hidden from candidates.` : `"${job.title}" is active again.`);
      await refetch();
    } catch (err) {
      notify(getErrorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await employerApi.deleteJob(toDelete.id);
    notify(`"${toDelete.title}" was deleted.`);
    setToDelete(null);
    if (data && data.items.length === 1 && page > 1) setPage(page - 1);
    else await refetch();
  };

  const filtersActive = Boolean(debouncedSearch || type !== 'all' || status !== 'all');

  return (
    <div className={ui.page}>
      <EmployerPageHeader
        title="Job Listings"
        description="Create, edit, and manage your job opportunities."
        action={
          isOwner && (
            <Link to={`${EMPLOYER_BASE_PATH}/jobs/new`} className={ui.btnPrimary}>
              <Plus size={16} /> Create Job
            </Link>
          )
        }
      />

      <div className={ui.cardFlush}>
        <div className={ui.toolbar}>
          <SearchInput value={search} onChange={resetPage(setSearch)} placeholder="Search jobs by title or location…" />
          <label>
            <span className={ui.srOnly}>Job type</span>
            <select className={ui.select} value={type} onChange={(e) => resetPage(setType)(e.target.value)}>
              <option value="all">All Types</option>
              {Object.entries(JOB_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className={ui.srOnly}>Status</span>
            <select className={ui.select} value={status} onChange={(e) => resetPage(setStatus)(e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                  {data?.statusCounts[value as keyof typeof data.statusCounts] ? ` (${data.statusCounts[value as keyof typeof data.statusCounts]})` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && !data && <EmployerLoading rows={6} label="Loading jobs" />}
        {error && <EmployerError message={error} onRetry={refetch} />}

        {data && !error && data.items.length === 0 && (
          filtersActive ? (
            <EmployerEmptyState title="No jobs match your filters" description="Try a different search or clear the filters." action={
              <button type="button" className={ui.btnSecondary} onClick={() => { setSearch(''); setType('all'); setStatus('all'); setPage(1); }}>Clear filters</button>
            } />
          ) : (
            <EmployerEmptyState
              icon={<Briefcase size={24} />}
              title="You haven't posted any jobs yet"
              description="Create a listing and choose whether candidates apply on Fockis or on your company website."
              action={isOwner && <Link to={`${EMPLOYER_BASE_PATH}/jobs/new`} className={ui.btnPrimary}><Plus size={16} /> Create Job</Link>}
            />
          )
        )}

        {data && data.items.length > 0 && (
          <>
            <div className={ui.tableWrap} aria-busy={loading}>
              <table className={`${ui.table} ${ui.responsiveTable}`}>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th className={ui.num}>Applications</th>
                    <th>Status</th>
                    <th>Published</th>
                    <th><span className={ui.srOnly}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((job) => (
                    <tr key={job.id}>
                      <td data-label="Job">
                        <Link to={`${EMPLOYER_BASE_PATH}/jobs/${job.id}`} className={ui.cellTitle}>{job.title}</Link>
                        <span className={ui.cellSub}>{job.applicationMethod === 'external' ? 'Applies on company website' : 'Applies on Fockis'}</span>
                      </td>
                      <td data-label="Type"><JobTypeBadge type={job.type} /></td>
                      <td data-label="Location">{job.location}</td>
                      <td data-label="Applications" className={ui.num}>
                        {job.applicationMethod === 'external' && job.applicationsCount === 0 ? (
                          <span className={ui.muted} title="Candidates apply on your website">External</span>
                        ) : (
                          <Link to={`${EMPLOYER_BASE_PATH}/applicants?jobId=${job.id}`} className={ui.cellTitle}>{job.applicationsCount}</Link>
                        )}
                      </td>
                      <td data-label="Status"><JobStatusBadge status={job.status} /></td>
                      <td data-label="Published">{formatEmployerDate(job.createdAt)}</td>
                      <td data-label="">
                        <ActionMenu
                          label={`Actions for ${job.title}`}
                          items={[
                            { label: 'View details', icon: <Eye size={15} />, onSelect: () => navigate(`${EMPLOYER_BASE_PATH}/jobs/${job.id}`) },
                            { label: 'Edit job', icon: <Pencil size={15} />, onSelect: () => navigate(`${EMPLOYER_BASE_PATH}/jobs/${job.id}/edit`), hidden: !isOwner },
                            {
                              label: job.isActive ? 'Pause job' : 'Activate job',
                              icon: job.isActive ? <Pause size={15} /> : <Play size={15} />,
                              onSelect: () => void toggleActive(job),
                              disabled: busyId === job.id,
                              hidden: !can('manageJobs'),
                            },
                            { label: 'Delete job', icon: <Trash2 size={15} />, danger: true, onSelect: () => setToDelete(job), hidden: !isOwner },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <EmployerPagination page={data.page} pages={data.pages} total={data.total} limit={data.limit} noun="jobs" onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmActionModal
        open={Boolean(toDelete)}
        title="Delete this job?"
        description={`"${toDelete?.title ?? ''}" will be permanently removed from Fockis Careers and its applications will no longer appear in your Employer Center. To hide it temporarily, pause it instead.`}
        confirmLabel="Delete job"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

export default EmployerJobsPage;
