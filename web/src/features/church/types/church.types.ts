/**
 * church.types.ts
 * -----------------------------------------------------------------------------
 * Shared TypeScript contracts for Fockis organizations.
 *
 * NOTE:
 * The existing "church" feature tree is intentionally reused.
 *
 * Although these files currently live under:
 *
 *   features/church
 *
 * the organization/member models are designed so they can support:
 *
 * - Churches
 * - Christian ministries
 * - Fellowships
 * - Missions
 * - Nonprofits
 * - Schools
 * - Colleges
 * - Universities
 * - Businesses
 * - Civic organizations
 * - Sports organizations
 * - Arts organizations
 * - Health organizations
 * - Technology organizations
 * - Community organizations
 * - Other organizations
 *
 * Organization domains are Fockis-owned logical namespaces.
 *
 * Examples:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.net
 *   springfieldchurch.fockis.edu
 *   springfieldchurch.fockis.church
 *   springfieldchurch.fockis.co
 *   springfieldchurch.fockis.io
 *
 * Member domains may be created beneath the organization's Fockis domain:
 *
 *   john.springfieldchurch.fockis.com
 *   pastor.springfieldchurch.fockis.com
 *   admin.springfieldchurch.fockis.com
 *
 * The backend remains authoritative for validation and authorization.
 *
 * Church livestreams intentionally connect to the existing Fockis Meetings
 * system through meetingId.
 * ----------------------------------------------------------------------------- */


/* ============================================================================
 * Common
 * ========================================================================== */

export type ISODateString = string;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface UserRef {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  website?: string;

  socialLinks?: Partial<
    Record<
      "facebook" | "instagram" | "youtube" | "x" | "tiktok",
      string
    >
  >;
}


/* ============================================================================
 * Fockis Domains
 * ========================================================================== */

/**
 * Fockis-supported organization domain suffixes.
 *
 * IMPORTANT:
 *
 * These are logical Fockis namespaces.
 *
 * They do NOT imply that DNS records have been registered on the public
 * internet. Public DNS / routing is a separate infrastructure concern.
 */
export const FOCKIS_DOMAIN_SUFFIX_OPTIONS = [
  ".fockis.com",
  ".fockis.org",
  ".fockis.net",
  ".fockis.edu",
  ".fockis.church",
  ".fockis.co",
  ".fockis.io",
] as const;

export type FockisDomainSuffix =
  (typeof FOCKIS_DOMAIN_SUFFIX_OPTIONS)[number];


/**
 * Returns true when a domain uses one of the supported Fockis suffixes.
 *
 * Examples:
 *
 *   springfieldchurch.fockis.com -> true
 *   springfieldchurch.fockis.church -> true
 *   springfieldchurch.com -> false
 *   fockis.com -> false
 */
export function isFockisOrganizationDomain(
  domain: string,
): boolean {
  const normalized = normalizeFockisDomain(domain);

  return FOCKIS_DOMAIN_SUFFIX_OPTIONS.some(
    (suffix) =>
      normalized.endsWith(suffix) &&
      normalized.length > suffix.length,
  );
}


/**
 * Normalize a Fockis domain for frontend use.
 *
 * This function intentionally performs normalization only.
 * The backend must perform the authoritative validation.
 */
export function normalizeFockisDomain(
  value: string,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .replace(/\.$/, "");
}


/**
 * Extract the organization prefix from a valid Fockis organization domain.
 *
 * Example:
 *
 *   springfieldchurch.fockis.com
 *
 * becomes:
 *
 *   springfieldchurch
 */
export function getFockisOrganizationDomainPrefix(
  domain: string,
): string | null {
  const normalized = normalizeFockisDomain(domain);

  const suffix = FOCKIS_DOMAIN_SUFFIX_OPTIONS.find(
    (candidate) =>
      normalized.endsWith(candidate) &&
      normalized.length > candidate.length,
  );

  if (!suffix) {
    return null;
  }

  return normalized.slice(
    0,
    -suffix.length,
  );
}


/**
 * Build a complete Fockis organization domain.
 *
 * Example:
 *
 *   buildFockisOrganizationDomain(
 *     "springfieldchurch",
 *     ".fockis.com",
 *   )
 *
 * returns:
 *
 *   springfieldchurch.fockis.com
 */
export function buildFockisOrganizationDomain(
  prefix: string,
  suffix: FockisDomainSuffix,
): string {
  return `${normalizeFockisDomainPrefix(prefix)}${suffix}`;
}


/**
 * Normalize a domain prefix.
 *
 * The prefix is intended to be DNS-label compatible.
 */
export function normalizeFockisDomainPrefix(
  value: string,
): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}


/**
 * Validate the organization prefix locally.
 *
 * Backend validation remains authoritative.
 */
export function isValidFockisDomainPrefix(
  prefix: string,
): boolean {
  const normalized =
    normalizeFockisDomainPrefix(prefix);

  return (
    normalized.length >= 2 &&
    normalized.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
      normalized,
    )
  );
}


/**
 * Validate a complete organization Fockis domain locally.
 *
 * Examples of valid domains:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.church
 *
 * Examples of invalid domains:
 *
 *   fockis.com
 *   springfieldchurch.com
 *   springfieldchurch.example.com
 */
export function isValidFockisOrganizationDomain(
  domain: string,
): boolean {
  const normalized =
    normalizeFockisDomain(domain);

  if (
    !normalized ||
    normalized.length > 253
  ) {
    return false;
  }

  const prefix =
    getFockisOrganizationDomainPrefix(
      normalized,
    );

  if (!prefix) {
    return false;
  }

  return isValidFockisDomainPrefix(prefix);
}


/**
 * Build a member domain beneath an organization domain.
 *
 * Example:
 *
 *   john + springfieldchurch.fockis.com
 *
 * becomes:
 *
 *   john.springfieldchurch.fockis.com
 */
