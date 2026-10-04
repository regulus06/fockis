// ============================================================================
// AGENCY DEMO DATA — businesses, teams, tasks, approvals, settings.
// Used only in mock mode. A real backend replaces all of this.
// ============================================================================

import type {
  AgencyActivity,
  AgencySettings,
  AgencyTask,
  Approval,
  Business,
  BusinessHours,
  BusinessProfile,
  BusinessType,
  MarketingGoal,
  MarketingViewer,
  ServiceKey,
  ServiceStatus,
  TeamMember,
} from "../types/platform.types";
import { daysAgo, daysAhead } from "./demoTime";

export const FOCKIS_BUSINESS_ID = "biz_fockis";

const ALL_SERVICES: ServiceKey[] = [
  "email_marketing", "social_media", "sms_marketing", "advertising", "lead_generation", "marketing_automation",
  "customer_retention", "content_creation", "landing_pages", "analytics_reporting", "ecommerce_marketing",
  "local_marketing", "campaign_management", "promotions",
];

export function servicesRecord(active: ServiceKey[] = [], paused: ServiceKey[] = []): Record<ServiceKey, ServiceStatus> {
  return Object.fromEntries(
    ALL_SERVICES.map((s) => [s, active.includes(s) ? "active" : paused.includes(s) ? "paused" : "not_included"]),
  ) as Record<ServiceKey, ServiceStatus>;
}

export function defaultHours(open = "09:00", close = "18:00", closedDays: BusinessHours["day"][] = ["Sun"]): BusinessHours[] {
  const days: BusinessHours["day"][] = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return days.map((day) => ({ day, open, close, closed: closedDays.includes(day) }));
}

interface Seed {
  id: string;
  name: string;
  type: BusinessType;
  accent: string;
  sizeHint: number;
  planId: string;
  status?: Business["status"];
  domain: string;
  city: string;
  description: string;
  goals: MarketingGoal[];
  active: ServiceKey[];
  paused?: ServiceKey[];
  createdDaysAgo: number;
  hours?: BusinessHours[];
}

const SEEDS: Seed[] = [
  { id: FOCKIS_BUSINESS_ID, name: "Fockis", type: "other", accent: "#1f5eff", sizeHint: 48210, planId: "plan_agency", domain: "fockis.com", city: "Columbus, OH", description: "The Fockis social-commerce platform's own marketing workspace.", goals: ["more_customers", "repeat_customers", "grow_social"], active: ALL_SERVICES, createdDaysAgo: 420 },
  { id: "biz_abc", name: "ABC Barber Shop", type: "barbershop", accent: "#0f766e", sizeHint: 2480, planId: "plan_growth", domain: "abcbarber.com", city: "Columbus, OH", description: "Classic cuts, fades, and hot-towel shaves since 2011.", goals: ["increase_appointments", "repeat_customers"], active: ["email_marketing", "sms_marketing", "marketing_automation", "customer_retention", "analytics_reporting"], paused: ["social_media"], createdDaysAgo: 210, hours: defaultHours("08:00", "19:00", ["Mon"]) },
  { id: "biz_joes", name: "Joe's Restaurant", type: "restaurant", accent: "#c2410c", sizeHint: 3900, planId: "plan_starter", domain: "joesrestaurant.com", city: "Dublin, OH", description: "Family-owned diner serving breakfast and comfort food all day.", goals: ["more_customers", "promote_events", "repeat_customers"], active: ["email_marketing", "social_media", "promotions"], createdDaysAgo: 160, hours: defaultHours("07:00", "21:00", []) },
  { id: "biz_smith", name: "Smith Realty", type: "real_estate", accent: "#1e3a8a", sizeHint: 6100, planId: "plan_professional", domain: "smithrealty.com", city: "Westerville, OH", description: "Residential real estate team helping families buy and sell in central Ohio.", goals: ["generate_leads", "promote_services"], active: ["email_marketing", "lead_generation", "landing_pages", "marketing_automation", "analytics_reporting", "campaign_management"], createdDaysAgo: 300 },
  { id: "biz_xyz", name: "XYZ Construction", type: "construction", accent: "#a16207", sizeHint: 1200, planId: "plan_starter", status: "onboarding", domain: "xyzconstruction.com", city: "Grove City, OH", description: "Residential remodeling, decks, and additions.", goals: ["generate_leads", "promote_services"], active: ["email_marketing", "landing_pages"], createdDaysAgo: 6 },
  { id: "biz_bloom", name: "Bloom Salon", type: "salon", accent: "#be185d", sizeHint: 1850, planId: "plan_growth", domain: "bloomsalon.com", city: "Upper Arlington, OH", description: "Color, cuts, and bridal styling in a relaxed studio.", goals: ["increase_appointments", "grow_social"], active: ["email_marketing", "sms_marketing", "social_media", "content_creation"], createdDaysAgo: 140, hours: defaultHours("10:00", "19:00", ["Sun", "Mon"]) },
  { id: "biz_peak", name: "Peak Fitness", type: "gym_fitness", accent: "#4338ca", sizeHint: 4300, planId: "plan_custom_peak", domain: "peakfitness.com", city: "Hilliard, OH", description: "24/7 gym with group classes and personal training.", goals: ["improve_retention", "more_customers"], active: ["email_marketing", "sms_marketing", "marketing_automation", "customer_retention", "advertising", "analytics_reporting"], createdDaysAgo: 260, hours: defaultHours("00:00", "23:59", []) },
  { id: "biz_grace", name: "Grace Community Church", type: "church_organization", accent: "#7c3aed", sizeHint: 2600, planId: "plan_promo_nonprofit", domain: "gracecommunity.org", city: "Columbus, OH", description: "A welcoming congregation with weekly services and youth programs.", goals: ["promote_events", "improve_retention"], active: ["email_marketing", "social_media"], createdDaysAgo: 95, hours: defaultHours("09:00", "17:00", ["Sat"]) },
];

