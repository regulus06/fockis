
import { useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ApplicantStatusValue } from './ApplicantStatus';
import '../styles/ApplicantTable.scss';

export type ApplicantTableRow = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  jobTitle: string;
  appliedAt: string;
  status: ApplicantStatusValue;
  location?: string | null;
  experience?: string | null;
  skills?: string[];
};

type SortField = 'name' | 'jobTitle' | 'appliedAt' | 'status';
type SortDirection = 'asc' | 'desc';

export type ApplicantTableProps = {
  applicants: ApplicantTableRow[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onView?: (applicant: ApplicantTableRow) => void;
  onStatusChange?: (
    applicantId: string,
    status: ApplicantStatusValue,
  ) => void | Promise<void>;
  updatingApplicantId?: string | null;
  disabled?: boolean;
  readOnly?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
};

const STATUS_OPTIONS: {
  value: ApplicantStatusValue;
  label: string;
}[] = [
  { value: 'applied', label: 'Applied' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase() || '?';
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function ApplicantTable({
  applicants,
  loading = false,
  error = null,
  onRetry,
  onView,
  onStatusChange,
  updatingApplicantId = null,
  disabled = false,
  readOnly = false,
  page = 1,
  pageSize = 10,
  total,
  onPageChange,
  emptyMessage = 'No applicants match your current filters.',
}: ApplicantTableProps) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('appliedAt');
  const [sortDirection, setSortDirection] =
    useState<SortDirection>('desc');
  const [statusErrors, setStatusErrors] = useState<
    Record<string, string>
  >({});

  const filteredApplicants = useMemo(() => {
    const query = normalize(search);

    const result = applicants.filter((applicant) => {
      if (!query) return true;

      const searchable = [
        applicant.name,
        applicant.email,
        applicant.jobTitle,
        applicant.location ?? '',
        applicant.experience ?? '',
        ...(applicant.skills ?? []),
      ];

      return searchable.some((value) =>
        normalize(value).includes(query),
      );
    });

    return [...result].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;

        case 'jobTitle':
          comparison = a.jobTitle.localeCompare(b.jobTitle);
          break;

        case 'appliedAt': {
          const firstDate = new Date(a.appliedAt).getTime();
          const secondDate = new Date(b.appliedAt).getTime();

          comparison =
            (Number.isNaN(firstDate) ? 0 : firstDate) -
            (Number.isNaN(secondDate) ? 0 : secondDate);
          break;
        }

        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [applicants, search, sortField, sortDirection]);

  const effectivePageSize = Math.max(1, pageSize);
  const effectivePage = Math.max(1, page);
  const totalRecords = total ?? filteredApplicants.length;
  const totalPages = Math.max(
    1,
    Math.ceil(totalRecords / effectivePageSize),
  );

  // When pagination is controlled by the parent, applicants should
  // already contain only the records for the requested page.
  const visibleApplicants =
    onPageChange || total !== undefined
      ? filteredApplicants
      : filteredApplicants.slice(
          (effectivePage - 1) * effectivePageSize,
          effectivePage * effectivePageSize,
        );

  const startRecord =
    totalRecords === 0
      ? 0
      : (effectivePage - 1) * effectivePageSize + 1;

  const endRecord = Math.min(
    effectivePage * effectivePageSize,
    totalRecords,
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) =>
        current === 'asc' ? 'desc' : 'asc',
      );
    } else {
      setSortField(field);
      setSortDirection(field === 'appliedAt' ? 'desc' : 'asc');
    }
  };

  const handleStatusChange = async (
    applicant: ApplicantTableRow,
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const nextStatus = event.target.value as ApplicantStatusValue;

    if (
      !STATUS_OPTIONS.some((option) => option.value === nextStatus) ||
      nextStatus === applicant.status ||
      !onStatusChange
    ) {
      return;
    }

    setStatusErrors((current) => {
      const next = { ...current };
      delete next[applicant.id];
      return next;
    });

    try {
      await onStatusChange(applicant.id, nextStatus);
    } catch {
      setStatusErrors((current) => ({
        ...current,
        [applicant.id]: 'Unable to update status. Please try again.',
      }));
    }
  };

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const isStatusEditable =
    !disabled && !readOnly && Boolean(onStatusChange);

  return (
    <section
      className="applicant-table"
      aria-label="Applicant management table"
      aria-busy={loading}
    >
      <div className="applicant-table__header">
        <div>
          <h2>Applicants</h2>
          <p>Review candidates and manage their application progress.</p>
        </div>

        <div className="applicant-table__search">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 4 4" />
          </svg>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search applicants..."
            aria-label="Search applicants"
            disabled={loading || disabled}
          />
        </div>
      </div>

      {error && (
        <div className="applicant-table__error" role="alert">
          <span>{error}</span>

          {onRetry && (
            <button type="button" onClick={onRetry} disabled={loading}>
              Try again
            </button>
          )}
        </div>
      )}

      <div className="applicant-table__content">
        <div className="applicant-table__scroll">
          <table>
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
                    onClick={() => handleSort('name')}
                    aria-label={`Sort by applicant name ${getSortIndicator('name')}`}
                    disabled={disabled}
                  >
                    Applicant <span>{getSortIndicator('name')}</span>
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort('jobTitle')}
                    disabled={disabled}
                  >
                    Position <span>{getSortIndicator('jobTitle')}</span>
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort('appliedAt')}
                    disabled={disabled}
                  >
                    Applied <span>{getSortIndicator('appliedAt')}</span>
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    disabled={disabled}
                  >
                    Status <span>{getSortIndicator('status')}</span>
                  </button>
                </th>

                <th>
                  <span className="applicant-table__actions-heading">
                    Actions
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td colSpan={5}>
                      <div className="applicant-table__skeleton" />
                    </td>
                  </tr>
                ))
              ) : visibleApplicants.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="applicant-table__empty">
                      <span className="applicant-table__empty-icon">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          aria-hidden="true"
                        >
                          <circle cx="10" cy="8" r="3" />
                          <path d="M4 20v-2a6 6 0 0 1 12 0v2M19 8v6m-3-3h6" />
                        </svg>
                      </span>

                      <h3>No applicants found</h3>
                      <p>{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                visibleApplicants.map((applicant) => (
                  <tr key={applicant.id}>
                    <td>
                      <div className="applicant-table__person">
                        {applicant.avatarUrl ? (
                          <img
                            src={applicant.avatarUrl}
                            alt=""
                            className="applicant-table__avatar"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="applicant-table__avatar applicant-table__avatar--initials">
                            {getInitials(applicant.name)}
                          </span>
                        )}

                        <div className="applicant-table__person-info">
                          <strong>{applicant.name}</strong>
                          <span>{applicant.email}</span>
                          {applicant.location && (
                            <small>{applicant.location}</small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="applicant-table__position">
                        <strong>{applicant.jobTitle}</strong>
                        {applicant.experience && (
                          <span>{applicant.experience}</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="applicant-table__date">
                        {formatDate(applicant.appliedAt)}
                      </span>
                    </td>

                    <td>
                      {isStatusEditable ? (
                        <div className="applicant-table__status-control">
                          <select
                            className={`applicant-table__status applicant-table__status--${applicant.status}`}
                            value={applicant.status}
                            onChange={(event) =>
                              handleStatusChange(applicant, event)
                            }
                            disabled={
                              disabled ||
                              updatingApplicantId === applicant.id
                            }
                            aria-label={`Change status for ${applicant.name}`}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </option>
                            ))}
                          </select>

                          {updatingApplicantId === applicant.id && (
                            <small>Saving...</small>
                          )}

                          {statusErrors[applicant.id] && (
                            <small
                              className="applicant-table__row-error"
                              role="alert"
                            >
                              {statusErrors[applicant.id]}
                            </small>
                          )}
                        </div>
                      ) : (
                        <span
                          className={`applicant-table__status applicant-table__status--${applicant.status}`}
                        >
                          <span className="applicant-table__status-dot" />
                          {STATUS_OPTIONS.find(
                            (option) => option.value === applicant.status,
                          )?.label ?? applicant.status}
                        </span>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="applicant-table__view"
                        onClick={() => onView?.(applicant)}
                        disabled={disabled || !onView}
                      >
                        View profile
                        <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="applicant-table__footer">
        <span>
          Showing {startRecord}–{endRecord} of {totalRecords} applicants
        </span>

        {onPageChange && (
          <div className="applicant-table__pagination">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, effectivePage - 1))}
              disabled={loading || effectivePage <= 1}
              aria-label="Previous page"
            >
              ←
            </button>

            <span>
              Page {effectivePage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                onPageChange(Math.min(totalPages, effectivePage + 1))
              }
              disabled={loading || effectivePage >= totalPages}
              aria-label="Next page"
            >
              →
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}

export default ApplicantTable;