export function buildFockisMemberDomain(
  memberPrefix: string,
  organizationDomain: string,
): string {
  const normalizedPrefix =
    normalizeFockisDomainPrefix(
      memberPrefix,
    );

  const normalizedOrganizationDomain =
    normalizeFockisDomain(
      organizationDomain,
    );

  return `${normalizedPrefix}.${normalizedOrganizationDomain}`;
}


/**
 * Validate a Fockis member domain locally.
 *
 * A member domain must:
 *
 *   <member-prefix>.<organization-domain>
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 *
 * The member prefix is intentionally limited to one DNS label.
 */
export function isValidFockisMemberDomain(
  memberDomain: string,
  organizationDomain: string,
): boolean {
  const member =
    normalizeFockisDomain(memberDomain);

  const organization =
    normalizeFockisDomain(
      organizationDomain,
    );

  if (!member || !organization) {
    return false;
  }

  const expectedSuffix =
    `.${organization}`;

  if (!member.endsWith(expectedSuffix)) {
    return false;
  }

  const prefix =
    member.slice(
      0,
      -expectedSuffix.length,
    );

  if (
    !prefix ||
    prefix.includes(".")
  ) {
    return false;
  }

  return isValidFockisDomainPrefix(prefix);
}


/* ============================================================================
 * Organization
 * ========================================================================== */

/**
 * General Fockis organization types.
 *
 * IMPORTANT:
 *
 * These values are the source of truth for the frontend organization
 * type selector.
 *
 * The backend OrganizationType enum / DTO / schema should use the same
 * string values.
 */
export enum OrganizationType {
  /* --------------------------------------------------------------------------
   * FAITH & RELIGION
   * ------------------------------------------------------------------------ */

  Church = "church",

  ChristianChurch = "christian_church",

  ChristianMinistry = "christian_ministry",

  ChristianFellowship = "christian_fellowship",

  Mission = "mission",

  PrayerOrganization = "prayer_organization",

  ChristianNetwork = "christian_network",

  ChristianNonprofit = "christian_nonprofit",

  BibleStudyOrganization = "bible_study_organization",

  Mosque = "mosque",

  IslamicOrganization = "islamic_organization",

  Synagogue = "synagogue",

  JewishOrganization = "jewish_organization",

  Temple = "temple",

  ReligiousOrganization = "religious_organization",

  ReligiousInstitution = "religious_institution",

  FaithOrganization = "faith_organization",


  /* --------------------------------------------------------------------------
   * EDUCATION
   * ------------------------------------------------------------------------ */

  School = "school",

  ElementarySchool = "elementary_school",

  MiddleSchool = "middle_school",

  HighSchool = "high_school",

  PrivateSchool = "private_school",

  PublicSchool = "public_school",

  CharterSchool = "charter_school",

  College = "college",

  University = "university",

  CommunityCollege = "community_college",

  VocationalSchool = "vocational_school",

  TechnicalSchool = "technical_school",

  TradeSchool = "trade_school",

  Academy = "academy",

  TrainingInstitute = "training_institute",

  TrainingOrganization = "training_organization",

  EducationalOrganization = "educational_organization",

  EducationalInstitution = "educational_institution",

  StudentOrganization = "student_organization",

  EducationOrganization = "education_organization",

  Institute = "institute",


  /* --------------------------------------------------------------------------
   * CIVIC & POLITICAL
   * ------------------------------------------------------------------------ */

  PoliticalOrganization = "political_organization",

  PoliticalParty = "political_party",

  CivicOrganization = "civic_organization",

  AdvocacyOrganization = "advocacy_organization",

  GovernmentOrganization = "government_organization",

  PublicAffairsOrganization = "public_affairs_organization",

  CommunityActionOrganization =
    "community_action_organization",


  /* --------------------------------------------------------------------------
   * COMMUNITY & SOCIAL
   * ------------------------------------------------------------------------ */

  SocialOrganization = "social_organization",

  CommunityOrganization = "community_organization",

  CommunityGroup = "community_group",

  NeighborhoodOrganization =
    "neighborhood_organization",

  SupportGroup = "support_group",


  /* --------------------------------------------------------------------------
   * NONPROFIT & CHARITY
   * ------------------------------------------------------------------------ */

  Nonprofit = "nonprofit",

  NonprofitOrganization =
    "nonprofit_organization",

  Charity = "charity",

  Foundation = "foundation",

  HumanitarianOrganization =
    "humanitarian_organization",

  ReliefOrganization =
    "relief_organization",

  VolunteerOrganization =
    "volunteer_organization",


  /* --------------------------------------------------------------------------
   * BUSINESS & PROFESSIONAL
   * ------------------------------------------------------------------------ */

  Business = "business",

  Company = "company",

  ProfessionalOrganization =
    "professional_organization",

  ProfessionalAssociation =
    "professional_association",

  TradeAssociation =
    "trade_association",

  IndustryAssociation =
    "industry_association",

  BusinessAssociation =
    "business_association",


  /* --------------------------------------------------------------------------
   * SPORTS & RECREATION
   * ------------------------------------------------------------------------ */

  SportsClub = "sports_club",

  SportsOrganization = "sports_organization",

  SportsLeague = "sports_league",

  AthleticTeam = "athletic_team",

  AthleticOrganization =
    "athletic_organization",

  RecreationOrganization =
    "recreation_organization",

  FitnessOrganization =
    "fitness_organization",


  /* --------------------------------------------------------------------------
   * ARTS & CULTURE
   * ------------------------------------------------------------------------ */

  ArtsOrganization = "arts_organization",

  CulturalOrganization =
    "cultural_organization",

  MusicOrganization = "music_organization",

  TheaterOrganization =
    "theater_organization",

  TheatreOrganization =
    "theatre_organization",

  DanceOrganization = "dance_organization",

