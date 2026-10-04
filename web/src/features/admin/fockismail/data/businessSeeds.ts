// ============================================================================
// PER-BUSINESS DEMO STORES
// ----------------------------------------------------------------------------
// Builds an isolated set of marketing data for one business so switching
// workspaces really changes what you see. Fockis uses the original seed data;
// client businesses get data adapted to their business type.
// Demo only. Real isolation is the backend's job.
// ============================================================================

import type {
  ABTest,
  Audience,
  Automation,
  Campaign,
  CampaignStats,
  CampaignType,
  Contact,
  EmailTemplate,
  Journey,
  LandingPage,
  MarketingIntegration,
  MarketingSettings,
  MediaAsset,
  Recommendation,
  Seed,
  Segment,
  SendingDomain,
  SignupForm,
  SmsCampaign,
  SocialCampaign,
  Tag,
  TransactionalTemplate,
} from "../types/mailchimp.types";
import type { Business, BusinessType } from "../types/platform.types";
import * as seed from "./mailchimpMockData";
import { automationTemplates, smallBusinessTemplates } from "./templateMockData";
import { daysAgo, daysAhead } from "./demoTime";

export interface MockStore {
  campaigns: Campaign[];
  audiences: Audience[];
  contacts: Contact[];
  segments: Segment[];
  tags: Tag[];
  templates: EmailTemplate[];
  automations: Automation[];
  journeys: Journey[];
  forms: SignupForm[];
  landingPages: LandingPage[];
  media: MediaAsset[];
  abTests: ABTest[];
  transactional: TransactionalTemplate[];
  sms: SmsCampaign[];
  social: SocialCampaign[];
  integrations: MarketingIntegration[];
  domains: SendingDomain[];
  settings: MarketingSettings;
  /** How many real contacts each demo contact row represents. */
  scale: number;
}

function own<T>(items: Seed<T>[], businessId: string): T[] {
  return structuredClone(items).map((x) => ({ ...x, businessId }) as T);
}

// ---------------------------------------------------------------------------
// Business-type profiles
// ---------------------------------------------------------------------------

interface TypeProfile {
  audiences: string[];
  campaigns: Array<[string, string, CampaignType]>;
  open: number;
  click: number;
  recommendations: Array<Omit<Recommendation, "id">>;
}

const DEFAULT_PROFILE: TypeProfile = {
  audiences: ["All customers", "VIP customers", "New customers", "Lapsed customers"],
  campaigns: [
    ["Monthly newsletter", "What's new this month", "newsletter"],
    ["Customer appreciation", "A thank-you from all of us", "announcement"],
    ["Seasonal promotion", "Our seasonal offer is here", "product_promotion"],
    ["Review request", "How did we do?", "regular"],
    ["Welcome series", "Welcome! Here's what to expect", "welcome"],
    ["We miss you", "It's been a while", "winback"],
  ],
  open: 0.38,
  click: 0.062,
  recommendations: [
    { title: "Turn on a welcome automation", body: "New customers who get a welcome email are more likely to come back.", actionLabel: "Browse automation templates", actionPath: "automations" },
    { title: "Ask happy customers for reviews", body: "A review request after each visit builds trust with new customers.", actionLabel: "Use the review template", actionPath: "templates" },
  ],
};

