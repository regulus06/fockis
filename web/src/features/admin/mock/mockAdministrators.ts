import type { AdminRole, AdminUser } from '../types/admin.types';

const ROLE_HANDLES: Record<AdminRole, { name: string; email: string }> = {
  SUPER_ADMIN: { name: 'Elena Voss', email: 'superadmin@fockis.local' },
  USER_ADMIN: { name: 'Marcus Chen', email: 'useradmin@fockis.local' },
  MODERATION_ADMIN: { name: 'Priya Nair', email: 'moderation@fockis.local' },
  SUPPORT_ADMIN: { name: 'Jordan Blake', email: 'support@fockis.local' },
  MARKETPLACE_ADMIN: { name: 'Sofia Marín', email: 'marketplace@fockis.local' },
  SELLER_ADMIN: { name: 'Tobias Renner', email: 'seller@fockis.local' },
  SHIPPING_ADMIN: { name: 'Amara Osei', email: 'shipping@fockis.local' },
  FINANCE_ADMIN: { name: 'David Kaplan', email: 'finance@fockis.local' },
  PAYMENTS_ADMIN: { name: 'Lucia Ferrari', email: 'payments@fockis.local' },
  SUBSCRIPTION_ADMIN: { name: 'Noah Bergström', email: 'subscriptions@fockis.local' },
  GIFTS_ADMIN: { name: 'Yuki Tanaka', email: 'gifts@fockis.local' },
  MARKETING_ADMIN: { name: 'Isabella Cruz', email: 'marketing@fockis.local' },
  LIVE_ADMIN: { name: 'Kwame Boateng', email: 'live@fockis.local' },
  MEETINGS_ADMIN: { name: 'Freya Lindqvist', email: 'meetings@fockis.local' },
  REAL_ESTATE_ADMIN: { name: 'Omar Haddad', email: 'realestate@fockis.local' },
  DOCUMENT_ADMIN: { name: 'Chloe Dubois', email: 'documents@fockis.local' },
  DESIGN_ADMIN: { name: 'Ravi Deshmukh', email: 'design@fockis.local' },
  PLAYLIST_ADMIN: { name: 'Mei Lin', email: 'playlists@fockis.local' },
  REVIEWS_ADMIN: { name: 'Gabriel Silva', email: 'reviews@fockis.local' },
  ANALYTICS_ADMIN: { name: 'Hana Kobayashi', email: 'analytics@fockis.local' },
  SECURITY_ADMIN: { name: 'Viktor Petrov', email: 'security@fockis.local' },
  AUDITOR: { name: 'Grace Adeyemi', email: 'auditor@fockis.local' },
};

const roles = Object.keys(ROLE_HANDLES) as AdminRole[];

function iso(daysAgo: number, hourOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hourOffset);
  return d.toISOString();
}

export const mockAdministrators: AdminUser[] = roles.map((role, i) => {
  const handle = ROLE_HANDLES[role];
  const isSuper = role === 'SUPER_ADMIN';
  return {
    id: `adm_${(i + 1).toString().padStart(4, '0')}`,
    name: handle.name,
    email: handle.email,
    role,
    status: i === 20 ? 'SUSPENDED' : 'ACTIVE', // AUDITOR sample suspended for demo variety
    twoFactorEnabled: isSuper ? true : i % 3 !== 0,
    lastLogin: iso(i % 5, i),
    lastActivity: iso(0, i % 12),
    activeSessions: isSuper ? 3 : 1 + (i % 3),
    failedLoginAttempts: i % 7 === 0 ? 2 : 0,
    securityAlerts: i % 11 === 0 ? 1 : 0,
    createdAt: iso(180 - i * 4),
  };
});

export function findAdministratorByRole(role: AdminRole): AdminUser {
  const found = mockAdministrators.find((a) => a.role === role);
  if (!found) throw new Error(`No mock administrator seeded for role ${role}`);
  return found;
}
