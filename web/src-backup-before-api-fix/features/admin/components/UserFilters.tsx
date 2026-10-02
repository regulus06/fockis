import type { UserAccountStatus } from '../types/admin.types';

const STATUSES: (UserAccountStatus | 'ALL')[] = [
  'ALL', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'DEACTIVATED', 'BLOCKED',
  'PENDING_REVIEW', 'PENDING_DELETION', 'PERMANENTLY_DELETED',
];

const ROLES = ['ALL', 'MEMBER', 'SELLER', 'CREATOR', 'AGENT'];

export function UserFilters({
  search,
  onSearch,
  status,
  onStatus,
  role,
  onRole,
}: {
  search: string;
  onSearch: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  role: string;
  onRole: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <div className="fk-search">
        <span>🔍</span>
        <input
          placeholder="Search name, username, email, ID…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <select className="fk-select" value={status} onChange={(e) => onStatus(e.target.value)}>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s === 'ALL' ? 'All statuses' : s.replace('_', ' ')}
          </option>
        ))}
      </select>
      <select className="fk-select" value={role} onChange={(e) => onRole(e.target.value)}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r === 'ALL' ? 'All roles' : r}
          </option>
        ))}
      </select>
    </div>
  );
}
