
import { useMemo } from 'react';
import '../styles/ApplicantFilters.scss';

export type ApplicantFilterStatus =
  | 'all'
  | 'applied'
  | 'viewed'
  | 'shortlisted'
  | 'interview'
  | 'offer'
  | 'rejected';

export type ApplicantSortOption =
  | 'newest'
  | 'oldest'
  | 'name-asc'
  | 'name-desc';

export type ApplicantFilterValues = {
  search: string;
  status: ApplicantFilterStatus;
  jobId: string;
  location: string;
  experience: string;
  sortBy: ApplicantSortOption;
};

export type ApplicantFilterJob = {
  id: string;
  title: string;
};

export type ApplicantFiltersProps = {
  value: ApplicantFilterValues;
  onChange: (filters: ApplicantFilterValues) => void;
  jobs?: ApplicantFilterJob[];
  locations?: string[];
  experienceLevels?: string[];
  resultCount?: number;
  loading?: boolean;
  disabled?: boolean;
  onClear?: () => void;
};

const DEFAULT_EXPERIENCE_LEVELS = [
  'Entry level',
  'Mid level',
  'Senior level',
  'Executive',
];

const STATUS_OPTIONS: {
  value: ApplicantFilterStatus;
  label: string;
}[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'applied', label: 'Applied' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const SORT_OPTIONS: {
  value: ApplicantSortOption;
  label: string;
}[] = [
  { value: 'newest', label: 'Newest applications' },
  { value: 'oldest', label: 'Oldest applications' },
  { value: 'name-asc', label: 'Name: A to Z' },
  { value: 'name-desc', label: 'Name: Z to A' },
];

export function ApplicantFilters({
  value,
  onChange,
  jobs = [],
  locations = [],
  experienceLevels = DEFAULT_EXPERIENCE_LEVELS,
  resultCount,
  loading = false,
  disabled = false,
  onClear,
}: ApplicantFiltersProps) {
  const isDisabled = disabled || loading;

  const hasActiveFilters = useMemo(
    () =>
      value.search.trim() !== '' ||
      value.status !== 'all' ||
      value.jobId !== '' ||
      value.location !== '' ||
      value.experience !== '' ||
      value.sortBy !== 'newest',
    [value],
  );

  const updateFilter = <K extends keyof ApplicantFilterValues>(
    key: K,
    nextValue: ApplicantFilterValues[K],
  ) => {
    onChange({
      ...value,
      [key]: nextValue,
    });
  };

  const clearFilters = () => {
    const cleared: ApplicantFilterValues = {
      search: '',
      status: 'all',
      jobId: '',
      location: '',
      experience: '',
      sortBy: 'newest',
    };

    onChange(cleared);
    onClear?.();
  };

  return (
    <section
      className="applicant-filters"
      aria-label="Applicant filters"
      aria-busy={loading}
    >
      <div className="applicant-filters__header">
        <div className="applicant-filters__title">
          <span className="applicant-filters__icon" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5h16M7 12h10m-7 7h4" />
            </svg>
          </span>

          <div>
            <h2>Filter applicants</h2>
            <p>Find the right candidates for your open positions.</p>
          </div>
        </div>

        <button
          type="button"
          className="applicant-filters__clear"
          onClick={clearFilters}
          disabled={isDisabled || !hasActiveFilters}
        >
          Clear filters
        </button>
      </div>

      <div className="applicant-filters__search">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16 16 4 4" />
        </svg>

        <input
          type="search"
          placeholder="Search by applicant name or email..."
          value={value.search}
          onChange={(event) =>
            updateFilter('search', event.target.value)
          }
          disabled={isDisabled}
          aria-label="Search applicants"
        />
      </div>

      <div className="applicant-filters__grid">
        <label className="applicant-filters__field">
          <span>Application status</span>
          <select
            value={value.status}
            onChange={(event) =>
              updateFilter(
                'status',
                event.target.value as ApplicantFilterStatus,
              )
            }
            disabled={isDisabled}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="applicant-filters__field">
          <span>Job position</span>
          <select
            value={value.jobId}
            onChange={(event) =>
              updateFilter('jobId', event.target.value)
            }
            disabled={isDisabled}
          >
            <option value="">All positions</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
              </option>
            ))}
          </select>
        </label>

        <label className="applicant-filters__field">
          <span>Location</span>
          <select
            value={value.location}
            onChange={(event) =>
              updateFilter('location', event.target.value)
            }
            disabled={isDisabled}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </label>

        <label className="applicant-filters__field">
          <span>Experience level</span>
          <select
            value={value.experience}
            onChange={(event) =>
              updateFilter('experience', event.target.value)
            }
            disabled={isDisabled}
          >
            <option value="">All experience levels</option>
            {experienceLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="applicant-filters__footer">
        <div className="applicant-filters__results">
          {typeof resultCount === 'number' ? (
            <>
              <strong>
                {new Intl.NumberFormat('en-US').format(resultCount)}
              </strong>
              <span>
                {resultCount === 1 ? ' applicant found' : ' applicants found'}
              </span>
            </>
          ) : (
            <span>Applicant results</span>
          )}
        </div>

        <label className="applicant-filters__sort">
          <span>Sort by</span>
          <select
            value={value.sortBy}
            onChange={(event) =>
              updateFilter(
                'sortBy',
                event.target.value as ApplicantSortOption,
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
        </label>
      </div>
    </section>
  );
}

export default ApplicantFilters;