const PROFILES: Partial<Record<BusinessType, Partial<TypeProfile>>> = {
  barbershop: {
    audiences: ["All clients", "Regulars (monthly)", "New clients", "Haven't booked in 60 days"],
    campaigns: [
      ["Fresh fade Friday", "20% off fades this Friday only", "product_promotion"],
      ["Book your back-to-school cut", "Kids' cuts are back in season", "event"],
      ["Appointment reminder", "Your chair is ready tomorrow", "automated"],
      ["Your chair is waiting", "It's been a while since your last cut", "winback"],
      ["New: hot towel shave", "Try our new hot towel shave", "announcement"],
      ["October newsletter", "What's new at ABC this month", "newsletter"],
    ],
    open: 0.428,
    click: 0.087,
    recommendations: [
      { title: "Fill empty Tuesday slots", body: "A quick text to regulars on slow days usually fills the chair.", actionLabel: "Create an SMS campaign", actionPath: "sms" },
      { title: "Win back clients after 60 days", body: "Set up a reminder for clients who haven't booked in two months.", actionLabel: "Use the winback automation", actionPath: "automations" },
    ],
  },
  restaurant: {
    audiences: ["All guests", "Regulars", "Brunch fans", "Catering leads"],
    campaigns: [
      ["Weekend brunch is back", "Brunch returns this Saturday", "newsletter"],
      ["Chef's special", "This week's chef special", "product_promotion"],
      ["Happy birthday from Joe's", "Dessert's on us this month", "automated"],
      ["Holiday catering", "Let us cater your holiday party", "event"],
      ["Tell us how we did", "How was your visit?", "regular"],
    ],
    open: 0.35,
    click: 0.051,
    recommendations: [
      { title: "Promote a weekday special", body: "Weekday traffic responds well to a single, simple offer.", actionLabel: "Use the restaurant template", actionPath: "templates" },
      { title: "Buy more email credits", body: "You're close to your monthly limit. Top up before the weekend.", actionLabel: "Buy email credits", actionPath: "/marketing/billing/credits?type=email" },
    ],
  },
  real_estate: {
    audiences: ["All contacts", "Buyers", "Sellers", "Past clients"],
    campaigns: [
      ["Open house: 42 Oak Lane", "You're invited: Sunday open house", "event"],
      ["Just listed", "Just listed: 3 bed, 2 bath in Westerville", "product_promotion"],
      ["Market update", "October market update for central Ohio", "newsletter"],
      ["Home value check-in", "What's your home worth today?", "regular"],
      ["New buyer welcome", "Your home search starts here", "welcome"],
    ],
    open: 0.41,
    click: 0.072,
    recommendations: [
      { title: "Follow up with new leads fast", body: "Leads contacted within an hour convert far better.", actionLabel: "Use lead follow-up", actionPath: "automations" },
      { title: "Build an open house landing page", body: "Collect RSVPs and buyer contact details in one place.", actionLabel: "Create a landing page", actionPath: "landing-pages" },
    ],
  },
  construction: {
    audiences: ["All leads", "Past customers", "Quote requested"],
    campaigns: [
      ["Spring deck season", "Book your deck before spring", "product_promotion"],
      ["Project spotlight", "See our latest kitchen remodel", "newsletter"],
      ["Free estimate follow-up", "Your free estimate is ready", "automated"],
    ],
    open: 0.33,
    click: 0.048,
  },
  salon: {
    audiences: ["All clients", "Color clients", "Bridal", "Lapsed clients"],
    campaigns: [
      ["Holiday glam booking", "Book your holiday look", "event"],
      ["New stylist welcome", "Meet our newest stylist", "announcement"],
      ["Color refresh reminder", "Time for a color refresh?", "automated"],
      ["Fall service special", "Fall treatments are here", "product_promotion"],
    ],
    open: 0.44,
    click: 0.079,
  },
  gym_fitness: {
    audiences: ["All members", "New members", "Class regulars", "At-risk members"],
    campaigns: [
      ["New year, new goals", "Lock in your 2027 rate", "announcement"],
      ["Class schedule update", "New classes this month", "newsletter"],
      ["We miss you at the gym", "Your goals are waiting", "winback"],
      ["Bring a friend week", "Bring a friend for free", "event"],
    ],
    open: 0.37,
    click: 0.058,
  },
  church_organization: {
    audiences: ["Congregation", "Volunteers", "Youth families", "Visitors"],
    campaigns: [
      ["Sunday service update", "This Sunday at Grace", "newsletter"],
      ["Youth night", "Youth night this Friday", "event"],
      ["Volunteer drive", "Help us serve the community", "announcement"],
    ],
    open: 0.52,
    click: 0.094,
  },
};

const BUSINESS_TOTALS: Record<string, { campaigns: number; revenue: number }> = {
  biz_abc: { campaigns: 24, revenue: 12840 },
  biz_joes: { campaigns: 14, revenue: 9620 },
  biz_smith: { campaigns: 18, revenue: 41200 },
  biz_xyz: { campaigns: 2, revenue: 0 },
  biz_bloom: { campaigns: 16, revenue: 8340 },
  biz_peak: { campaigns: 20, revenue: 18900 },
  biz_grace: { campaigns: 12, revenue: 0 },
};

