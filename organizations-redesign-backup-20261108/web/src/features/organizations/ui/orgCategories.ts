/**
 * orgCategories.ts
 * Groups the ~100 organization types into a few categories for filters,
 * wording and icons. Shared by every organization page.
 */

import { ORGANIZATION_TYPE_LABELS, OrganizationType } from "../types/organization.types";

export type OrganizationCategory =
  | "faith"
  | "education"
  | "civic"
  | "social"
  | "nonprofit"
  | "business"
  | "sports"
  | "arts"
  | "health"
  | "youth"
  | "clubs"
  | "technology"
  | "environment"
  | "other";

export const CATEGORY_LABELS: Record<OrganizationCategory, string> = {
  faith: "Faith & Religion",
  education: "Education",
  civic: "Civic & Political",
  social: "Community & Social",
  nonprofit: "Nonprofit & Charity",
  business: "Business & Professional",
  sports: "Sports & Recreation",
  arts: "Arts & Culture",
  health: "Health & Wellness",
  youth: "Youth & Family",
  clubs: "Clubs & Associations",
  technology: "Technology",
  environment: "Environment",
  other: "Other",
};

export const CATEGORY_ICONS: Record<OrganizationCategory, string> = {
  faith: "⛪",
  education: "🎓",
  civic: "🏛️",
  social: "🤝",
  nonprofit: "💚",
  business: "💼",
  sports: "⚽",
  arts: "🎨",
  health: "🩺",
  youth: "🧒",
  clubs: "🎯",
  technology: "💻",
  environment: "🌱",
  other: "🏢",
};

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as OrganizationCategory[];

