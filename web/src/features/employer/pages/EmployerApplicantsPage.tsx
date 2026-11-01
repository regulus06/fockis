import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarCheck, CircleCheck, CircleX, Eye, FileText, Star } from 'lucide-react';
import ui from '../styles/EmployerShared.module.scss';
import { EmployerPageHeader } from '../components/EmployerPageHeader';
import { SearchInput } from '../components/shared/SearchInput';
import { EmployerLoading } from '../components/shared/EmployerLoading';
import { EmployerError } from '../components/shared/EmployerError';
import { EmployerEmptyState } from '../components/shared/EmployerEmptyState';
import { EmployerPagination } from '../components/shared/EmployerPagination';
import { ActionMenu } from '../components/shared/ActionMenu';
import { Avatar } from '../components/shared/Avatar';
import { ConfirmActionModal } from '../components/shared/ConfirmActionModal';
import { ApplicationStatusBadge } from '../components/shared/EmployerStatusBadge';
import { useEmployerApplicants } from '../hooks/useEmployerApplicants';
import { useDebouncedValue, getErrorMessage, useEmployerQuery } from '../hooks/useEmployerQuery';
import { useEmployerPermissions } from '../hooks/useEmployerPermissions';
import { useEmployerStore } from '../store/employerStore';
import { useNotify } from '../store/employerNotificationStore';
import { employerApi } from '../services/employerApi';
import type { ApplicationStatus, EmployerApplicantRow } from '../types';
import { APPLICATION_STATUS_LABELS, EMPLOYER_BASE_PATH } from '../utils/employerConstants';
import { formatEmployerDate } from '../utils/employerFormatters';

const PAGE_SIZE = 10;

const TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'applied', label: 'New' },
  { value: 'viewed', label: 'Reviewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

export function EmployerApplicantsPage() {
  const navigate = useNavigate();
  const notify = useNotify();
  const reloadMe = useEmployerStore((state) => state.load);
  const { can } = useEmployerPermissions();
  const canManage = can('manageApplicants');
  const [params, setParams] = useSearchParams();

  const status = params.get('status') ?? 'all';
  const jobId = params.get('jobId') ?? 'all';
  const page = Number(params.get('page') ?? 1) || 1;
  const [search, setSearch] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebouncedValue(search);

  // Topbar search updates the URL while this page is open.
  useEffect(() => {
    setSearch(params.get('search') ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('search')]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === 'all' || (key === 'page' && value === '1')) next.delete(key);
      else next.set(key, value);
    }
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (debouncedSearch !== (params.get('search') ?? '')) update({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const { data, loading, error, refetch } = useEmployerApplicants({
    search: params.get('search') ?? '',
    status,
    jobId,
    page,
    limit: PAGE_SIZE,
  });

  const jobs = useEmployerQuery(() => employerApi.listJobs({ limit: 100 }), []);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState<EmployerApplicantRow[] | null>(null);

  useEffect(() => setSelected(new Set()), [data]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));

  const changeStatus = async (rows: EmployerApplicantRow[], next: ApplicationStatus) => {
    setBusy(true);
    const results = await Promise.allSettled(rows.map((row) => employerApi.updateApplicantStatus(row.id, next)));
    setBusy(false);
    const failed = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
    const succeeded = rows.length - failed.length;
    if (succeeded) {
      notify(
        rows.length === 1
          ? `${rows[0].fullName} moved to ${APPLICATION_STATUS_LABELS[next]}.`
          : `${succeeded} application${succeeded === 1 ? '' : 's'} moved to ${APPLICATION_STATUS_LABELS[next]}.`,
      );
    }
    if (failed.length) notify(getErrorMessage(failed[0].reason), 'error');
    await Promise.all([refetch(), reloadMe()]);
    if (failed.length) throw new Error(getErrorMessage(failed[0].reason));
  };

  const run = (rows: EmployerApplicantRow[], next: ApplicationStatus) => {
    changeStatus(rows, next).catch(() => undefined);
  };

  const counts = data?.counts;
  const countFor = (value: string) => (value === 'all' ? counts?.all : counts?.[value as ApplicationStatus]) ?? 0;
  const selectedRows = items.filter((item) => selected.has(item.id));
  const filtersActive = Boolean(params.get('search') || status !== 'all' || jobId !== 'all');

  return (
    <div className={ui.page}>
      <EmployerPageHeader title="Applications" description="Review, track, and manage job applications." />

      <div className={ui.cardFlush}>
        <div className={ui.tabs} role="tablist" aria-label="Application status" style={{ padding: '0 10px' }}>
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              className={ui.tab}
              aria-selected={status === tab.value}
              onClick={() => update({ status: tab.value })}
            >
              {tab.label} <span className={ui.muted}>({countFor(tab.value)})</span>
            </button>
          ))}
        </div>

        <div className={ui.toolbar}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search applicants by name, email, skill or location…" />
          <label>
            <span className={ui.srOnly}>Job</span>
            <select className={ui.select} value={jobId} onChange={(e) => update({ jobId: e.target.value })}>
              <option value="all">All Jobs</option>
              {jobs.data?.items.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
            </select>
          </label>
          <label>
            <span className={ui.srOnly}>Status</span>
            <select className={ui.select} value={status} onChange={(e) => update({ status: e.target.value })}>
              <option value="all">All Statuses</option>
              {TABS.slice(1).map((tab) => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
            </select>
          </label>
        </div>

        {canManage && selectedRows.length > 0 && (
          <div className={ui.toolbar} style={{ background: '#f1f7ff' }} role="region" aria-label="Bulk actions">
            <strong style={{ fontSize: 13.5 }}>{selectedRows.length} selected</strong>
            <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} disabled={busy} onClick={() => run(selectedRows, 'shortlisted')}>
              <Star size={14} /> Shortlist
            </button>
            <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} disabled={busy} onClick={() => run(selectedRows, 'interview')}>
              <CalendarCheck size={14} /> Move to interview
            </button>
            <button type="button" className={`${ui.btnSecondary} ${ui.btnSm}`} disabled={busy} onClick={() => setRejecting(selectedRows)}>
              <CircleX size={14} /> Reject
            </button>
            <button type="button" className={ui.linkBtn} onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}

        {loading && !data && <EmployerLoading rows={6} label="Loading applications" />}
        {error && <EmployerError message={error} onRetry={refetch} />}

        {data && !error && items.length === 0 && (
          <EmployerEmptyState
            icon={<FileText size={24} />}
            title={filtersActive ? 'No applications match' : 'No applications yet'}
            description={
              filtersActive
                ? 'Try another status, job or search term.'
                : 'When candidates apply to your Fockis job listings, they show up here.'
            }
            action={
              filtersActive ? (
                <button type="button" className={ui.btnSecondary} onClick={() => { setSearch(''); setParams(new URLSearchParams(), { replace: true }); }}>
                  Clear filters
                </button>
              ) : (
                <Link to={`${EMPLOYER_BASE_PATH}/jobs`} className={ui.btnSecondary}>View job listings</Link>
              )
            }
          />
        )}

        {items.length > 0 && (
          <>
            <div className={ui.tableWrap} aria-busy={loading || busy}>
              <table className={`${ui.table} ${ui.responsiveTable}`}>
                <thead>
                  <tr>
                    {canManage && (
                      <th style={{ width: 36 }}>
                        <input
                          type="checkbox"
                          aria-label="Select all on this page"
                          checked={allSelected}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)))}
                        />
                      </th>
                    )}
                    <th>Candidate</th>
                    <th>Job Title</th>
                    <th>Applied</th>
                    <th>Status</th>
                    <th><span className={ui.srOnly}>Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      {canManage && (
                        <td data-label="">
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.fullName}`}
                            checked={selected.has(row.id)}
                            onChange={() => {
                              const next = new Set(selected);
                              if (next.has(row.id)) next.delete(row.id);
                              else next.add(row.id);
                              setSelected(next);
                            }}
                          />
                        </td>
                      )}
                      <td data-label="Candidate">
                        <Link to={`${EMPLOYER_BASE_PATH}/applicants/${row.id}`} className={ui.person} style={{ textDecoration: 'none' }}>
                          <Avatar name={row.fullName} src={row.profilePicture} />
                          <span style={{ minWidth: 0 }}>
                            <strong>{row.fullName}</strong>
                            <span className={ui.cellSub}>{row.location}</span>
                          </span>
                        </Link>
                      </td>
                      <td data-label="Job">{row.jobTitle}</td>
                      <td data-label="Applied">{formatEmployerDate(row.appliedAt)}</td>
                      <td data-label="Status"><ApplicationStatusBadge status={row.status} /></td>
                      <td data-label="">
                        <ActionMenu
                          label={`Actions for ${row.fullName}`}
                          items={[
                            { label: 'View applicant', icon: <Eye size={15} />, onSelect: () => navigate(`${EMPLOYER_BASE_PATH}/applicants/${row.id}`) },
                            { label: 'Shortlist', icon: <Star size={15} />, onSelect: () => run([row], 'shortlisted'), hidden: !canManage || row.status === 'shortlisted', disabled: busy },
                            { label: 'Move to interview', icon: <CalendarCheck size={15} />, onSelect: () => run([row], 'interview'), hidden: !canManage || row.status === 'interview', disabled: busy },
                            { label: 'Mark as hired', icon: <CircleCheck size={15} />, onSelect: () => run([row], 'offer'), hidden: !canManage || row.status === 'offer', disabled: busy },
                            { label: 'Reject', icon: <CircleX size={15} />, danger: true, onSelect: () => setRejecting([row]), hidden: !canManage || row.status === 'rejected' },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <EmployerPagination
              page={data?.page ?? 1}
              pages={data?.pages ?? 1}
              total={data?.total ?? 0}
              limit={data?.limit ?? PAGE_SIZE}
              noun="applications"
              onPageChange={(next) => update({ page: String(next) })}
            />
          </>
        )}
      </div>

      <ConfirmActionModal
        open={Boolean(rejecting)}
        title={rejecting && rejecting.length > 1 ? `Reject ${rejecting.length} applications?` : 'Reject this application?'}
        description={
          rejecting && rejecting.length === 1
            ? `${rejecting[0].fullName}'s application for ${rejecting[0].jobTitle} will be marked as rejected. You can change the status later.`
            : 'The selected applications will be marked as rejected. You can change their status later.'
        }
        confirmLabel="Reject"
        variant="danger"
        onConfirm={async () => {
          if (rejecting) await changeStatus(rejecting, 'rejected');
          setRejecting(null);
        }}
        onCancel={() => setRejecting(null)}
      />
    </div>
  );
}

export default EmployerApplicantsPage;
