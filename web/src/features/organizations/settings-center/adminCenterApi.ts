/**
 * adminCenterApi.ts — Settings & Roles (Organization Administration Center)
 * /organizations/:id/admin-center/…  — every permission is checked by the server.
 */

import { churchDelete, churchGet, churchPatch, churchPost, churchPut, churchRequest } from "../api/organizationApi";

export type NotificationKey = "email" | "members" | "eventReminders" | "ministryAnnouncements" | "donations" | "financialApprovals" | "security" | "admin";

export interface CurrencyPrefs {
  defaultCurrency: string;
  acceptedCurrencies: string[];
  multiCurrency: boolean;
  showConverted: boolean;
}

export interface Preferences {
  saved: boolean;
  suggested: boolean;
  timeZone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currency: CurrencyPrefs;
  exchangeRates: { base: string; rates: Record<string, number>; fetchedAt: string | null; provider: string } | null;
  allowMembershipRequests: boolean;
  showLocationsPublicly: boolean;
  publicEvents: boolean;
  memberDirectory: boolean;
  notifications: Record<NotificationKey, boolean>;
  updatedAt: string | null;
}

export interface Access {
  isOwner: boolean;
  isAdmin: boolean;
  canEditSettings: boolean;
  canEditProfile: boolean;
  canManageTeam: boolean;
  canManagePermissions: boolean;
  canViewAudit: boolean;
  canArchive: boolean;
  canDelete: boolean;
}

export interface Overview {
  organization: { id: string; name: string; organizationType: string; status: string; domain: string; isDiscoverable: boolean; requireApproval: boolean };
  access: Access;
  preferences: Preferences;
  giving: { enabled: boolean } | null;
  roleCounts: Record<string, number>;
  pendingRequests: number;
}

export interface TeamMember {
  memberId: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  isOwner: boolean;
  status: string;
  permissions: string[];
  joinedAt: string | null;
}

export interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  category: string;
  targetType: string;
  targetLabel: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  details: string;
  createdAt: string | null;
}

export interface Team {
  ownerUserId: string;
  items: TeamMember[];
  pending: { memberId: string; name: string; requestedAt: string | null }[];
  history: AuditEntry[];
}

export interface Rates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: string;
  provider: string;
  note: string;
}

export interface QuickInput {
  allowPublicPage?: boolean;
  enableDonations?: boolean;
  allowMembershipRequests?: boolean;
  showLocationsPublicly?: boolean;
  publicEvents?: boolean;
  memberDirectory?: boolean;
}

const base = (id: string) => `/organizations/${encodeURIComponent(id)}/admin-center`;

export const adminCenterApi = {
  overview: (id: string, signal?: AbortSignal) => churchGet<Overview>(base(id), undefined, signal),
  publicSettings: (id: string, signal?: AbortSignal) =>
    churchRequest<{ allowMembershipRequests: boolean; showLocationsPublicly: boolean; publicEvents: boolean; memberDirectory: boolean; defaultCurrency: string; timeZone: string; language: string }>(`${base(id)}/public`, { signal, anonymous: true }),
  savePreferences: (id: string, input: Partial<Omit<Preferences, "saved" | "suggested" | "exchangeRates" | "updatedAt" | "currency">> & { currency?: Partial<CurrencyPrefs> }) =>
    churchPut<Preferences>(`${base(id)}/preferences`, input),
  quick: (id: string, input: QuickInput) => churchPatch<Overview>(`${base(id)}/quick`, input),
  profile: (id: string, input: { name?: string; organizationType?: string }) => churchPatch<Overview>(`${base(id)}/profile`, input),
  status: (id: string, status: "active" | "archived") => churchPost<Overview>(`${base(id)}/status`, { status }),
  rates: (id: string, baseCurrency?: string) => churchGet<Rates>(`${base(id)}/exchange-rates`, { base: baseCurrency }),
  team: (id: string, signal?: AbortSignal) => churchGet<Team>(`${base(id)}/team`, undefined, signal),
  changeRole: (id: string, memberId: string, role: string) => churchPatch<Team>(`${base(id)}/team/${encodeURIComponent(memberId)}/role`, { role }),
  setPermissions: (id: string, memberId: string, permissions: string[]) => churchPut<Team>(`${base(id)}/team/${encodeURIComponent(memberId)}/permissions`, { permissions }),
  removeAccess: (id: string, memberId: string) => churchDelete<Team>(`${base(id)}/team/${encodeURIComponent(memberId)}/access`),
  transferOwnership: (id: string, memberId: string, confirmName: string) => churchPost<{ ok: boolean; newOwner: string }>(`${base(id)}/transfer-ownership`, { memberId, confirmName }),
  audit: (id: string, query: { category?: string; q?: string; page?: number }, signal?: AbortSignal) =>
    churchGet<{ items: AuditEntry[]; total: number; page: number; pageSize: number; hasMore: boolean }>(`${base(id)}/audit`, query, signal),
  searchMembers: (id: string, search: string, signal?: AbortSignal) =>
    churchGet<{ items: { id: string; role?: string; status?: string; profile?: { displayName?: string; email?: string }; user?: { displayName?: string } }[] }>(
      `/organizations/${encodeURIComponent(id)}/members`,
      { search, pageSize: 10, status: "active" },
      signal,
    ),
};