export function typeLabel(type?: string | null): string {
  if (!type) return "Organization";
  return (ORGANIZATION_TYPE_LABELS as Record<string, string>)[type] ?? type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Words that change with the kind of organization. */
export function wordingFor(type?: string | null) {
  const category = type ? getCategoryForOrganizationType(type as OrganizationType) : "other";
  return {
    category,
    isFaith: category === "faith",
    isEducation: category === "education",
    visitTitle: category === "faith" ? "Plan your visit" : category === "education" ? "Book a visit" : "Plan a visit",
    visitBlurb:
      category === "faith"
        ? "New here? Let them know when you're coming and they'll welcome you."
        : category === "education"
          ? "Visit the campus, meet the staff and ask your questions."
          : "Tell them when you'd like to come by and they'll confirm.",
  };
}

const ORGANIZATION_TYPE_CATEGORY_NAMES: Partial<
  Record<string, OrganizationCategory>
> = {
  /* Faith */
  church: "faith",
  christian_church: "faith",
  christian_ministry: "faith",
  christian_fellowship: "faith",
  mission: "faith",
  prayer_organization: "faith",
  christian_network: "faith",
  christian_nonprofit: "faith",
  bible_study_organization: "faith",
  mosque: "faith",
  islamic_organization: "faith",
  synagogue: "faith",
  jewish_organization: "faith",
  temple: "faith",
  religious_organization: "faith",
  religious_institution: "faith",
  faith_organization: "faith",

  /* Education */
  school: "education",
  elementary_school: "education",
  middle_school: "education",
  high_school: "education",
  private_school: "education",
  public_school: "education",
  charter_school: "education",
  college: "education",
  university: "education",
  community_college: "education",
  vocational_school: "education",
  technical_school: "education",
  trade_school: "education",
  academy: "education",
  training_institute: "education",
  training_organization: "education",
  educational_organization: "education",
  educational_institution: "education",
  student_organization: "education",
  education_organization: "education",
  institute: "education",

  /* Civic */
  government: "civic",
  government_organization: "civic",
  civic_organization: "civic",
  civic_group: "civic",
  political_organization: "civic",
  political_party: "civic",
  advocacy_organization: "civic",
  public_service: "civic",
  public_affairs_organization: "civic",
  public_affairs: "civic",
  community_action_organization: "civic",

  /* Community */
  community: "social",
  community_organization: "social",
  social_organization: "social",
  neighborhood: "social",
  community_group: "social",
  support_group: "social",

  /* Nonprofit */
  nonprofit: "nonprofit",
  non_profit: "nonprofit",
  nonprofit_organization: "nonprofit",
  charity: "nonprofit",
  foundation: "nonprofit",
  humanitarian: "nonprofit",
  humanitarian_organization: "nonprofit",
  relief_organization: "nonprofit",
  volunteer_organization: "nonprofit",

  /* Business */
  business: "business",
  company: "business",
  corporation: "business",
  startup: "business",
  startup_organization: "business",
  professional_organization: "business",
  professional_association: "business",
  trade_association: "business",
  industry_association: "business",
  business_association: "business",
  commerce: "business",
  cooperative: "business",

  /* Sports */
  sports: "sports",
  sport: "sports",
  athletic: "sports",
  athletics: "sports",
  recreation: "sports",
  sports_club: "sports",
  sports_organization: "sports",
  sports_team: "sports",
  sports_league: "sports",
  athletic_team: "sports",
  athletic_organization: "sports",
  recreation_organization: "sports",
  fitness_organization: "sports",

  /* Arts */
  arts: "arts",
  art: "arts",
  culture: "arts",
  cultural_organization: "arts",
  museum: "arts",
  gallery: "arts",
  theater: "arts",
  theatre: "arts",
  dance: "arts",
  music: "arts",
  music_organization: "arts",
  creative_organization: "arts",
  arts_organization: "arts",
  theater_organization: "arts",
  performing_arts_organization: "arts",

  /* Health */
  health: "health",
  healthcare: "health",
  medical: "health",
  wellness: "health",
  clinic: "health",
  health_organization: "health",
  healthcare_organization: "health",
  medical_organization: "health",
  wellness_organization: "health",
  mental_health_organization: "health",

  /* Youth */
  youth: "youth",
  youth_organization: "youth",
  family: "youth",
  family_organization: "youth",
  parent_organization: "youth",
  children_organization: "youth",
  childrens_organization: "youth",

  /* Clubs */
  club: "clubs",
  association: "clubs",
  society: "clubs",
  alumni: "clubs",
  alumni_organization: "clubs",
  alumni_association: "clubs",
  hobby: "clubs",
  interest_group: "clubs",

  /* Technology */
  technology: "technology",
  tech: "technology",
  developer: "technology",
  developer_organization: "technology",
  innovation: "technology",
  innovation_organization: "technology",
  software: "technology",
  software_organization: "technology",
  technology_organization: "technology",
  technology_group: "technology",

  /* Environment */
  environment: "environment",
  environmental: "environment",
  environmental_organization: "environment",
  conservation: "environment",
  conservation_organization: "environment",
  sustainability: "environment",
  climate: "environment",
  climate_organization: "environment",

  /* Other */
  other: "other",
};

/* ============================================================================
 * CATEGORY HELPER
 * ========================================================================== */

export function getCategoryForOrganizationType(
  type: OrganizationType,
): OrganizationCategory {
  const typeName = String(type).trim().toLowerCase();

  const explicitCategory = ORGANIZATION_TYPE_CATEGORY_NAMES[typeName];

  if (explicitCategory) {
    return explicitCategory;
  }

  const label = String(
    ORGANIZATION_TYPE_LABELS[type] ?? typeName,
  ).toLowerCase();

  if (
    /church|christian|ministry|fellowship|mission|prayer|bible|religious|faith|mosque|islamic|synagogue|jewish|temple/.test(
      label,
    )
  ) {
    return "faith";
  }

  if (
    /school|college|university|academy|education|educational|student|training|institute|vocational|technical|trade/.test(
      label,
    )
  ) {
    return "education";
  }

  if (
    /political|politics|civic|government|advocacy|campaign|public service|public-service|public affairs/.test(
      label,
    )
  ) {
    return "civic";
  }

  if (
    /nonprofit|non-profit|charity|foundation|humanitarian|relief|volunteer/.test(
      label,
    )
  ) {
    return "nonprofit";
  }

  if (
    /business|company|corporation|startup|professional|commerce|cooperative|trade association|industry association/.test(
      label,
    )
  ) {
    return "business";
  }

  if (/sport|athletic|recreation|team|league|fitness/.test(label)) {
    return "sports";
  }

  if (
    /art|culture|museum|gallery|theater|theatre|dance|music|creative|performing/.test(
      label,
    )
  ) {
    return "arts";
  }

  if (/health|healthcare|medical|wellness|clinic|mental health/.test(label)) {
    return "health";
  }

  if (/youth|family|parent|children|childrens/.test(label)) {
    return "youth";
  }

  if (/club|association|society|alumni|hobby|interest group/.test(label)) {
    return "clubs";
  }

  if (/technology|tech|developer|innovation|software/.test(label)) {
    return "technology";
  }

  if (
    /environment|environmental|conservation|sustainability|climate/.test(
      label,
    )
  ) {
    return "environment";
  }

  if (/community|social|neighborhood|support/.test(label)) {
    return "social";
  }

  return "other";
}
