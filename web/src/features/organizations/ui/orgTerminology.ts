/**
 * orgTerminology.ts
 * -----------------------------------------------------------------------------
 * One universal organization model, many kinds of organization.
 *
 *   - PLATFORM_CATEGORIES: the categories people can choose when they create an
 *     organization (Education is deliberately absent: Fockis Academy handles
 *     schools). Older organizations with an education type still work; they
 *     are shown under "Other".
 *   - termsFor(type): the words each kind of organization uses
 *     (Members / Employees / Volunteers / Athletes, Ministries / Departments…).
 *   - modulesFor(type): the specialized modules that make sense for that kind
 *     of organization. Church tools never show for a business, nonprofit tools
 *     never show for a sports club, and so on.
 * -----------------------------------------------------------------------------
 */

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Church,
  Cpu,
  Ellipsis,
  HandHeart,
  HeartPulse,
  Landmark,
  Leaf,
  Palette,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";

import { FamilyIcon } from "./orgIcons";

import { OrganizationType } from "../types/organization.types";
import { getCategoryForOrganizationType, typeLabel, type OrganizationCategory } from "./orgCategories";

export type PlatformCategory = Exclude<OrganizationCategory, "education">;

export interface CategoryInfo {
  id: PlatformCategory;
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
}

/** Order matches the Fockis Organizations artwork. */
export const PLATFORM_CATEGORIES: CategoryInfo[] = [
  { id: "faith", label: "Faith & Religion", short: "Faith", description: "Churches, ministries, mosques, synagogues, temples and fellowships.", icon: Church },
  { id: "business", label: "Business & Professional", short: "Business", description: "Companies, startups, professional and trade associations.", icon: Briefcase },
  { id: "nonprofit", label: "Nonprofit & Charity", short: "Nonprofit", description: "Charities, foundations, relief and volunteer organizations.", icon: HandHeart },
  { id: "sports", label: "Sports & Recreation", short: "Sports", description: "Clubs, teams, leagues and recreation organizations.", icon: Trophy },
  { id: "social", label: "Community & Social", short: "Community", description: "Community groups, neighborhoods and support groups.", icon: UsersRound },
  { id: "civic", label: "Civic & Political", short: "Civic", description: "Civic, political, advocacy and public-affairs organizations.", icon: Landmark },
  { id: "clubs", label: "Clubs & Associations", short: "Clubs", description: "Clubs, societies, alumni and interest groups.", icon: Users },
  { id: "arts", label: "Arts & Culture", short: "Arts", description: "Museums, theaters, music, dance and creative groups.", icon: Palette },
  { id: "health", label: "Health & Wellness", short: "Health", description: "Clinics, wellness and health organizations.", icon: HeartPulse },
  { id: "youth", label: "Youth & Family", short: "Youth", description: "Youth, children, parent and family organizations.", icon: FamilyIcon },
  { id: "technology", label: "Technology", short: "Tech", description: "Developer communities, tech groups and innovation hubs.", icon: Cpu },
  { id: "environment", label: "Environment", short: "Environment", description: "Conservation, climate and sustainability organizations.", icon: Leaf },
  { id: "other", label: "Other", short: "Other", description: "Any other kind of organization.", icon: Ellipsis },
];

const CATEGORY_BY_ID = new Map(PLATFORM_CATEGORIES.map((c) => [c.id, c]));

/** Category of a stored organization type, with Education folded into Other. */
export function platformCategoryOf(type?: string | null): PlatformCategory {
  if (!type) return "other";
  const c = getCategoryForOrganizationType(type as OrganizationType);
  return c === "education" ? "other" : c;
}

export function categoryInfo(type?: string | null): CategoryInfo {
  return CATEGORY_BY_ID.get(platformCategoryOf(type)) ?? PLATFORM_CATEGORIES[PLATFORM_CATEGORIES.length - 1];
}

