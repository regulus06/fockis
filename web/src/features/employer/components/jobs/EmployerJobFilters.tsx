
import '../styles/EmployerJobFilters.scss';

export type EmployerJobFilterStatus =
  | 'all'
  | 'draft'
  | 'pending'
  | 'active'
  | 'closed'
  | 'rejected';

export type EmployerJobEmploymentType =
  | 'all'
  | 'job'
  | 'internship'
  | 'coop'
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'temporary';

export type EmployerJobWorkplaceType =
  | 'all'
  | 'onsite'
  | 'on-site'
  | 'hybrid'
  | 'remote';

export type EmployerJobSortOption =
  | 'newest'
  | 'oldest'
  | 'title-asc'
  | 'title-desc'
  | 'applications-desc'
  | 'views-desc'
  | 'deadline-asc';

export type EmployerJobFilterValues = {
  search: string;
  status: EmployerJobFilterStatus;
  employmentType: EmployerJobEmploymentType;
  workplaceType: EmployerJobWorkplaceType;
  sortBy: EmployerJobSortOption;
};

export type EmployerJobFiltersProps = {
  value: EmployerJobFilterValues;
  onChange: (nextValue: EmployerJobFilterValues) => void;
  onClear?: () => void;
  resultCount?: number;
  loading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  showResultCount?: boolean;
  showSort?: boolean;
  showEmploymentType?: boolean;
  showWorkplaceType?: boolean;
  compact?: boolean;
  searchPlaceholder?: string;
  statusOptions?: {
    value: EmployerJobFilterStatus;
    label: string;
  }[];
  emptyMessage?: string;
};

const DEFAULT_STATUS_OPTIONS: EmployerJobFiltersProps['statusOptions'] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending approval' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
  { value: 'rejected', label: 'Rejected' },
];

const EMPLOYMENT_OPTIONS: {
  value: EmployerJobEmploymentType;
  label: string;
}[] = [
  { value: 'all', label: 'All employment types' },
  { value: 'job', label: 'Job' },
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'coop', label: 'Co-op' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
];

const WORKPLACE_OPTIONS: {
  value: EmployerJobWorkplaceType;
  label: string;
}[] = [
  { value: 'all', label: 'All workplace types' },
  { value: 'onsite', label: 'On-site' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'remote', label: 'Remote' },
];

const SORT_OPTIONS: {
  value: EmployerJobSortOption;
  label: string;
}[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title-asc', label: 'Title: A–Z' },
  { value: 'title-desc', label: 'Title: Z–A' },
  { value: 'applications-desc', label: 'Most applications' },
  { value: 'views-desc', label: 'Most views' },
  { value: 'deadline-asc', label: 'Deadline: earliest first' },
];

export const DEFAULT_EMPLOYER_JOB_FILTERS: EmployerJobFilterValues = {
  search: '',
  status: 'all',
  employmentType: 'all',
  workplaceType: 'all',
  sortBy: 'newest',
};

function hasActiveFilters(value: EmployerJobFilterValues): boolean {
  return (
    value.search.trim().length > 0 ||
    value.status !== 'all' ||
    value.employmentType !== 'all' ||
    value.workplaceType !== 'all' ||
    value.sortBy !== 'newest'
  );
}

export function EmployerJobFilters({
  value,
  onChange,
  onClear,
  resultCount,
  loading = false,
  disabled = false,
  readOnly = false,
  showResultCount = true,
  showSort = true,
  showEmploymentType = true,
  showWorkplaceType = true,
  compact = false,
  searchPlaceholder = 'Search job title, company, or location...',
  statusOptions = DEFAULT_STATUS_OPTIONS,
  emptyMessage = 'No matching jobs found.',
}: EmployerJobFiltersProps) {
  const isDisabled = disabled || loading || readOnly;
  const hasFilters = hasActiveFilters(value);

  const updateFilter = <K extends keyof EmployerJobFilterValues>(
    field: K,
    nextValue: EmployerJobFilterValues[K],
  ) => {
    if (isDisabled) return;

    onChange({
      ...value,
      [field]: nextValue,
    });
  };

  const clearFilters = () => {
    if (isDisabled) return;

    if (onClear) {
      onClear();
      return;
    }

    onChange(DEFAULT_EMPLOYER_JOB_FILTERS);
  };

  return (
    <section
      className={[
        'employer-job-filters',
        compact && 'employer-job-filters--compact',
        loading && 'employer-job-filters--loading',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Filter employer jobs"
      aria-busy={loading}
    >
      <div className="employer-job-filters__top">
        <div className="employer-job-filters__heading">
          <div>
            <span className="employer-job-filters__eyebrow">
              JOB MANAGEMENT
            </span>
            <h2>Find your jobs</h2>
          </div>

          {showResultCount && typeof resultCount === 'number' && (
            <span className="employer-job-filters__result-count">
              {resultCount.toLocaleString()} results
            </span>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            className="employer-job-filters__clear"
            onClick={clearFilters}
            disabled={isDisabled}
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="employer-job-filters__search">
        <span aria-hidden="true">⌕</span>
        <label
          className="employer-job-filters__visually-hidden"
          htmlFor="employer-job-search"
        >
          Search jobs
        </label>
        <input
          id="employer-job-search"
          type="search"
          value={value.search}
          onChange={(event) =>
            updateFilter('search', event.target.value)
          }
          placeholder={searchPlaceholder}
          disabled={isDisabled}
          autoComplete="off"
        />

        {value.search && !isDisabled && (
          <button
            type="button"
            className="employer-job-filters__clear-search"
            onClick={() => updateFilter('search', '')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="employer-job-filters__controls">
        <div className="employer-job-filters__field">
          <label htmlFor="employer-job-status">Status</label>
          <select
            id="employer-job-status"
            value={value.status}
            onChange={(event) =>
              updateFilter(
                'status',
                event.target.value as EmployerJobFilterStatus,
              )
            }
            disabled={isDisabled}
          >
            {statusOptions?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {showEmploymentType && (
          <div className="employer-job-filters__field">
            <label htmlFor="employer-job-employment">
              Employment type
            </label>
            <select
              id="employer-job-employment"
              value={value.employmentType}
              onChange={(event) =>
                updateFilter(
                  'employmentType',
                  event.target.value as EmployerJobEmploymentType,
                )
              }
              disabled={isDisabled}
            >
              {EMPLOYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showWorkplaceType && (
          <div className="employer-job-filters__field">
            <label htmlFor="employer-job-workplace">
              Workplace
            </label>
            <select
              id="employer-job-workplace"
              value={value.workplaceType}
              onChange={(event) =>
                updateFilter(
                  'workplaceType',
                  event.target.value as EmployerJobWorkplaceType,
                )
              }
              disabled={isDisabled}
            >
              {WORKPLACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {showSort && (
          <div className="employer-job-filters__field">
            <label htmlFor="employer-job-sort">Sort by</label>
            <select
              id="employer-job-sort"
              value={value.sortBy}
              onChange={(event) =>
                updateFilter(
                  'sortBy',
                  event.target.value as EmployerJobSortOption,
                )
              }
              disabled={isDisabled}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && (
        <p className="employer-job-filters__loading-message" role="status">
          Updating job results…
        </p>
      )}

      {!loading &&
        showResultCount &&
        resultCount === 0 && (
          <p className="employer-job-filters__empty-message" role="status">
            {emptyMessage}
          </p>
        )}
    </section>
  );
}

export default EmployerJobFilters;
