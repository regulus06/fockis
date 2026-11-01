
import { useMemo, useState } from 'react';
import EmployerTeamMember, {
  type EmployerTeamMemberData,
  type EmployerTeamMemberRole,
  type EmployerTeamMemberStatus,
} from './EmployerTeamMember';
import EmployerPagination from './EmployerPagination';
import EmployerLoading from './EmployerLoading';
import EmployerError from './EmployerError';
import EmployerEmptyState from './EmployerEmptyState';
import '../styles/EmployerTeamTable.scss';

export interface EmployerTeamTableProps {
  members: EmployerTeamMemberData[];
  loading?: boolean;
  error?: string | null;
  actionLoading?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  canManage?: boolean;

  onRetry?: () => void | Promise<void>;
  onView?: (member: EmployerTeamMemberData) => void;
  onEditRole?: (member: EmployerTeamMemberData) => void;
  onResendInvitation?: (member: EmployerTeamMemberData) => void;
  onSuspend?: (member: EmployerTeamMemberData) => void;
  onReactivate?: (member: EmployerTeamMemberData) => void;
  onRemove?: (member: EmployerTeamMemberData) => void;

  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;

  emptyTitle?: string;
  emptyMessage?: string;
  showSearch?: boolean;
  showFilters?: boolean;
  showPagination?: boolean;
  showLastActive?: boolean;
  compact?: boolean;
  pageSizeOptions?: number[];
}

type TeamSortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const ROLE_OPTIONS: {
  value: EmployerTeamMemberRole | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Administrator' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hiring_manager', label: 'Hiring manager' },
  { value: 'interviewer', label: 'Interviewer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'custom', label: 'Custom role' },
];

const STATUS_OPTIONS: {
  value: EmployerTeamMemberStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Invitation pending' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'revoked', label: 'Access revoked' },
];

