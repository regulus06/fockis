import type { AdminRole } from '../types/admin.types';

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  USER_ADMIN: 'User Admin',
  MODERATION_ADMIN: 'Moderation Admin',
  SUPPORT_ADMIN: 'Support Admin',
  MARKETPLACE_ADMIN: 'Marketplace Admin',
  SELLER_ADMIN: 'Seller Admin',
  SHIPPING_ADMIN: 'Shipping Admin',
  FINANCE_ADMIN: 'Finance Admin',
  PAYMENTS_ADMIN: 'Payments Admin',
  SUBSCRIPTION_ADMIN: 'Subscription Admin',
  GIFTS_ADMIN: 'Gifts Admin',
  MARKETING_ADMIN: 'Marketing Admin',
  LIVE_ADMIN: 'Live Admin',
  MEETINGS_ADMIN: 'Meetings Admin',
  REAL_ESTATE_ADMIN: 'Real Estate Admin',
  DOCUMENT_ADMIN: 'Document Admin',
  DESIGN_ADMIN: 'Design Admin',
  PLAYLIST_ADMIN: 'Playlist Admin',
  REVIEWS_ADMIN: 'Reviews Admin',
  ANALYTICS_ADMIN: 'Analytics Admin',
  SECURITY_ADMIN: 'Security Admin',
  AUDITOR: 'Auditor',
};

export function roleLabel(role: AdminRole): string {
  return ROLE_LABELS[role] ?? role;
}

export function AdminRoleBadge({ role }: { role: AdminRole }) {
  const variant = role === 'SUPER_ADMIN' ? 'accent' : 'neutral';
  return (
    <span className={`fk-badge fk-badge--${variant}`}>
      <span className="fk-badge__dot" />
      {roleLabel(role)}
    </span>
  );
}