/** Types offered when creating an organization in a category (no education types). */
export function typesForCategory(category: PlatformCategory): { value: OrganizationType; label: string }[] {
  return (Object.values(OrganizationType) as OrganizationType[])
    .filter((t) => getCategoryForOrganizationType(t) === category)
    .map((t) => ({ value: t, label: typeLabel(t) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/* ============================================================================
 * TERMINOLOGY
 * ========================================================================== */

export interface OrgTerms {
  /** "Members", "Employees", "Volunteers", "Athletes"… */
  people: string;
  person: string;
  /** "Ministries", "Departments", "Committees", "Teams"… */
  departments: string;
  department: string;
  groups: string;
  /** Label of the main gathering ("Services", "Meetings", "Games"…) */
  gatherings: string;
  joinVerb: string;
  myOrg: string;
}

const BASE_TERMS: OrgTerms = {
  people: "Members",
  person: "Member",
  departments: "Departments",
  department: "Department",
  groups: "Groups",
  gatherings: "Events",
  joinVerb: "Join",
  myOrg: "My Organization",
};

const TERMS_BY_CATEGORY: Partial<Record<PlatformCategory, Partial<OrgTerms>>> = {
  faith: { departments: "Ministries", department: "Ministry", groups: "Small Groups", gatherings: "Services", myOrg: "My Church" },
  business: { people: "Employees", person: "Employee", groups: "Teams", myOrg: "My Company" },
  nonprofit: { people: "Volunteers", person: "Volunteer", groups: "Teams", gatherings: "Activities" },
  sports: { people: "Athletes", person: "Athlete", departments: "Divisions", department: "Division", groups: "Teams", gatherings: "Games & Practices", myOrg: "My Club" },
  clubs: { departments: "Committees", department: "Committee", gatherings: "Meetings", myOrg: "My Club" },
  civic: { departments: "Committees", department: "Committee", gatherings: "Meetings" },
  social: { groups: "Circles", gatherings: "Gatherings" },
  youth: { people: "Participants", person: "Participant", groups: "Groups", gatherings: "Activities" },
  health: { people: "Participants", person: "Participant", groups: "Programs" },
  arts: { groups: "Ensembles & Groups", gatherings: "Performances & Events" },
};

/** Faith types that are not churches get neutral words (no "My Church" for a mosque). */
function faithTypeIsChurch(type?: string | null): boolean {
  return /church|christian|ministry|fellowship|mission|bible|prayer/.test(String(type ?? ""));
}

export function termsFor(type?: string | null): OrgTerms {
  const category = platformCategoryOf(type);
  const extra = TERMS_BY_CATEGORY[category] ?? {};
  const terms = { ...BASE_TERMS, ...extra };
  if (category === "faith" && !faithTypeIsChurch(type)) {
    terms.myOrg = "My Community";
    terms.departments = "Departments";
    terms.department = "Department";
    terms.gatherings = "Gatherings";
  }
  return terms;
}

/* ============================================================================
 * SPECIALIZED MODULES
 *
 * The universal core (members, departments, groups, events, attendance,
 * communication, media, documents, reports, roles, settings, audit) is always
 * available. These are the extra modules per kind of organization. A module
 * listed as `available: false` is planned and shown as "Coming soon" — never
 * as a working button.
 * ========================================================================== */

export interface OrgModule {
  id: string;
  label: string;
  description: string;
  /** Route suffix under /organizations/:id when the module is built. */
  path?: string;
  available: boolean;
}

const MODULES: Partial<Record<PlatformCategory, OrgModule[]>> = {
  faith: [
    { id: "ministries", label: "Ministries", description: "Ministries with leaders and members.", path: "/admin/departments", available: true },
    { id: "services", label: "Services & Live", description: "Weekly services and livestreams.", path: "/admin/live", available: true },
    { id: "visits", label: "First-time visitors", description: "Plan-a-visit requests and follow-up.", path: "/admin/visits", available: true },
    { id: "donations", label: "Giving", description: "Online giving and contribution statements.", available: false },
  ],
  nonprofit: [
    { id: "volunteers", label: "Volunteers", description: "Volunteer records and teams.", path: "/admin/members", available: true },
    { id: "projects", label: "Projects", description: "Programs and projects through departments.", path: "/admin/departments", available: true },
    { id: "donors", label: "Donors", description: "Donor records and acknowledgements.", available: false },
    { id: "fundraising", label: "Fundraising", description: "Campaigns and goals.", available: false },
  ],
  business: [
    { id: "employees", label: "Employees", description: "Employee directory and roles.", path: "/admin/members", available: true },
    { id: "teams", label: "Internal teams", description: "Teams and departments.", path: "/admin/departments", available: true },
    { id: "hr", label: "HR", description: "Onboarding and HR documents.", available: false },
    { id: "projects", label: "Projects", description: "Project tracking.", available: false },
  ],
  sports: [
    { id: "athletes", label: "Athletes", description: "Athlete roster.", path: "/admin/members", available: true },
    { id: "teams", label: "Teams", description: "Teams and squads.", path: "/admin/groups", available: true },
    { id: "coaches", label: "Coaches", description: "Coaches through leadership roles.", path: "/admin/members", available: true },
    { id: "competitions", label: "Competitions", description: "Fixtures and results.", available: false },
  ],
  clubs: [
    { id: "committees", label: "Committees", description: "Committees and their chairs.", path: "/admin/departments", available: true },
    { id: "meetings", label: "Meetings", description: "Meetings and attendance.", path: "/admin/events", available: true },
    { id: "dues", label: "Dues", description: "Membership dues.", available: false },
  ],
  civic: [
    { id: "committees", label: "Committees", description: "Committees and working groups.", path: "/admin/departments", available: true },
    { id: "meetings", label: "Meetings", description: "Public and member meetings.", path: "/admin/events", available: true },
  ],
};

export function modulesFor(type?: string | null): OrgModule[] {
  return MODULES[platformCategoryOf(type)] ?? [];
}

/** True for kinds of organization that welcome walk-in visitors (shows "Plan a visit"). */
export function welcomesVisitors(type?: string | null): boolean {
  const c = platformCategoryOf(type);
  return c === "faith" || c === "social" || c === "youth" || c === "clubs" || c === "arts" || c === "health";
}
