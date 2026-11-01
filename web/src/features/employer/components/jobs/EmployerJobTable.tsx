
import { useMemo, useState } from 'react';
import '../styles/EmployerJobTable.scss';
import {
  EmployerJobRow,
  type EmployerJobRowData,
} from './EmployerJobRow';

export type EmployerJobTableSortField =
  | 'title'
  | 'status'
  | 'createdAt'
  | 'applicationsCount'
  | 'viewsCount'
  | 'applicationDeadline';

export type EmployerJobTableSortDirection = 'asc' | 'desc';

export type EmployerJobTableProps = {
  jobs: EmployerJobRowData[];
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  actionLoading?: boolean;
  onRetry?: () => void;
  onView?: (job: EmployerJobRowData) => void;
  onEdit?: (job: EmployerJobRowData) => void;
  onViewApplicants?: (job: EmployerJobRowData) => void;
  onToggleActive?: (
    job: EmployerJobRowData,
    nextIsActive: boolean,
  ) => void | Promise<void>;
  onDuplicate?: (job: EmployerJobRowData) => void | Promise<void>;
  onDelete?: (job: EmployerJobRowData) => void | Promise<void>;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (nextPage: number) => void;
  emptyMessage?: string;
  showCompany?: boolean;
  compact?: boolean;
};