function profileFor(s: Seed): BusinessProfile {
  const sender = s.id === FOCKIS_BUSINESS_ID ? "hello" : "news";
  return {
    description: s.description,
    website: `https://${s.domain}`,
    phone: "+1 (614) 555-0" + String(100 + SEEDS.indexOf(s) * 37).slice(-3),
    email: `hello@${s.domain}`,
    address: `${120 + SEEDS.indexOf(s) * 41} Main St, ${s.city}`,
    serviceArea: s.city.split(",")[0] + " and nearby",
    hours: s.hours ?? defaultHours(),
    timezone: "America/New_York",
    currency: "USD",
    brandColors: [s.accent, "#14213d"],
    brandFonts: ["Inter"],
    social: { website: `https://${s.domain}`, instagram: `@${s.domain.split(".")[0]}`, fockis: `fockis.com/b/${s.domain.split(".")[0]}` },
    goals: s.goals,
    defaultSenderName: s.name,
    defaultSenderEmail: `${sender}@${s.domain}`,
    replyToEmail: `hello@${s.domain}`,
  };
}

export const mockBusinesses: Business[] = SEEDS.map((s) => ({
  id: s.id,
  workspaceId: `ws_${s.id.replace("biz_", "")}`,
  name: s.name,
  type: s.type,
  status: s.status ?? "active",
  logo: "",
  accent: s.accent,
  isAgencyOwner: s.id === FOCKIS_BUSINESS_ID,
  sizeHint: s.sizeHint,
  planId: s.planId,
  services: servicesRecord(s.active, s.paused),
  profile: profileFor(s),
  createdAt: daysAgo(s.createdDaysAgo),
  lastActivityAt: daysAgo(SEEDS.indexOf(s) * 0.7),
}));

const PEOPLE = ["Elince M.", "Dana Ross", "Kofi Asante", "Maya Lin"];

export const mockTeam: TeamMember[] = mockBusinesses
  .filter((b) => !b.isAgencyOwner)
  .flatMap((b, i) => {
    const owner = b.name.split(" ")[0];
    const domain = b.profile.website.replace("https://", "");
    return [
      { id: `tm_${b.id}_1`, businessId: b.id, name: `${owner} Owner`, email: `owner@${domain}`, role: "owner" as const, status: "active" as const, invitedAt: b.createdAt, lastActiveAt: daysAgo(i + 1) },
      { id: `tm_${b.id}_2`, businessId: b.id, name: "Elince M.", email: "elince@fockis.com", role: "admin" as const, status: "active" as const, invitedAt: b.createdAt, lastActiveAt: daysAgo(0.2) },
      { id: `tm_${b.id}_3`, businessId: b.id, name: "Dana Ross", email: "dana@fockis.com", role: "marketing_manager" as const, status: "active" as const, invitedAt: b.createdAt, lastActiveAt: daysAgo(1) },
      ...(i % 2 === 0 ? [{ id: `tm_${b.id}_4`, businessId: b.id, name: "New teammate", email: `staff@${domain}`, role: "viewer" as const, status: "invited" as const, invitedAt: daysAgo(2) }] : []),
    ];
  });

const TASK_SEEDS: Array<[string, string, number, AgencyTask["priority"], AgencyTask["status"], number]> = [
  ["Create October newsletter", "biz_abc", 1, "high", "in_progress", 2],
  ["Prepare weekend brunch promotion", "biz_joes", 2, "urgent", "todo", 1],
  ["Review open house campaign", "biz_smith", 0, "medium", "waiting", 3],
  ["Import contacts from old CRM", "biz_xyz", 3, "high", "todo", 4],
  ["Prepare monthly report", "biz_peak", 0, "medium", "todo", 6],
  ["Follow up with client about holiday hours", "biz_bloom", 1, "low", "waiting", 5],
  ["Set up welcome automation", "biz_xyz", 2, "high", "in_progress", 3],
  ["Design fall service promotion", "biz_bloom", 3, "medium", "completed", -2],
  ["Prepare monthly report", "biz_abc", 0, "medium", "completed", -1],
  ["Schedule youth night announcement", "biz_grace", 1, "medium", "todo", 7],
  ["Review campaign before send", "biz_peak", 2, "high", "in_progress", 1],
];

