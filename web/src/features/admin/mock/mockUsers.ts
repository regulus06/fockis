import type { PlatformUser, UserAccountStatus } from '../types/admin.types';

const FIRST_NAMES = [
  'Ava', 'Liam', 'Maya', 'Noah', 'Zoe', 'Ethan', 'Ines', 'Lucas', 'Nora', 'Kai',
  'Mila', 'Theo', 'Sana', 'Felix', 'Rosa', 'Owen', 'Leila', 'Axel', 'Freya', 'Diego',
  'Amara', 'Jonas', 'Talia', 'Rhys', 'Yara', 'Milo', 'Nadia', 'Finn', 'Layla', 'Sebastian',
  'Ivy', 'Oscar', 'Priya', 'Hugo', 'Elin', 'Dario', 'Wren', 'Aziz', 'June', 'Rowan',
  'Sasha', 'Nico', 'Petra', 'Kofi', 'Anya', 'Malik', 'Suri', 'Leon', 'Tara', 'Emil',
];
const LAST_NAMES = [
  'Sato', 'Novak', 'Fischer', 'Reyes', 'Kowalski', 'Haddad', 'Larsen', 'Moreau', 'Petrov', 'Diallo',
  'Okafor', 'Nilsson', 'Rossi', 'Kim', 'Baptiste', 'Weber', 'Almeida', 'Sørensen', 'Yamada', 'Costa',
];
const STATUS_CYCLE: UserAccountStatus[] = [
  'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE',
  'SUSPENDED', 'SUSPENDED',
  'DEACTIVATED', 'DEACTIVATED',
  'BLOCKED', 'BLOCKED',
  'PENDING_REVIEW',
  'PENDING_DELETION',
  'INACTIVE',
];
const ROLES: PlatformUser['role'][] = ['MEMBER', 'MEMBER', 'MEMBER', 'SELLER', 'CREATOR', 'AGENT'];
const FLAG_POOL = ['new_device', 'high_risk_geo', 'chargeback_history', 'kyc_pending', 'vip'];

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function buildUser(i: number): PlatformUser {
  const first = FIRST_NAMES[i % FIRST_NAMES.length];
  const last = LAST_NAMES[i % LAST_NAMES.length];
  const status = STATUS_CYCLE[i % STATUS_CYCLE.length];
  const username = `${first.toLowerCase()}.${last.toLowerCase()}${i}`;
  const flags = FLAG_POOL.filter((_, fi) => (i + fi) % 9 === 0);

  const user: PlatformUser = {
    id: `usr_${(10000 + i).toString()}`,
    name: `${first} ${last}`,
    username,
    email: `${username}@example.com`,
    avatarSeed: username,
    role: ROLES[i % ROLES.length],
    status,
    verified: i % 4 !== 0,
    flags,
    createdAt: iso(700 - i * 6),
    lastLogin: status === 'PERMANENTLY_DELETED' ? null : iso(i % 30),
  };

  if (status === 'BLOCKED') {
    user.blockCaseId = `CASE-2026-${(4800 + i).toString()}`;
    user.blockedAt = iso(i % 20);
    user.blockedBy = 'MODERATION_ADMIN';
    user.blockReason = ['POLICY_VIOLATION', 'FRAUD', 'SPAM', 'ABUSIVE_BEHAVIOR'][i % 4];
    user.blockNotes = 'Escalated from automated risk review.';
    user.userNotified = true;
    user.reviewStatus = 'PENDING';
  }
  if (status === 'SUSPENDED') {
    user.suspensionStart = iso(i % 10);
    if (i % 2 === 0) {
      const end = new Date();
      end.setDate(end.getDate() + (5 + (i % 15)));
      user.suspensionEnd = end.toISOString();
    }
  }
  if (status === 'DEACTIVATED') {
    user.deactivationReason = 'Deactivated at administrator discretion pending review.';
  }
  if (status === 'PENDING_DELETION') {
    user.deletionCaseId = `DEL-2026-${(1200 + i).toString()}`;
    user.deletionReason = 'Requested by USER_ADMIN pending SUPER_ADMIN approval.';
  }

  return user;
}

export const mockUsers: PlatformUser[] = Array.from({ length: 50 }, (_, i) => buildUser(i));

export function findUserById(id: string): PlatformUser | undefined {
  return mockUsers.find((u) => u.id === id);
}