type SortState = {
  field: EmployerJobTableSortField;
  direction: EmployerJobTableSortDirection;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

function normalizeStatus(job: EmployerJobRowData): string {
  if (job.status === 'rejected') return 'rejected';
  if (job.status === 'draft') return 'draft';
  if (job.status === 'pending') return 'pending';
  if (job.status === 'closed' || !job.isActive) return 'closed';
  if (job.isApproved === false) return 'pending';
  return 'active';
}

function getTimestamp(value?: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareValues(
  a: EmployerJobRowData,
  b: EmployerJobRowData,
  field: EmployerJobTableSortField,
): number {
  switch (field) {
    case 'title':
      return a.title.localeCompare(b.title, undefined, {
        sensitivity: 'base',
      });

    case 'status':
      return normalizeStatus(a).localeCompare(normalizeStatus(b));

    case 'createdAt':
      return getTimestamp(a.createdAt) - getTimestamp(b.createdAt);

    case 'applicationsCount':
      return (a.applicationsCount ?? -1) - (b.applicationsCount ?? -1);

    case 'viewsCount':
      return (a.viewsCount ?? -1) - (b.viewsCount ?? -1);

    case 'applicationDeadline':
      return (
        getTimestamp(a.applicationDeadline) -
        getTimestamp(b.applicationDeadline)
      );

    default:
      return 0;
  }
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="employer-job-table__skeleton"
      aria-label="Loading jobs"
      aria-busy="true"
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div className="employer-job-table__skeleton-row" key={index}>
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

export function EmployerJobTable({
  jobs,
  loading = false,
  error = null,
  disabled = false,
  readOnly = false,
  actionLoading = false,
  onRetry,
  onView,
  onEdit,
  onViewApplicants,
  onToggleActive,
  onDuplicate,
  onDelete,
  page,
  pageSize = 10,
  total,
  onPageChange,
  emptyMessage = 'No jobs match your current filters.',
  showCompany = true,
  compact = false,
}: EmployerJobTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState<SortState>({
    field: 'createdAt',
    direction: 'desc',
  });
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  const controlledPage = page !== undefined;
  const currentPage = controlledPage ? page : localPage;
  const currentPageSize = controlledPage ? pageSize : localPageSize;

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesSearch =
        !query ||
        [
          job.title,
          job.company,
          job.location,
          job.city,
          job.stateProvince,
          job.country,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'all' || normalizeStatus(job) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

  const sortedJobs = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      const result = compareValues(a, b, sort.field);
      return sort.direction === 'asc' ? result : -result;
    });
  }, [filteredJobs, sort]);

  const effectiveTotal =
    total !== undefined && !search && statusFilter === 'all'
      ? total
      : sortedJobs.length;

  const totalPages = Math.max(
    1,
    Math.ceil(effectiveTotal / currentPageSize),
  );

  const safePage = Math.min(Math.max(currentPage, 1), totalPages);

  const visibleJobs = controlledPage
    ? sortedJobs
    : sortedJobs.slice(
        (safePage - 1) * currentPageSize,
        safePage * currentPageSize,
      );

  const updatePage = (nextPage: number) => {
    const safeNextPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (onPageChange) {
      onPageChange(safeNextPage);
    } else {
      setLocalPage(safeNextPage);
    }
  };

  const updateSearch = (value: string) => {
    setSearch(value);
    if (!controlledPage) setLocalPage(1);
  };

  const updateStatus = (value: string) => {
    setStatusFilter(value);
    if (!controlledPage) setLocalPage(1);
  };

  const updateSort = (field: EmployerJobTableSortField) => {
    setSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === 'asc'
          ? 'desc'
          : 'asc',
    }));
    if (!controlledPage) setLocalPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setLocalPageSize(value);
    setLocalPage(1);
  };

  const getSortIndicator = (field: EmployerJobTableSortField) => {
    if (sort.field !== field) return '↕';
    return sort.direction === 'asc' ? '↑' : '↓';
  };

  const firstItem =
    effectiveTotal === 0
      ? 0
      : controlledPage
        ? (safePage - 1) * currentPageSize + 1
        : (safePage - 1) * currentPageSize + 1;

  const lastItem = controlledPage
    ? Math.min(safePage * currentPageSize, effectiveTotal)
    : Math.min(safePage * currentPageSize, effectiveTotal);

  return (
    <section
      className={[
        'employer-job-table',
        compact && 'employer-job-table--compact',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Employer job listings"
      aria-busy={loading || actionLoading}
    >
      <header className="employer-job-table__header">
        <div>
          <span className="employer-job-table__eyebrow">
            JOB MANAGEMENT
          </span>
          <h2>All job listings</h2>
          <p>Review and manage your employer job listings.</p>
        </div>

        <span className="employer-job-table__count">
          {effectiveTotal.toLocaleString()} jobs
        </span>
      </header>

      <div className="employer-job-table__filters">
        <div className="employer-job-table__search">
          <span aria-hidden="true">⌕</span>
          <label
            className="employer-job-table__visually-hidden"
            htmlFor="employer-job-table-search"
          >
            Search jobs
          </label>
          <input
            id="employer-job-table-search"
            type="search"
            value={search}
            onChange={(event) => updateSearch(event.target.value)}
            placeholder="Search by job title, company, or location..."
            disabled={disabled || loading}
          />
          {search && (
            <button
              type="button"
              onClick={() => updateSearch('')}
              disabled={disabled || loading}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="employer-job-table__status-filter">
          <label htmlFor="employer-job-table-status">Status</label>
          <select
            id="employer-job-table-status"
            value={statusFilter}
            onChange={(event) => updateStatus(event.target.value)}
            disabled={disabled || loading}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="pending">Pending approval</option>
            <option value="draft">Draft</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="employer-job-table__error" role="alert">
          <p>{error}</p>
          {onRetry && (
            <button type="button" onClick={onRetry} disabled={disabled}>
              Retry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={Math.min(currentPageSize, 6)} />
      ) : visibleJobs.length === 0 ? (
        <div className="employer-job-table__empty">
          <span aria-hidden="true">▤</span>
          <h3>No jobs found</h3>
          <p>{emptyMessage}</p>
          {(search || statusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                updateSearch('');
                updateStatus('all');
              }}
              disabled={disabled}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="employer-job-table__desktop">
            <div className="employer-job-table__table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => updateSort('title')}
                        disabled={disabled}
                      >
                        Job {getSortIndicator('title')}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => updateSort('status')}
                        disabled={disabled}
                      >
                        Status {getSortIndicator('status')}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => updateSort('applicationsCount')}
                        disabled={disabled}
                      >
                        Applications {getSortIndicator('applicationsCount')}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => updateSort('viewsCount')}
                        disabled={disabled}
                      >
                        Views {getSortIndicator('viewsCount')}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => updateSort('createdAt')}
                        disabled={disabled}
                      >
                        Created {getSortIndicator('createdAt')}
                      </button>
                    </th>

                    <th scope="col">
                      <button
                        type="button"
                        onClick={() => updateSort('applicationDeadline')}
                        disabled={disabled}
                      >
                        Deadline {getSortIndicator('applicationDeadline')}
                      </button>
                    </th>

                    <th scope="col">
                      <span>Actions</span>
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {visibleJobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <div className="employer-job-table__job-cell">
                          <strong>
                            {onView ? (
                              <button
                                type="button"
                                onClick={() => onView(job)}
                                disabled={disabled}
                              >
                                {job.title}
                              </button>
                            ) : (
                              job.title
                            )}
                          </strong>

                          {showCompany && (
                            <span>{job.company || 'Company not specified'}</span>
                          )}

                          <small>
                            {[
                              job.location,
                              job.city,
                              job.stateProvince,
                              job.country,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'Location not specified'}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`employer-job-table__status employer-job-table__status--${normalizeStatus(job)}`}
                        >
                          <span />
                          {normalizeStatus(job) === 'pending'
                            ? 'Pending'
                            : normalizeStatus(job).charAt(0).toUpperCase() +
                              normalizeStatus(job).slice(1)}
                        </span>
                      </td>

                      <td>{job.applicationsCount ?? '—'}</td>
                      <td>{job.viewsCount ?? '—'}</td>
                      <td>{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : '—'}</td>
                      <td>
                        {job.applicationDeadline
                          ? new Date(job.applicationDeadline).toLocaleDateString()
                          : '—'}
                      </td>

                      <td>
                        <EmployerJobRow
                          job={job}
                          compact
                          disabled={disabled}
                          readOnly={readOnly}
                          actionLoading={actionLoading}
                          onView={onView}
                          onEdit={onEdit}
                          onViewApplicants={onViewApplicants}
                          onToggleActive={onToggleActive}
                          onDuplicate={onDuplicate}
                          onDelete={onDelete}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="employer-job-table__mobile">
            {visibleJobs.map((job) => (
              <EmployerJobRow
                key={job.id}
                job={job}
                disabled={disabled}
                readOnly={readOnly}
                actionLoading={actionLoading}
                onView={onView}
                onEdit={onEdit}
                onViewApplicants={onViewApplicants}
                onToggleActive={onToggleActive}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </div>
        </>
      )}

      {!loading && effectiveTotal > 0 && (
        <footer className="employer-job-table__pagination">
          <div className="employer-job-table__page-size">
            <label htmlFor="employer-job-table-page-size">
              Rows per page
            </label>
            <select
              id="employer-job-table-page-size"
              value={currentPageSize}
              onChange={(event) =>
                handlePageSizeChange(Number(event.target.value))
              }
              disabled={disabled || controlledPage}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <span className="employer-job-table__range">
            {firstItem}–{lastItem} of {effectiveTotal}
          </span>

          <div className="employer-job-table__page-buttons">
            <button
              type="button"
              onClick={() => updatePage(safePage - 1)}
              disabled={disabled || safePage <= 1}
              aria-label="Previous page"
            >
              ‹
            </button>
            <span>
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => updatePage(safePage + 1)}
              disabled={disabled || safePage >= totalPages}
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

export default EmployerJobTable;