  CreativeOrganization =
    "creative_organization",

  PerformingArtsOrganization =
    "performing_arts_organization",


  /* --------------------------------------------------------------------------
   * HEALTH & WELLNESS
   * ------------------------------------------------------------------------ */

  HealthOrganization = "health_organization",

  HealthcareOrganization =
    "healthcare_organization",

  MedicalOrganization =
    "medical_organization",

  WellnessOrganization =
    "wellness_organization",

  MentalHealthOrganization =
    "mental_health_organization",


  /* --------------------------------------------------------------------------
   * YOUTH & FAMILY
   * ------------------------------------------------------------------------ */

  YouthOrganization = "youth_organization",

  FamilyOrganization = "family_organization",

  ChildrensOrganization =
    "childrens_organization",

  ChildrenOrganization =
    "children_organization",

  ParentOrganization =
    "parent_organization",


  /* --------------------------------------------------------------------------
   * CLUBS & ASSOCIATIONS
   * ------------------------------------------------------------------------ */

  Club = "club",

  Association = "association",

  Society = "society",

  AlumniOrganization =
    "alumni_organization",

  AlumniAssociation =
    "alumni_association",


  /* --------------------------------------------------------------------------
   * TECHNOLOGY
   * ------------------------------------------------------------------------ */

  TechnologyOrganization =
    "technology_organization",

  TechnologyGroup =
    "technology_group",

  DeveloperOrganization =
    "developer_organization",

  SoftwareOrganization =
    "software_organization",

  InnovationOrganization =
    "innovation_organization",

  StartupOrganization =
    "startup_organization",


  /* --------------------------------------------------------------------------
   * ENVIRONMENT
   * ------------------------------------------------------------------------ */

  EnvironmentalOrganization =
    "environmental_organization",

  EnvironmentOrganization =
    "environment_organization",

  ConservationOrganization =
    "conservation_organization",

  ClimateOrganization =
    "climate_organization",


  /* --------------------------------------------------------------------------
   * OTHER
   * ------------------------------------------------------------------------ */

  Other = "other",
};


/**
 * Human-readable organization type labels.
 */
export const ORGANIZATION_TYPE_LABELS: Record<
  OrganizationType,
  string
