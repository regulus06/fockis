import type { AdminRole } from '../types/admin.types';
import { useAdminSessionStore } from '../store/adminSessionStore';
import { roleLabel } from './AdminRoleBadge';

const ROLES: AdminRole[] = [
  'SUPER_ADMIN',
  'USER_ADMIN',
  'MODERATION_ADMIN',
  'SUPPORT_ADMIN',
  'MARKETPLACE_ADMIN',
  'SELLER_ADMIN',
  'SHIPPING_ADMIN',
  'FINANCE_ADMIN',
  'PAYMENTS_ADMIN',
  'SUBSCRIPTION_ADMIN',
  'GIFTS_ADMIN',
  'MARKETING_ADMIN',
  'LIVE_ADMIN',
  'MEETINGS_ADMIN',
  'REAL_ESTATE_ADMIN',
  'DOCUMENT_ADMIN',
  'DESIGN_ADMIN',
  'PLAYLIST_ADMIN',
  'REVIEWS_ADMIN',
  'ANALYTICS_ADMIN',
  'SECURITY_ADMIN',
  'AUDITOR',
];

export function MockAdminSessionSelector() {
  const currentRole = useAdminSessionStore((s) => s.currentAdmin.role);
  const setRole = useAdminSessionStore((s) => s.setRole);

  return (
    <div className="fk-search" style={{ minWidth: 200 }}>
      <span style={{ fontSize: 11, color: 'var(--fk-text-tertiary)', whiteSpace: 'nowrap' }}>
        Viewing as
      </span>
      <select
        className="fk-select"
        style={{ border: 'none', background: 'transparent', width: '100%' }}
        value={currentRole}
        onChange={(e) => setRole(e.target.value as AdminRole)}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {roleLabel(r)}
          </option>
        ))}
      </select>
    </div>
  );
}