function getMemberDate(member: EmployerTeamMemberData): number {
  const value = member.joinedAt || member.invitedAt;

  if (!value) return 0;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function EmployerTeamTable({
  members,
  loading = false,
  error = null,
  actionLoading = false,
  disabled = false,
  readOnly = false,
  canManage = false,
  onRetry,
  onView,
  onEditRole,
  onResendInvitation,
  onSuspend,
  onReactivate,
  onRemove,
  page,
  pageSize = 10,
  total,
  onPageChange,
  onPageSizeChange,
  emptyTitle = 'No team members found',
  emptyMessage = 'Invite colleagues to collaborate on hiring and manage your company recruitment workflow.',
  showSearch = true,
  showFilters = true,
  showPagination = true,
  showLastActive = true,
  compact = false,
  pageSizeOptions = [10, 20, 50],
}: EmployerTeamTableProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    EmployerTeamMemberRole | 'all'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    EmployerTeamMemberStatus | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<TeamSortOption>('newest');
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(pageSize);

  const isServerPaginated =
    page !== undefined && onPageChange !== undefined;

  const currentPage = isServerPaginated ? page : localPage;
  const currentPageSize = isServerPaginated
    ? pageSize
    : localPageSize;

  const normalizedSearch = search.trim().toLowerCase();

  const filteredMembers = useMemo(() => {
    return members
      .filter((member) => {
        const matchesSearch =
          !normalizedSearch ||
          [
            member.name,
            member.email,
            member.jobTitle,
            member.department,
            member.role,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(normalizedSearch),
            );

        const matchesRole =
          roleFilter === 'all' || member.role === roleFilter;

        const matchesStatus =
          statusFilter === 'all' || member.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return getMemberDate(a) - getMemberDate(b);
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'newest':
          default:
            return getMemberDate(b) - getMemberDate(a);
        }
      });
  }, [members, normalizedSearch, roleFilter, statusFilter, sortBy]);

  const effectiveTotal =
    isServerPaginated && !normalizedSearch &&
    roleFilter === 'all' && statusFilter === 'all'
      ? Math.max(0, total ?? members.length)
      : filteredMembers.length;

  const totalPages = Math.max(
    1,
    Math.ceil(effectiveTotal / Math.max(1, currentPageSize)),
  );

  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  const visibleMembers = isServerPaginated
    ? filteredMembers
    : filteredMembers.slice(
        (safePage - 1) * currentPageSize,
        safePage * currentPageSize,
      );

  const counts = useMemo(() => {
    const result = {
      all: members.length,
      active: 0,
      pending: 0,
      suspended: 0,
      revoked: 0,
    };

    members.forEach((member) => {
      result[member.status] += 1;
    });

    return result;
  }, [members]);

  const handleFilterChange = () => {
    setLocalPage(1);

    if (isServerPaginated) {
      onPageChange?.(1);
    }
  };

  const handlePageSizeChange = (nextSize: number) => {
    if (isServerPaginated) {
      onPageSizeChange?.(nextSize);
      onPageChange?.(1);
    } else {
      setLocalPageSize(nextSize);
      setLocalPage(1);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSortBy('newest');
    handleFilterChange();
  };

  const hasFilters =
    Boolean(search.trim()) ||
    roleFilter !== 'all' ||
    statusFilter !== 'all';

  if (loading && members.length === 0) {
    return (
      <section className="employer-team-table">
        <EmployerLoading
          variant="skeleton"
          rows={5}
          message="Loading your team..."
        />
      </section>
    );
  }

  if (error && members.length === 0) {
    return (
      <section className="employer-team-table">
        <EmployerError
          title="Unable to load your team"
          message={error}
          onRetry={onRetry}
          variant="inline"
        />
      </section>
    );
  }

  return (
    <section
      className={[
        'employer-team-table',
        compact ? 'employer-team-table--compact' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Employer team members"
      aria-busy={loading || actionLoading}
    >
      <header className="employer-team-table__header">
        <div>
          <h2>Team members</h2>
          <p>
            Manage the people who have access to your employer workspace.
          </p>
        </div>

        <span className="employer-team-table__total">
          {effectiveTotal.toLocaleString()} members
        </span>
      </header>

      <div className="employer-team-table__summary">
        <div>
          <span>Active</span>
          <strong>{counts.active}</strong>
        </div>
        <div>
          <span>Invitations pending</span>
          <strong>{counts.pending}</strong>
        </div>
        <div>
          <span>Suspended</span>
          <strong>{counts.suspended}</strong>
        </div>
        <div>
          <span>Revoked</span>
          <strong>{counts.revoked}</strong>
        </div>
      </div>

      {(showSearch || showFilters) && (
        <div className="employer-team-table__toolbar">
          {showSearch && (
            <label className="employer-team-table__search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  handleFilterChange();
                }}
                placeholder="Search by name, email or department..."
                aria-label="Search team members"
                disabled={disabled || loading}
              />
            </label>
          )}

          {showFilters && (
            <div className="employer-team-table__filters">
              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(
                    event.target.value as
                      | EmployerTeamMemberRole
                      | 'all',
                  );
                  handleFilterChange();
                }}
                aria-label="Filter by role"
                disabled={disabled || loading}
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(
                    event.target.value as
                      | EmployerTeamMemberStatus
                      | 'all',
                  );
                  handleFilterChange();
                }}
                aria-label="Filter by status"
                disabled={disabled || loading}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as TeamSortOption)
                }
                aria-label="Sort team members"
                disabled={disabled || loading}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name-asc">Name A–Z</option>
                <option value="name-desc">Name Z–A</option>
              </select>
            </div>
          )}
        </div>
      )}

      {error && members.length > 0 && (
        <EmployerError
          message={error}
          onRetry={onRetry}
          variant="inline"
          compact
        />
      )}

      {visibleMembers.length === 0 ? (
        <EmployerEmptyState
          variant={hasFilters ? 'search' : 'team'}
          title={hasFilters ? 'No matching team members' : emptyTitle}
          description={
            hasFilters
              ? 'Try changing your search or filters.'
              : emptyMessage
          }
          compact
          action={
            hasFilters ? (
              <button
                type="button"
                className="employer-team-table__clear"
                onClick={clearFilters}
                disabled={disabled}
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="employer-team-table__list">
          {visibleMembers.map((member) => (
            <EmployerTeamMember
              key={member.id}
              member={member}
              onView={onView}
              onEditRole={onEditRole}
              onResendInvitation={onResendInvitation}
              onSuspend={onSuspend}
              onReactivate={onReactivate}
              onRemove={onRemove}
              loading={false}
              actionLoading={actionLoading}
              disabled={disabled}
              readOnly={readOnly}
              canManage={canManage}
              showLastActive={showLastActive}
              compact={compact}
            />
          ))}
        </div>
      )}

      {showPagination && effectiveTotal > 0 && (
        <EmployerPagination
          page={safePage}
          pageSize={currentPageSize}
          total={effectiveTotal}
          onPageChange={(nextPage) => {
            if (isServerPaginated) {
              onPageChange?.(nextPage);
            } else {
              setLocalPage(nextPage);
            }
          }}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
          loading={loading}
          disabled={disabled}
        />
      )}
    </section>
  );
}

export default EmployerTeamTable;