> = {
  /* --------------------------------------------------------------------------
   * FAITH & RELIGION
   * ------------------------------------------------------------------------ */

  [OrganizationType.Church]:
    "Church",

  [OrganizationType.ChristianChurch]:
    "Christian Church",

  [OrganizationType.ChristianMinistry]:
    "Christian Ministry",

  [OrganizationType.ChristianFellowship]:
    "Christian Fellowship",

  [OrganizationType.Mission]:
    "Mission",

  [OrganizationType.PrayerOrganization]:
    "Prayer Organization",

  [OrganizationType.ChristianNetwork]:
    "Christian Network",

  [OrganizationType.ChristianNonprofit]:
    "Christian Nonprofit",

  [OrganizationType.BibleStudyOrganization]:
    "Bible Study Organization",

  [OrganizationType.Mosque]:
    "Mosque",

  [OrganizationType.IslamicOrganization]:
    "Islamic Organization",

  [OrganizationType.Synagogue]:
    "Synagogue",

  [OrganizationType.JewishOrganization]:
    "Jewish Organization",

  [OrganizationType.Temple]:
    "Temple",

  [OrganizationType.ReligiousOrganization]:
    "Religious Organization",

  [OrganizationType.ReligiousInstitution]:
    "Religious Institution",

  [OrganizationType.FaithOrganization]:
    "Faith Organization",


  /* --------------------------------------------------------------------------
   * EDUCATION
   * ------------------------------------------------------------------------ */

  [OrganizationType.School]:
    "School",

  [OrganizationType.ElementarySchool]:
    "Elementary School",

  [OrganizationType.MiddleSchool]:
    "Middle School",

  [OrganizationType.HighSchool]:
    "High School",

  [OrganizationType.PrivateSchool]:
    "Private School",

  [OrganizationType.PublicSchool]:
    "Public School",

  [OrganizationType.CharterSchool]:
    "Charter School",

  [OrganizationType.College]:
    "College",

  [OrganizationType.University]:
    "University",

  [OrganizationType.CommunityCollege]:
    "Community College",

  [OrganizationType.VocationalSchool]:
    "Vocational School",

  [OrganizationType.TechnicalSchool]:
    "Technical School",

  [OrganizationType.TradeSchool]:
    "Trade School",

  [OrganizationType.Academy]:
    "Academy",

  [OrganizationType.TrainingInstitute]:
    "Training Institute",

  [OrganizationType.TrainingOrganization]:
    "Training Organization",

  [OrganizationType.EducationalOrganization]:
    "Educational Organization",

  [OrganizationType.EducationalInstitution]:
    "Educational Institution",

  [OrganizationType.StudentOrganization]:
    "Student Organization",

  [OrganizationType.EducationOrganization]:
    "Education Organization",

  [OrganizationType.Institute]:
    "Institute",


  /* --------------------------------------------------------------------------
   * CIVIC & POLITICAL
   * ------------------------------------------------------------------------ */

  [OrganizationType.PoliticalOrganization]:
    "Political Organization",

  [OrganizationType.PoliticalParty]:
    "Political Party",

  [OrganizationType.CivicOrganization]:
    "Civic Organization",

  [OrganizationType.AdvocacyOrganization]:
    "Advocacy Organization",

  [OrganizationType.GovernmentOrganization]:
    "Government Organization",

  [OrganizationType.PublicAffairsOrganization]:
    "Public Affairs Organization",

  [OrganizationType.CommunityActionOrganization]:
    "Community Action Organization",


  /* --------------------------------------------------------------------------
   * COMMUNITY & SOCIAL
   * ------------------------------------------------------------------------ */

  [OrganizationType.SocialOrganization]:
    "Social Organization",

  [OrganizationType.CommunityOrganization]:
    "Community Organization",

  [OrganizationType.CommunityGroup]:
    "Community Group",

  [OrganizationType.NeighborhoodOrganization]:
    "Neighborhood Organization",

  [OrganizationType.SupportGroup]:
    "Support Group",


  /* --------------------------------------------------------------------------
   * NONPROFIT & CHARITY
   * ------------------------------------------------------------------------ */

  [OrganizationType.Nonprofit]:
    "Nonprofit",

  [OrganizationType.NonprofitOrganization]:
    "Nonprofit Organization",

  [OrganizationType.Charity]:
    "Charity",

  [OrganizationType.Foundation]:
    "Foundation",

  [OrganizationType.HumanitarianOrganization]:
    "Humanitarian Organization",

  [OrganizationType.ReliefOrganization]:
    "Relief Organization",

  [OrganizationType.VolunteerOrganization]:
    "Volunteer Organization",


  /* --------------------------------------------------------------------------
   * BUSINESS & PROFESSIONAL
   * ------------------------------------------------------------------------ */

  [OrganizationType.Business]:
    "Business",

  [OrganizationType.Company]:
    "Company",

  [OrganizationType.ProfessionalOrganization]:
    "Professional Organization",

  [OrganizationType.ProfessionalAssociation]:
    "Professional Association",

  [OrganizationType.TradeAssociation]:
    "Trade Association",

  [OrganizationType.IndustryAssociation]:
    "Industry Association",

  [OrganizationType.BusinessAssociation]:
    "Business Association",


  /* --------------------------------------------------------------------------
   * SPORTS & RECREATION
   * ------------------------------------------------------------------------ */

  [OrganizationType.SportsClub]:
    "Sports Club",

  [OrganizationType.SportsOrganization]:
    "Sports Organization",

  [OrganizationType.SportsLeague]:
    "Sports League",

  [OrganizationType.AthleticTeam]:
    "Athletic Team",

  [OrganizationType.AthleticOrganization]:
    "Athletic Organization",

  [OrganizationType.RecreationOrganization]:
    "Recreation Organization",

  [OrganizationType.FitnessOrganization]:
    "Fitness Organization",


  /* --------------------------------------------------------------------------
   * ARTS & CULTURE
   * ------------------------------------------------------------------------ */

  [OrganizationType.ArtsOrganization]:
    "Arts Organization",

  [OrganizationType.CulturalOrganization]:
    "Cultural Organization",

  [OrganizationType.MusicOrganization]:
    "Music Organization",

  [OrganizationType.TheaterOrganization]:
    "Theater Organization",

  [OrganizationType.TheatreOrganization]:
    "Theatre Organization",

  [OrganizationType.DanceOrganization]:
    "Dance Organization",

  [OrganizationType.CreativeOrganization]:
    "Creative Organization",

  [OrganizationType.PerformingArtsOrganization]:
    "Performing Arts Organization",


  /* --------------------------------------------------------------------------
   * HEALTH & WELLNESS
   * ------------------------------------------------------------------------ */

  [OrganizationType.HealthOrganization]:
    "Health Organization",

  [OrganizationType.HealthcareOrganization]:
    "Healthcare Organization",

  [OrganizationType.MedicalOrganization]:
    "Medical Organization",

  [OrganizationType.WellnessOrganization]:
    "Wellness Organization",

  [OrganizationType.MentalHealthOrganization]:
    "Mental Health Organization",


  /* --------------------------------------------------------------------------
   * YOUTH & FAMILY
   * ------------------------------------------------------------------------ */

  [OrganizationType.YouthOrganization]:
    "Youth Organization",

  [OrganizationType.FamilyOrganization]:
    "Family Organization",

  [OrganizationType.ChildrensOrganization]:
    "Children's Organization",

  [OrganizationType.ChildrenOrganization]:
    "Children Organization",

  [OrganizationType.ParentOrganization]:
    "Parent Organization",


  /* --------------------------------------------------------------------------
   * CLUBS & ASSOCIATIONS
   * ------------------------------------------------------------------------ */

  [OrganizationType.Club]:
    "Club",

  [OrganizationType.Association]:
    "Association",

  [OrganizationType.Society]:
    "Society",

  [OrganizationType.AlumniOrganization]:
    "Alumni Organization",

  [OrganizationType.AlumniAssociation]:
    "Alumni Association",


  /* --------------------------------------------------------------------------
   * TECHNOLOGY
   * ------------------------------------------------------------------------ */

  [OrganizationType.TechnologyOrganization]:
    "Technology Organization",

  [OrganizationType.TechnologyGroup]:
    "Technology Group",

  [OrganizationType.DeveloperOrganization]:
    "Developer Organization",

  [OrganizationType.SoftwareOrganization]:
    "Software Organization",

  [OrganizationType.InnovationOrganization]:
    "Innovation Organization",

  [OrganizationType.StartupOrganization]:
    "Startup Organization",


  /* --------------------------------------------------------------------------
   * ENVIRONMENT
   * ------------------------------------------------------------------------ */

  [OrganizationType.EnvironmentalOrganization]:
    "Environmental Organization",

  [OrganizationType.EnvironmentOrganization]:
    "Environment Organization",

  [OrganizationType.ConservationOrganization]:
    "Conservation Organization",

  [OrganizationType.ClimateOrganization]:
    "Climate Organization",


  /* --------------------------------------------------------------------------
   * OTHER
   * ------------------------------------------------------------------------ */

  [OrganizationType.Other]:
    "Other",
};


export enum OrganizationStatus {
  Active = "active",
  Pending = "pending",
  Suspended = "suspended",
  Archived = "archived",
}

export enum LeadershipRole {
  Owner = "owner",
  Administrator = "administrator",
  PastorDirector = "pastor_director",
  Leader = "leader",
  Staff = "staff",
}

