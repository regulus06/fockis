export type DomainOwnerType =
  | "user"
  | "organization";

export type DomainAssignmentType =
  | "free"
  | "paid"
  | "manual"
  | "promotional";

export type DomainStatus =
  | "active"
  | "available"
  | "suspended"
  | "expired";

export type DomainAuthorizationType =
  | "user"
  | "organization";

export type DomainCampaignStatus =
  | "draft"
  | "active"
  | "paused"
  | "ended";

export interface DomainPolicy {
  domainsEnabled: boolean;

  personalDomainsEnabled: boolean;
  businessDomainsEnabled: boolean;

  personalFreeDomainLimit: number;
  businessFreeDomainLimit: number;

  additionalPersonalDomainRequiresPayment: boolean;
  additionalBusinessDomainRequiresPayment: boolean;

  personalAdditionalDomainPrice: number;
  businessAdditionalDomainPrice: number;

  currency: string;

  allowManualFreeGrants: boolean;
  allowManualAssignments: boolean;

  allowUserDomainChanges: boolean;
  domainChangePrice: number;

  updatedAt?: string;
}

export interface UpdateDomainPolicyPayload {
  domainsEnabled: boolean;

  personalDomainsEnabled: boolean;
  businessDomainsEnabled: boolean;

  personalFreeDomainLimit: number;
  businessFreeDomainLimit: number;

  additionalPersonalDomainRequiresPayment: boolean;
  additionalBusinessDomainRequiresPayment: boolean;

  personalAdditionalDomainPrice: number;
  businessAdditionalDomainPrice: number;

  currency: string;

  allowManualFreeGrants: boolean;
  allowManualAssignments: boolean;

  allowUserDomainChanges: boolean;
  domainChangePrice: number;
}

export interface DomainCampaign {
  id: string;

  name: string;

  description?: string;

  freeDomainLimit: number;

  freeDomainsClaimed: number;

  freeDomainsRemaining: number;

  domainsPerUser: number;

  startDate: string;

  endDate: string;

  status: DomainCampaignStatus;

  eligibleUsers: boolean;

  eligibleOrganizations: boolean;

  eligibleNewUsers: boolean;

  eligibleExistingUsers: boolean;

  createdAt?: string;

  updatedAt?: string;
}

export interface CreateDomainCampaignPayload {
  name: string;

  description?: string;

  freeDomainLimit: number;

  domainsPerUser: number;

  startDate: string;

  endDate: string;

  eligibleUsers: boolean;

  eligibleOrganizations: boolean;

  eligibleNewUsers: boolean;

  eligibleExistingUsers: boolean;
}

export interface DomainAuthorization {
  id: string;

  authorizationType: DomainAuthorizationType;

  ownerId: string;

  ownerName: string;

  ownerEmail?: string;

  freeDomainLimit: number;

  freeDomainsUsed: number;

  freeDomainsRemaining: number;

  unlimited: boolean;

  reason?: string;

  expiresAt?: string | null;

  active: boolean;

  createdAt?: string;

  updatedAt?: string;
}

export interface CreateDomainAuthorizationPayload {
  authorizationType: DomainAuthorizationType;

  ownerId: string;

  freeDomainLimit: number;

  unlimited: boolean;

  reason?: string;

  expiresAt?: string | null;
}

export interface ManagedDomain {
  id: string;

  domain: string;

  ownerType: DomainOwnerType;

  ownerId?: string;

  ownerName?: string;

  organizationId?: string;

  organizationName?: string;

  assignmentType: DomainAssignmentType;

  status: DomainStatus;

  isFree: boolean;

  price: number;

  currency: string;

  purchasedAt?: string | null;

  expiresAt?: string | null;

  assignedAt?: string | null;

  assignedByUserId?: string | null;

  createdAt?: string;

  updatedAt?: string;
}

export interface DomainStats {
  totalDomains: number;

  activeDomains: number;

  availableDomains: number;

  freeDomains: number;

  paidDomains: number;

  manualDomains: number;

  promotionalDomains: number;

  totalRevenue: number;

  activeCampaigns: number;

  freeDomainsRemainingAcrossCampaigns: number;
}

export interface DomainAdminOverview {
  policy: DomainPolicy;

  stats: DomainStats;

  campaigns: DomainCampaign[];

  authorizations: DomainAuthorization[];

  domains: ManagedDomain[];
}

export interface DomainListParams {
  search?: string;

  status?: DomainStatus;

  assignmentType?: DomainAssignmentType;

  ownerType?: DomainOwnerType;

  page?: number;

  limit?: number;
}