export function profileFor(type: BusinessType): TypeProfile {
  return { ...DEFAULT_PROFILE, ...PROFILES[type] };
}

export function recommendationsFor(business: Business): Recommendation[] {
  return profileFor(business.type).recommendations.map((r, i) => ({ ...r, id: `rec_${business.id}_${i}` }));
}

function campaignStats(recipients: number, open: number, click: number, revenue: number): CampaignStats {
  const delivered = Math.round(recipients * 0.985);
  const uniqueOpens = Math.round(delivered * open);
  const uniqueClicks = Math.round(delivered * click);
  return {
    recipients,
    delivered,
    opens: Math.round(uniqueOpens * 1.35),
    uniqueOpens,
    clicks: Math.round(uniqueClicks * 1.25),
    uniqueClicks,
    bounces: recipients - delivered,
    unsubscribes: Math.round(delivered * 0.002),
    spamComplaints: Math.round(delivered * 0.0002),
    conversions: Math.round(uniqueClicks * 0.2),
    revenue,
  };
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function fockisStore(b: Business): MockStore {
  return {
    campaigns: own(seed.mockCampaigns, b.id),
    audiences: own(seed.mockAudiences, b.id),
    contacts: own(seed.mockContacts, b.id),
    segments: own(seed.mockSegments, b.id),
    tags: own(seed.mockTags, b.id),
    templates: [...own(seed.mockTemplates, b.id), ...own(smallBusinessTemplates, b.id)],
    automations: own(seed.mockAutomations, b.id),
    journeys: own(seed.mockJourneys, b.id),
    forms: own(seed.mockForms, b.id),
    landingPages: own(seed.mockLandingPages, b.id),
    media: own(seed.mockMedia, b.id),
    abTests: own(seed.mockABTests, b.id),
    transactional: own(seed.mockTransactional, b.id),
    sms: own(seed.mockSmsCampaigns, b.id),
    social: own(seed.mockSocialCampaigns, b.id),
    integrations: own(seed.mockIntegrations, b.id),
    domains: own(seed.mockDomains, b.id),
    settings: structuredClone(seed.mockSettings),
    scale: 670,
  };
}

function clientStore(b: Business): MockStore {
  const p = profileFor(b.type);
  const id = b.id;
  const domain = b.profile.website.replace(/^https?:\/\//, "") || `${id}.example`;
  const contactRows = Math.max(16, Math.min(60, Math.round(b.sizeHint / 60)));
  const scale = Math.max(1, Math.round(b.sizeHint / contactRows));
  const totals = BUSINESS_TOTALS[id] ?? { campaigns: 4, revenue: 0 };
  const isNew = b.status === "onboarding" || totals.campaigns <= 2;

  const audiences: Audience[] = p.audiences.map((name, i) => ({
    id: `${id}_aud_${i}`,
    businessId: id,
    name,
    contactCount: i === 0 ? b.sizeHint : Math.round(b.sizeHint * [1, 0.18, 0.12, 0.15][i]),
    createdAt: b.createdAt,
    growthPct: +(2 + ((i * 3.7) % 9)).toFixed(1),
  }));

  const tagNames: Array<[string, string]> = [["VIP", "#7c3aed"], ["Regular", "#0e9f6e"], ["New", "#1f5eff"], ["Newsletter", "#0891b2"], ["Promo opt-in", "#c98a04"], ["Lapsed", "#d64545"]];
  const tags: Tag[] = tagNames.map(([name, color], i) => ({
    id: `${id}_tag_${i}`, businessId: id, name, color,
    contactCount: Math.round(b.sizeHint * [0.08, 0.4, 0.12, 0.6, 0.3, 0.15][i]),
    createdAt: b.createdAt, lastUsedAt: daysAgo(i + 1),
  }));

  const contacts: Contact[] = seed.mockContacts.slice(0, contactRows).map((c, i) => ({
    ...structuredClone(c),
    id: `${id}_con_${String(i + 1).padStart(3, "0")}`,
    businessId: id,
    email: `${c.firstName}.${c.lastName}${i}@example.com`.toLowerCase(),
    location: b.profile.serviceArea.replace(" and nearby", "") || c.location,
    tagIds: tags.filter((_, t) => (i + t) % 4 === 0).map((t) => t.id),
    audienceIds: [audiences[0].id, audiences[1 + (i % (audiences.length - 1))].id],
    revenue: Math.round(c.revenue * 0.35),
    customFields: { "Preferred contact": i % 3 ? "Email" : "Text", "Customer since": String(2018 + (i % 8)) },
  }));

  const campaignCount = totals.campaigns;
  const revenueEach = campaignCount ? Math.round(totals.revenue / Math.max(1, campaignCount - 2)) : 0;
  const recipients = Math.round(b.sizeHint * 0.9);
  const campaigns: Campaign[] = Array.from({ length: campaignCount }, (_, i) => {
    const [name, subject, type] = p.campaigns[i % p.campaigns.length];
    const round = Math.floor(i / p.campaigns.length);
    const draft = i === 0 && !isNew;
    const scheduled = i === 1 && !isNew;
    const status = isNew ? "draft" : draft ? "draft" : scheduled ? "scheduled" : "sent";
    const sentDays = 3 + i * 9;
    const vary = 1 + ((i * 7) % 5 - 2) / 40;
    return {
      id: `${id}_cmp_${String(i + 1).padStart(3, "0")}`,
      businessId: id,
      name: round ? `${name} (${["Aug", "Jul", "Jun", "May"][round - 1] ?? "earlier"})` : name,
      description: "",
      subject,
      previewText: "",
      fromName: b.profile.defaultSenderName,
      fromEmail: b.profile.defaultSenderEmail,
      replyTo: b.profile.replyToEmail,
      type,
      status,
      audienceId: audiences[i % audiences.length].id,
      tagIds: [],
      createdAt: daysAgo(sentDays + 2),
      scheduledAt: status === "scheduled" ? daysAhead(2) : undefined,
      sentAt: status === "sent" ? daysAgo(sentDays) : undefined,
      stats: status === "sent" ? campaignStats(Math.round(recipients * (i % 3 === 0 ? 1 : 0.4)), p.open * vary, p.click * vary, revenueEach) : campaignStats(0, 0, 0, 0),
    };
  });

  const generalTemplates = seed.mockTemplates.filter((t) => !t.fockisSpecific);
  const templates = [...own(smallBusinessTemplates, id), ...own(generalTemplates, id)];

  const autoPicks = automationTemplates.slice(0, isNew ? 1 : 4);
  const automations: Automation[] = autoPicks.map((t, i) => ({
    id: `${id}_aut_${i}`, businessId: id, name: t.name, trigger: t.trigger,
    status: isNew ? "draft" : i === 3 ? "paused" : "active",
    contacts: isNew ? 0 : Math.round(b.sizeHint * [0.3, 0.05, 0.12, 0.2][i]),
    emails: 2, conversionRate: isNew ? 0 : [9.2, 14.1, 4.6, 11.3][i],
    revenue: isNew ? 0 : Math.round(totals.revenue * [0.12, 0.2, 0.05, 0.08][i]),
    updatedAt: daysAgo(i + 2), journeyId: i === 0 ? `${id}_jrn_0` : undefined,
  }));
  const journeys: Journey[] = [{
    id: `${id}_jrn_0`, businessId: id, name: automationTemplates[0].name,
    status: isNew ? "draft" : "active",
    entered: isNew ? 0 : Math.round(b.sizeHint * 0.3), completed: isNew ? 0 : Math.round(b.sizeHint * 0.21),
    updatedAt: daysAgo(3), nodes: structuredClone(automationTemplates[0].steps),
  }];

  const firstForm = seed.mockForms[0];
  const forms: SignupForm[] = [{
    ...structuredClone(firstForm), id: `${id}_frm_0`, businessId: id, audienceId: audiences[0].id,
    name: "Website signup", title: `Get news from ${b.name}`, description: "Offers, updates, and events. No spam.",
    submissions: isNew ? 0 : Math.round(b.sizeHint * 0.08), conversionRate: isNew ? 0 : 5.4,
  }];

  const landingPages: LandingPage[] = [{
    id: `${id}_lp_0`, businessId: id, name: `${b.name} offer`, slug: domain.split(".")[0], status: isNew ? "draft" : "published",
    visits: isNew ? 0 : Math.round(b.sizeHint * 1.6), signups: isNew ? 0 : Math.round(b.sizeHint * 0.07), updatedAt: daysAgo(5), accent: b.accent,
    sections: [
      { id: "s1", kind: "hero", heading: `Welcome to ${b.name}`, body: b.profile.description, buttonLabel: "Get the offer" },
      { id: "s2", kind: "form", heading: "Join our list", body: "Be first to hear about offers.", buttonLabel: "Sign up" },
    ],
  }];

  const integrations: MarketingIntegration[] = own(seed.mockIntegrations, id).map((x) => ({
    ...x,
    connected: x.id === "int_users" || (x.id === "int_stripe" && ["retail", "ecommerce", "restaurant"].includes(b.type)) || (x.id === "int_instagram" && !isNew),
    connectedAccount: x.id === "int_users" ? `Fockis business page: ${b.name}` : x.connectedAccount,
  }));

  const settings: MarketingSettings = {
    ...structuredClone(seed.mockSettings),
    accountName: `${b.name} marketing`,
    companyName: b.name,
    defaultAudienceId: audiences[0].id,
    fromName: b.profile.defaultSenderName,
    fromEmail: b.profile.defaultSenderEmail,
    replyTo: b.profile.replyToEmail,
    footer: `${b.name} · ${b.profile.address}`,
    dailySendLimit: Math.max(5000, b.sizeHint * 2),
    plan: b.planId,
    monthlyContactLimit: Math.max(2500, b.sizeHint * 2),
  };

  return {
    campaigns,
    audiences,
    contacts,
    segments: [
      { id: `${id}_seg_0`, businessId: id, name: "Engaged in the last 30 days", match: "all", conditions: [{ id: "c1", field: "campaign_opened", operator: "is", value: "last_30_days" }], contactCount: Math.round(b.sizeHint * 0.45), createdAt: b.createdAt, updatedAt: daysAgo(4) },
      { id: `${id}_seg_1`, businessId: id, name: "Big spenders", match: "all", conditions: [{ id: "c1", field: "purchase_amount", operator: "greater_than", value: "150" }], contactCount: Math.round(b.sizeHint * 0.09), createdAt: b.createdAt, updatedAt: daysAgo(9) },
    ],
    tags,
    templates,
    automations,
    journeys,
    forms,
    landingPages,
    media: own(seed.mockMedia.filter((m) => m.kind !== "video").slice(0, 6), id),
    abTests: isNew ? [] : [{ ...structuredClone(seed.mockABTests[0]), id: `${id}_ab_0`, businessId: id, name: `${p.campaigns[0][0]} subject test`, variants: [
      { ...seed.mockABTests[0].variants[0], value: p.campaigns[0][1], recipients: Math.round(b.sizeHint * 0.1) },
      { ...seed.mockABTests[0].variants[1], value: `Just for you: ${p.campaigns[0][1].toLowerCase()}`, recipients: Math.round(b.sizeHint * 0.1) },
    ] }],
    transactional: own(seed.mockTransactional.filter((t) => ["tx_order", "tx_welcome", "tx_receipt"].includes(t.id)), id).map((t) => ({
      ...t, sent: Math.round(t.sent * b.sizeHint / 48210), delivered: Math.round(t.delivered * b.sizeHint / 48210), failed: Math.round(t.failed * b.sizeHint / 48210),
    })),
    sms: isNew ? [] : [{ id: `${id}_sms_0`, businessId: id, name: `${p.campaigns[0][0]} (text)`, message: `${b.name}: ${p.campaigns[0][1]}. Reply STOP to opt out.`, status: "sent", recipients: Math.round(b.sizeHint * 0.3), delivered: Math.round(b.sizeHint * 0.29), clicks: Math.round(b.sizeHint * 0.04) }],
    social: [],
    integrations,
    domains: [{ id: `${id}_dom`, businessId: id, domain, verified: !isNew, dkim: isNew ? "pending" : "valid", spf: isNew ? "pending" : "valid", dmarc: isNew ? "missing" : "valid", addedAt: b.createdAt }],
    settings,
    scale,
  };
}

export function buildStore(business: Business): MockStore {
  return business.isAgencyOwner ? fockisStore(business) : clientStore(business);
}