export interface LeadershipMember {
  id: string;

  organizationId: string;

  user: UserRef;

  role: LeadershipRole;

  title?: string;

  bio?: string;

  order?: number;
}

export interface Branch {
  id: string;

  organizationId: string;

  name: string;

  isMainLocation: boolean;

  address?: Address;

  contact?: ContactInfo;

  serviceTimes?: string[];

  timezone?: string;

  photoUrl?: string | null;
}

export interface OrganizationProfile {
  name: string;

  organizationType: OrganizationType;

  /**
   * Permanent Fockis organization namespace.
   *
   * Example:
   *
   *   springfieldchurch.fockis.com
   */
  domain: string;

  logoUrl?: string | null;

  bannerUrl?: string | null;

  description?: string;

  website?: string;

  contact?: ContactInfo;
}

export interface OrganizationCounts {
  members: number;

  departments: number;

  groups: number;

  branches: number;

  upcomingEvents: number;
}

export interface Organization
  extends OrganizationProfile {
  id: string;

  slug: string;

  status: OrganizationStatus;

  leadership: LeadershipMember[];

  branches: Branch[];

  counts?: OrganizationCounts;

  currentUserMembershipStatus?:
    MembershipStatus | null;

  currentUserRole?:
    MemberRole | null;

  createdAt: ISODateString;

  updatedAt: ISODateString;
}

export interface OrganizationSummary {
  id: string;

  slug: string;

  name: string;

  organizationType: OrganizationType;

  /**
   * Permanent Fockis organization namespace.
   */
  domain: string;

  logoUrl?: string | null;

  description?: string;

  status: OrganizationStatus;

  mainLocation?: Pick<
    Address,
    "city" | "state" | "country"
  >;

  memberCount?: number;

  currentUserMembershipStatus?:
    MembershipStatus | null;
}

export interface CreateOrganizationInput
  extends OrganizationProfile {
  /**
   * Required during organization creation.
   *
   * Example:
   *
   *   springfieldchurch.fockis.com
   */
  domain: string;

  branches?: Array<
    Omit<Branch, "id" | "organizationId">
  >;
}

export type UpdateOrganizationInput =
  Partial<
    Omit<
      CreateOrganizationInput,
      "domain"
    >
  >;


/* ============================================================================
 * Departments
 * ========================================================================== */

export enum DepartmentType {
  Men = "men",

  Women = "women",

  Youth = "youth",

  Children = "children",

  MusicChoir = "music_choir",

  Prayer = "prayer",

  Custom = "custom",
}

export const DEPARTMENT_TYPE_LABELS: Record<
  DepartmentType,
  string
> = {
  [DepartmentType.Men]:
    "Men",

  [DepartmentType.Women]:
    "Women",

  [DepartmentType.Youth]:
    "Youth",

  [DepartmentType.Children]:
    "Children",

  [DepartmentType.MusicChoir]:
    "Music / Choir",

  [DepartmentType.Prayer]:
    "Prayer",

  [DepartmentType.Custom]:
    "Custom",
};


/**
 * Organization department.
 *
 * IMPORTANT:
 *
 * `createdByUserId` identifies the original creator independently from
 * organization membership.
 *
 * This means:
 *
 *   - The creator can later leave the organization.
 *   - The department still remembers who created it.
 *   - Archiving does not erase the creator.
 *   - Restoring does not create a new department.
 *
 * `isArchived`, `archivedAt`, and `archivedByUserId` implement the
 * soft-archive lifecycle.
 *
 * The backend is responsible for enforcing who can archive, restore,
 * edit, join, or view departments.
 */
export interface Department {
  id: string;

  organizationId: string;

  createdByUserId?: string | null;

  createdBy?: UserRef | null;

  branchId?: string | null;

  name: string;

  departmentType: DepartmentType;

  description?: string;

  photoUrl?: string | null;

  leaderIds: string[];

  leaders?: UserRef[];

  memberCount: number;

  isCurrentUserMember?: boolean;

  isArchived: boolean;

  archivedAt?: ISODateString | null;

  archivedByUserId?: string | null;

  archivedBy?: UserRef | null;

  createdAt: ISODateString;

  updatedAt: ISODateString;
}

export type CreateDepartmentInput =
  Pick<
    Department,
    "organizationId" |
    "name" |
    "departmentType"
  > &
  Partial<
    Pick<
      Department,
      "branchId" |
      "description" |
      "photoUrl" |
      "leaderIds"
    >
  >;

export type UpdateDepartmentInput =
  Partial<
    Omit<
      CreateDepartmentInput,
      "organizationId"
    >
  >;

export interface ListDepartmentsQuery
  extends PageQuery {
  departmentType?: DepartmentType;

  branchId?: string;

  archived?: boolean;
}

export interface DepartmentArchiveResult {
  department: Department;

  action:
    | "archived"
    | "restored";
}


/* ============================================================================
 * Groups
 * ========================================================================== */

export enum GroupType {
  BibleStudy = "bible_study",

  SmallGroup = "small_group",

  PrayerGroup = "prayer_group",

  Custom = "custom",
}

export const GROUP_TYPE_LABELS: Record<
  GroupType,
  string
> = {
  [GroupType.BibleStudy]:
    "Bible Study",

  [GroupType.SmallGroup]:
    "Small Group",

  [GroupType.PrayerGroup]:
    "Prayer Group",

  [GroupType.Custom]:
    "Custom Group",
};

export interface ChurchGroup {
  id: string;

  organizationId: string;

  departmentId?: string | null;

  name: string;

  groupType: GroupType;

  description?: string;

  photoUrl?: string | null;

  leaderIds: string[];

  leaders?: UserRef[];

  meetingSchedule?: string;

  location?: string;

  capacity?: number | null;

  memberCount: number;

  isCurrentUserMember?: boolean;