export const mockTasks: AgencyTask[] = TASK_SEEDS.map(([title, businessId, who, priority, status, due], i) => ({
  id: `task_${i + 1}`,
  title,
  businessId,
  assignee: PEOPLE[who],
  priority,
  status,
  dueDate: due >= 0 ? daysAhead(due) : daysAgo(-due),
  createdAt: daysAgo(10 - (i % 7)),
}));

export const mockApprovals: Approval[] = [
  { id: "apv_1", businessId: "biz_abc", campaignName: "Fresh fade Friday", campaignType: "product_promotion", subject: "20% off fades this Friday only", status: "pending_approval", requestedBy: "Dana Ross", requestedAt: daysAgo(1),
    comments: [{ id: "c1", author: "Dana Ross", side: "agency", body: "Draft is ready. Please check the price and Friday hours.", at: daysAgo(1) }] },
  { id: "apv_2", businessId: "biz_joes", campaignName: "Weekend brunch is back", campaignType: "newsletter", subject: "Brunch returns this Saturday", status: "changes_requested", requestedBy: "Elince M.", requestedAt: daysAgo(3),
    comments: [
      { id: "c1", author: "Elince M.", side: "agency", body: "Here's the brunch announcement for review.", at: daysAgo(3) },
      { id: "c2", author: "Joe Owner", side: "client", body: "Can we add the new pancake special and a photo?", at: daysAgo(2) },
    ] },
  { id: "apv_3", businessId: "biz_smith", campaignName: "Open house: 42 Oak Lane", campaignType: "event", subject: "You're invited: Sunday open house", status: "approved", requestedBy: "Kofi Asante", requestedAt: daysAgo(4), scheduledFor: daysAhead(2),
    comments: [{ id: "c1", author: "Smith Owner", side: "client", body: "Looks great, approved.", at: daysAgo(3) }] },
  { id: "apv_4", businessId: "biz_peak", campaignName: "New year, new goals", campaignType: "announcement", subject: "Lock in your 2027 rate", status: "draft", requestedBy: "Maya Lin", requestedAt: daysAgo(0.5), comments: [] },
  { id: "apv_5", businessId: "biz_bloom", campaignName: "Holiday glam booking", campaignType: "event", subject: "Book your holiday look", status: "scheduled", requestedBy: "Dana Ross", requestedAt: daysAgo(6), scheduledFor: daysAhead(4),
    comments: [{ id: "c1", author: "Bloom Owner", side: "client", body: "Approved. Thank you!", at: daysAgo(5) }] },
  { id: "apv_6", businessId: "biz_abc", campaignName: "We miss you", campaignType: "winback", subject: "Your chair is waiting", status: "sent", requestedBy: "Dana Ross", requestedAt: daysAgo(12), comments: [] },
  { id: "apv_7", businessId: "biz_grace", campaignName: "Youth night", campaignType: "event", subject: "Youth night this Friday", status: "pending_approval", requestedBy: "Maya Lin", requestedAt: daysAgo(0.3), comments: [] },
];

export const mockAgencyActivity: AgencyActivity[] = [
  { id: "aa1", businessId: "biz_abc", text: "“Fresh fade Friday” was sent for approval", at: daysAgo(0.05) },
  { id: "aa2", businessId: "biz_joes", text: "Joe's Restaurant is down to 450 email credits", at: daysAgo(0.3) },
  { id: "aa3", businessId: "biz_smith", text: "Open house campaign approved by the client", at: daysAgo(0.8) },
  { id: "aa4", businessId: "biz_xyz", text: "XYZ Construction workspace created from an application", at: daysAgo(6) },
  { id: "aa5", businessId: "biz_peak", text: "Peak Fitness win-back automation recovered 38 members", at: daysAgo(1.2) },
  { id: "aa6", businessId: "biz_bloom", text: "Bloom Salon ran out of email credits", at: daysAgo(1.6) },
];

export const mockAgencySettings: AgencySettings = {
  agencyName: "Fockis Marketing Agency",
  supportEmail: "marketing@fockis.com",
  defaultPlanId: "plan_starter",
  requireClientApproval: true,
  autoCreateTasksOnConversion: true,
  defaultServices: ["email_marketing", "analytics_reporting"],
  notifyOnNewApplication: true,
  notifyOnLowCredits: true,
};

/** UI-only viewer. Replace with the signed-in user from your auth. */
export const mockViewer: MarketingViewer = {
  id: "user_elince",
  name: "Elince",
  role: "agency_admin",
  permissions: [
    "agency.view", "agency.manage_clients", "agency.review_applications",
    "billing.view", "billing.purchase", "billing.manage_client_credits", "campaigns.send",
  ],
};