  createdAt: ISODateString;

  updatedAt: ISODateString;
}

export type CreateGroupInput =
  Pick<
    ChurchGroup,
    "organizationId" |
    "name" |
    "groupType"
  > &
  Partial<
    Pick<
      ChurchGroup,
      "departmentId" |
      "description" |
      "photoUrl" |
      "leaderIds" |
      "meetingSchedule" |
      "location" |
      "capacity"
    >
  >;

export type UpdateGroupInput =
  Partial<
    Omit<
      CreateGroupInput,
      "organizationId"
    >
  >;


/* ============================================================================
 * Members
 * ========================================================================== */

export enum MembershipStatus {
  Pending = "pending",

  Active = "active",

  Inactive = "inactive",

  Archived = "archived",
}

export const MEMBERSHIP_STATUS_LABELS: Record<
  MembershipStatus,
  string
> = {
  [MembershipStatus.Pending]:
    "Pending",

  [MembershipStatus.Active]:
    "Active",

  [MembershipStatus.Inactive]:
    "Inactive",

  [MembershipStatus.Archived]:
    "Archived",
};

export enum MemberRole {
  Administrator = "administrator",

  PastorDirector =
    "pastor_director",

  Leader = "leader",

  DepartmentManager =
    "department_manager",

  GroupLeader =
    "group_leader",

  Member = "member",

  Guest = "guest",
}

export const MEMBER_ROLE_LABELS: Record<
  MemberRole,
  string
> = {
  [MemberRole.Administrator]:
    "Administrator",

  [MemberRole.PastorDirector]:
    "Pastor / Director",

  [MemberRole.Leader]:
    "Leader",

  [MemberRole.DepartmentManager]:
    "Department Manager",

  [MemberRole.GroupLeader]:
    "Group Leader",

  [MemberRole.Member]:
    "Member",

  [MemberRole.Guest]:
    "Guest",
};


/* ============================================================================
 * Member Public Profile
 * ========================================================================== */

export interface MemberPublicProfile {
  displayName: string;

  avatarUrl?: string | null;

  role: MemberRole;

  email?: string | null;

  phone?: string | null;

  departmentNames?: string[];

  groupNames?: string[];
}


/* ============================================================================
 * Member Private Profile
 * ========================================================================== */

export interface MemberPrivateProfile {
  email?: string | null;

  phone?: string | null;

  address?: Address;

  dateOfBirth?: string;

  joinedAt?: ISODateString;

  notes?: string;
}


/* ============================================================================
 * MEMBER MILESTONES
 * ========================================================================== */

export enum MemberMilestoneType {
  JoinedOrganization =
    "joined_organization",

  Baptism =
    "baptism",

  ChildDedication =
    "child_dedication",

  Marriage =
    "marriage",

  Ordination =
    "ordination",

  RoleChange =
    "role_change",

  DepartmentJoined =
    "department_joined",

  DepartmentLeft =
    "department_left",

  GroupJoined =
    "group_joined",

  GroupLeft =
    "group_left",

  MembershipStatusChange =
    "membership_status_change",

  AttendanceMilestone =
    "attendance_milestone",

  VolunteerMilestone =
    "volunteer_milestone",

  TrainingCompleted =
    "training_completed",

  Certification =
    "certification",

  Appointment =
    "appointment",

  Custom =
    "custom",
};

export const MEMBER_MILESTONE_TYPE_LABELS: Record<
  MemberMilestoneType,
  string
> = {
  [MemberMilestoneType.JoinedOrganization]:
    "Joined Organization",

  [MemberMilestoneType.Baptism]:
    "Baptism",

  [MemberMilestoneType.ChildDedication]:
    "Child Dedication",

  [MemberMilestoneType.Marriage]:
    "Marriage",

  [MemberMilestoneType.Ordination]:
    "Ordination",

  [MemberMilestoneType.RoleChange]:
    "Role Change",

  [MemberMilestoneType.DepartmentJoined]:
    "Department Joined",

  [MemberMilestoneType.DepartmentLeft]:
    "Department Left",

  [MemberMilestoneType.GroupJoined]:
    "Group Joined",

  [MemberMilestoneType.GroupLeft]:
    "Group Left",

  [MemberMilestoneType.MembershipStatusChange]:
    "Membership Status Change",

  [MemberMilestoneType.AttendanceMilestone]:
    "Attendance Milestone",

  [MemberMilestoneType.VolunteerMilestone]:
    "Volunteer Milestone",

  [MemberMilestoneType.TrainingCompleted]:
    "Training Completed",

  [MemberMilestoneType.Certification]:
    "Certification",

  [MemberMilestoneType.Appointment]:
    "Appointment",

  [MemberMilestoneType.Custom]:
    "Custom",
};

export interface MemberMilestone {
  id: string;

  organizationId: string;

  memberId: string;

  type: MemberMilestoneType;

  title: string;

  description?: string | null;

  eventDate: ISODateString;

  createdAt: ISODateString;

  recordedBy?: UserRef | null;

  branchId?: string | null;

  departmentId?: string | null;

  groupId?: string | null;

  metadata?: Record<string, unknown>;

  visibleToMember: boolean;
}

export interface CreateMemberMilestoneInput {
  organizationId: string;

  memberId: string;

  type: MemberMilestoneType;

  title: string;

  description?: string;

  eventDate: ISODateString;

  branchId?: string;

  departmentId?: string;

  groupId?: string;

  metadata?: Record<string, unknown>;

  visibleToMember?: boolean;
}

export type UpdateMemberMilestoneInput =
  Partial<
    Omit<
      CreateMemberMilestoneInput,
      "organizationId" |
      "memberId"
    >
  >;

export interface MemberTimeline {
  memberId: string;

  organizationId: string;

  items: MemberMilestone[];

  total: number;
}


/* ============================================================================
 * MEMBER CURRENT STATUS / SUMMARY
 * ========================================================================== */

export interface MemberMilestoneSummary {
  baptismDate?: ISODateString | null;

  organizationJoinedAt?: ISODateString | null;

  latestMilestone?: MemberMilestone | null;

  milestoneCount?: number;
}


/* ============================================================================
 * MEMBER
 * ========================================================================== */

export interface Member {
  id: string;

  memberId?: string;

  organizationId: string;

  userId: string;

  /**
   * Fockis member namespace.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   */
  domain?: string | null;

  branchId?: string | null;

  status: MembershipStatus;

  role: MemberRole;

  profile: MemberPublicProfile;

  privateProfile?: MemberPrivateProfile;

  milestones?: MemberMilestone[];

  milestoneSummary?: MemberMilestoneSummary;

  canViewPrivateProfile?: boolean;

  isOwner?: boolean;

  isSelf?: boolean;

  isCurrentUser?: boolean;

  isAdmin?: boolean;

  canApproveMembers?: boolean;

  departmentIds?: string[];

  groupIds?: string[];

  joinedAt?: ISODateString | null;

  permissions?: string[];

  createdAt: ISODateString;

  updatedAt: ISODateString;
}

export interface MyMembership
  extends Member {
  isOwner: boolean;
}


/* ============================================================================
 * MEMBER INPUTS
 * ========================================================================== */

export interface AddMemberInput {
  organizationId: string;

  userId?: string;

  email?: string;

  /**
   * Optional at the transport layer so existing callers can continue to
   * compile, but the backend should require and validate it when creating
   * the actual membership.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   */
  domain?: string;

  branchId?: string;

  role?: MemberRole;
}

export type UpdateMemberInput =
  Partial<{
    branchId: string | null;

    profile: Partial<MemberPublicProfile>;

    privateProfile: Partial<MemberPrivateProfile>;

    status: MembershipStatus;

    role: MemberRole;
  }>;


/* ============================================================================
 * MEMBERSHIP REQUEST
 * ========================================================================== */

export interface MembershipRequestInput {
  organizationId: string;

  userId?: string;

  email?: string;

  /**
   * Requested Fockis member namespace.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   */
  domain?: string;

  message?: string;

  branchId?: string;
}

export interface MembershipRequest {
  id: string;

  organizationId: string;

  userId: string;

  /**
   * Fockis member namespace assigned to the applicant.
   */
  domain?: string | null;

  memberId?: string | null;

  applicant: UserRef;

  status: MembershipStatus;

  message?: string;

  requestedAt: ISODateString;

  reviewedAt?: ISODateString | null;

  reviewedBy?: UserRef | null;

  rejectionReason?: string | null;
}


/* ============================================================================
 * Events
 * ========================================================================== */

export enum EventType {
  ChurchService = "church_service",

  DepartmentEvent = "department_event",

  Meeting = "meeting",

  BibleStudy = "bible_study",

  SpecialEvent = "special_event",
}

export const EVENT_TYPE_LABELS: Record<
  EventType,
  string
> = {
  [EventType.ChurchService]:
    "Church Service",

  [EventType.DepartmentEvent]:
    "Department Event",

  [EventType.Meeting]:
    "Meeting",

  [EventType.BibleStudy]:
    "Bible Study",

  [EventType.SpecialEvent]:
    "Special Event",
};

export enum RsvpStatus {
  Going = "going",

  Interested = "interested",

  NotGoing = "not_going",

  NoResponse = "no_response",
}

export interface ChurchEvent {
  id: string;

  organizationId: string;

  branchId?: string | null;

  departmentId?: string | null;

  groupId?: string | null;

  title: string;

  description?: string;

  eventType: EventType;

  startsAt: ISODateString;

  endsAt?: ISODateString;

  location?: string;

  isOnline?: boolean;

  onlineUrl?: string | null;

  coverImageUrl?: string | null;

  organizer?: UserRef;

  capacity?: number | null;

  rsvpCount: number;

  currentUserRsvp: RsvpStatus;

  requiresRsvp: boolean;

  createdAt: ISODateString;

  updatedAt: ISODateString;
}

export type CreateEventInput =
  Pick<
    ChurchEvent,
    "organizationId" |
    "title" |
    "eventType" |
    "startsAt"
  > &
  Partial<
    Pick<
      ChurchEvent,
      "branchId" |
      "departmentId" |
      "groupId" |
      "description" |
      "endsAt" |
      "location" |
      "isOnline" |
      "onlineUrl" |
      "coverImageUrl" |
      "capacity" |
      "requiresRsvp"
    >
  >;

export type UpdateEventInput =
  Partial<
    Omit<
      CreateEventInput,
      "organizationId"
    >
  >;


/* ============================================================================
 * Attendance
 * ========================================================================== */

export enum AttendanceType {
  InPerson = "in_person",

  Online = "online",
}

export const ATTENDANCE_TYPE_LABELS: Record<
  AttendanceType,
  string
> = {
  [AttendanceType.InPerson]:
    "In Person",

  [AttendanceType.Online]:
    "Online",
};

export enum AbsenceReasonCategory {
  Illness = "illness",

  Travel = "travel",

  Family = "family",

  Work = "work",

  Other = "other",
}

export interface AttendanceRecord {
  id: string;

  organizationId: string;

  eventId: string;

  eventTitle: string;

  memberId: string;

  attendanceType: AttendanceType;

  checkedInAt: ISODateString;

  recordedBy?: UserRef;
}

export interface AbsenceReport {
  id: string;

  organizationId: string;

  eventId: string;

  memberId: string;

  reasonCategory: AbsenceReasonCategory;

  note?: string;

  submittedAt: ISODateString;
}

export interface AttendanceSummary {
  eventId: string;

  eventTitle: string;

  startsAt: ISODateString;

  inPersonCount: number;

  onlineCount: number;

  absenceCount: number;

  totalExpected?: number;
}

export interface RecordAttendanceInput {
  organizationId: string;

  eventId: string;

  memberId: string;

  attendanceType: AttendanceType;
}

export interface SubmitAbsenceReportInput {
  organizationId: string;

  eventId: string;

  reasonCategory: AbsenceReasonCategory;

  note?: string;
}


/* ============================================================================
 * Communication
 * ========================================================================== */

export enum AnnouncementAudience {
  Everyone = "everyone",

  Members = "members",

  Department = "department",

  Group = "group",

  Leadership = "leadership",
}

export interface Announcement {
  id: string;

  organizationId: string;

  title: string;

  body: string;

  audience: AnnouncementAudience;

  departmentId?: string | null;

  groupId?: string | null;

  author: UserRef;

  pinned?: boolean;

  publishedAt: ISODateString;
}

export interface ChurchMessage {
  id: string;

  organizationId: string;

  threadId: string;

  sender: UserRef;

  body: string;

  sentAt: ISODateString;

  readAt?: ISODateString | null;
}

export interface DepartmentMessage
  extends ChurchMessage {
  departmentId: string;
}

export type ChurchNotificationCategory =
  | "event"
  | "announcement"
  | "message"
  | "attendance"
  | "membership"
  | "member_update"
  | "system";

export interface ChurchNotification {
  id: string;

  organizationId?: string;

  title: string;

  body: string;

  category: ChurchNotificationCategory;

  linkPath?: string;

  isRead: boolean;

  createdAt: ISODateString;
}


/* ============================================================================
 * Media
 * ========================================================================== */

export enum ChurchMediaType {
  Sermon = "sermon",

  Video = "video",

  Photo = "photo",

  Document = "document",

  Resource = "resource",
}

export const CHURCH_MEDIA_TYPE_LABELS: Record<
  ChurchMediaType,
  string
> = {
  [ChurchMediaType.Sermon]:
    "Sermons",

  [ChurchMediaType.Video]:
    "Videos",

  [ChurchMediaType.Photo]:
    "Photos",

  [ChurchMediaType.Document]:
    "Documents",

  [ChurchMediaType.Resource]:
    "Resources",
};

export interface ChurchMedia {
  id: string;

  organizationId: string;

  mediaType: ChurchMediaType;

  title: string;

  description?: string;

  thumbnailUrl?: string | null;

  fileUrl: string;

  durationSeconds?: number | null;

  speaker?: string;

  publishedAt: ISODateString;

  tags?: string[];
}


/* ============================================================================
 * Livestream
 * ========================================================================== */

export enum LiveEventVisibility {
  Public = "public",

  Members = "members",

  Private = "private",
}

export enum LiveEventState {
  Scheduled = "scheduled",

  Live = "live",

  Ended = "ended",
}

export interface ChurchLivestream {
  id: string;

  organizationId: string;

  /**
   * Existing Fockis Meetings session.
   */
  meetingId: string;

  branchId?: string | null;

  title: string;

  description?: string;

  isOnline?: boolean;

  location?: string | null;

  visibility: LiveEventVisibility;

  state: LiveEventState;

  scheduledStart: ISODateString;

  actualStart?: ISODateString | null;

  endedAt?: ISODateString | null;

  streamUrl?: string | null;

  playbackUrl?: string | null;

  posterUrl?: string | null;

  viewerCount?: number;

  currentUserHasAccess: boolean;

  invitedGuestEmails?: string[];

  service?: string;

  campus?: string;

  speaker?: string;

  chatEnabled?: boolean;

  prayerRequestsEnabled?: boolean;

  published?: boolean;

  createdAt?: ISODateString;

  updatedAt?: ISODateString;
}

export type LiveEvent =
  ChurchLivestream;

export interface CreateChurchLivestreamInput {
  organizationId: string;

  meetingId: string;

  branchId?: string;

  title: string;

  description?: string;

  isOnline?: boolean;

  location?: string;

  visibility?: LiveEventVisibility;

  scheduledStart: ISODateString;

  service?: string;

  campus?: string;

  speaker?: string;

  chatEnabled?: boolean;

  prayerRequestsEnabled?: boolean;

  published?: boolean;
}

export type UpdateChurchLivestreamInput =
  Partial<
    Omit<
      CreateChurchLivestreamInput,
      "organizationId" |
      "meetingId"
    >
  >;

export type CreateLiveEventInput =
  CreateChurchLivestreamInput;

export type UpdateLiveEventInput =
  UpdateChurchLivestreamInput;

export interface ChurchLivestreamListQuery
  extends PageQuery {
  organizationId?: string;

  state?: LiveEventState;

  visibility?: LiveEventVisibility;

  branchId?: string;
}

export interface ChurchLivestreamListResult
  extends PaginatedResult<ChurchLivestream> {}


/* ============================================================================
 * Authorization
 * ========================================================================== */

/**
 * Frontend authorization summary.
 *
 * These flags are for UI decisions only.
 * The backend remains the authoritative authorization layer.
 */
export interface ChurchPermissions {
  canManageOrganization: boolean;

  canManageLeadership: boolean;

  canManageBranches: boolean;

  canManageDepartments: boolean;

  canManageGroups: boolean;

  canManageMembers: boolean;

  canManageMemberMilestones?: boolean;

  canEditMemberMilestones?: boolean;

  canDeleteMemberMilestones?: boolean;

  canViewMemberTimeline?: boolean;

  canViewOrganization: boolean;

  canManageEvents: boolean;

  canManageLive: boolean;

  canRecordAttendance: boolean;

  canManageCommunication: boolean;

  canManageMedia: boolean;

  canViewMemberDirectory: boolean;

  canViewPrivateMemberInfo: boolean;

  canApproveMembershipRequests?: boolean;

  canRejectMembershipRequests?: boolean;
}