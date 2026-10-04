// ============================================================================
// FOCKIS MARKETING — DEMO DATA
// ----------------------------------------------------------------------------
// Everything in this file is demo data. It is only used when the module runs
// in mock mode (see services/httpClient.ts). The UI labels mock mode clearly.
// Replace by pointing VITE_MARKETING_API_URL at a real backend.
// ============================================================================

import type {
  ABTest,
  Audience,
  Automation,
  Campaign,
  CampaignStats,
  CampaignType,
  CampaignStatus,
  ChartSeries,
  Contact,
  ContactActivity,
  ContactSource,
  ContactStatus,
  DashboardSummary,
  EmailTemplate,
  Journey,
  LandingPage,
  MarketingIntegration,
  MarketingSettings,
  MediaAsset,
  Seed,
  Segment,
  SendingDomain,
  SignupForm,
  SmsCampaign,
  SocialCampaign,
  Tag,
  TemplateCategory,
  TransactionalTemplate,
  AnalyticsOverview,
} from "../types/mailchimp.types";
import { documentFrom } from "../utils/emailBlocks";

/** Fixed reference date so demo data is stable between reloads. */
export const DEMO_NOW = new Date("2026-10-03T09:00:00Z");

// Deterministic pseudo-random generator (mulberry32).
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = seeded(20261003);
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => Math.round(min + rand() * (max - min));
const daysAgo = (d: number) => new Date(DEMO_NOW.getTime() - d * 86400000).toISOString();
const daysAhead = (d: number) => new Date(DEMO_NOW.getTime() + d * 86400000).toISOString();

// ---------------------------------------------------------------------------
// Audiences
// ---------------------------------------------------------------------------

export const mockAudiences: Seed<Audience>[] = [
  { id: "aud_all", name: "All Fockis users", fockisType: "fockis_users", contactCount: 48210, createdAt: daysAgo(420), growthPct: 6.2 },
  { id: "aud_buyers", name: "Marketplace buyers", fockisType: "marketplace_buyers", contactCount: 18440, createdAt: daysAgo(380), growthPct: 9.8 },
  { id: "aud_sellers", name: "Marketplace sellers", fockisType: "marketplace_sellers", contactCount: 2310, createdAt: daysAgo(300), growthPct: 14.1 },
  { id: "aud_business", name: "Businesses", fockisType: "businesses", contactCount: 3920, createdAt: daysAgo(260), growthPct: 4.4 },
  { id: "aud_creators", name: "Creators", fockisType: "creators", contactCount: 6780, createdAt: daysAgo(240), growthPct: 11.3 },
  { id: "aud_premium", name: "Premium members", fockisType: "premium_users", contactCount: 5120, createdAt: daysAgo(200), growthPct: 3.1 },
  { id: "aud_church", name: "Church organizations", fockisType: "church_organizations", contactCount: 940, createdAt: daysAgo(180), growthPct: 2.6 },
  { id: "aud_travel", name: "Travel customers", fockisType: "travel_customers", contactCount: 4210, createdAt: daysAgo(150), growthPct: 7.9 },
  { id: "aud_academy", name: "Academy students", fockisType: "academy_students", contactCount: 3360, createdAt: daysAgo(120), growthPct: 12.5 },
  { id: "aud_music", name: "Music listeners", fockisType: "music_users", contactCount: 7690, createdAt: daysAgo(90), growthPct: 8.7 },
];

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export const mockTags: Seed<Tag>[] = [
  { id: "tag_vip", name: "VIP", color: "#7c3aed", contactCount: 812, createdAt: daysAgo(400), lastUsedAt: daysAgo(1) },
  { id: "tag_seller", name: "Seller", color: "#0e9f6e", contactCount: 2310, createdAt: daysAgo(300), lastUsedAt: daysAgo(2) },
  { id: "tag_creator", name: "Creator", color: "#e0598b", contactCount: 6780, createdAt: daysAgo(240), lastUsedAt: daysAgo(3) },
  { id: "tag_premium", name: "Premium", color: "#c98a04", contactCount: 5120, createdAt: daysAgo(200), lastUsedAt: daysAgo(1) },
  { id: "tag_newsletter", name: "Newsletter", color: "#1f5eff", contactCount: 21400, createdAt: daysAgo(380), lastUsedAt: daysAgo(4) },
  { id: "tag_waves", name: "Waves watcher", color: "#0891b2", contactCount: 15800, createdAt: daysAgo(160), lastUsedAt: daysAgo(1) },
  { id: "tag_travel", name: "Traveler", color: "#d97706", contactCount: 4210, createdAt: daysAgo(150), lastUsedAt: daysAgo(9) },
  { id: "tag_academy", name: "Student", color: "#4f46e5", contactCount: 3360, createdAt: daysAgo(120), lastUsedAt: daysAgo(6) },
  { id: "tag_cart", name: "Cart abandoner", color: "#d64545", contactCount: 1290, createdAt: daysAgo(80), lastUsedAt: daysAgo(0) },
  { id: "tag_beta", name: "Beta tester", color: "#64748b", contactCount: 230, createdAt: daysAgo(40), lastUsedAt: daysAgo(14) },
];

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

const FIRST = ["Amara", "Lucas", "Sofia", "Kwame", "Mei", "Daniel", "Aisha", "Mateo", "Hana", "Elijah", "Zara", "Noah", "Priya", "Samuel", "Leila", "Jonah", "Imani", "Diego", "Yuki", "Grace", "Omar", "Chloe", "Tariq", "Nia"];
const LAST = ["Okafor", "Bennett", "Rossi", "Mensah", "Chen", "Alvarez", "Haddad", "Silva", "Tanaka", "Brooks", "Nwosu", "Fischer", "Patel", "Adeyemi", "Moreau", "Kim", "Johnson", "Costa", "Sato", "Mbeki"];
const CITIES = ["Columbus, OH", "Lagos, NG", "London, UK", "Toronto, CA", "Accra, GH", "Austin, TX", "Paris, FR", "São Paulo, BR", "Nairobi, KE", "Atlanta, GA", "Berlin, DE", "Tokyo, JP"];
const PRODUCTS = ["Handwoven tote", "Ceramic mug set", "Premium membership", "Academy: Design 101", "Travel: Lisbon weekend", "Studio headphones", "Linen throw", "Leather notebook"];
const STATUSES: ContactStatus[] = ["subscribed", "subscribed", "subscribed", "subscribed", "subscribed", "pending", "unsubscribed", "cleaned"];
const SOURCES: ContactSource[] = ["fockis_signup", "marketplace", "import", "form", "api", "manual", "landing_page"];

function makeActivity(first: string): ContactActivity[] {
  const kinds: Array<[ContactActivity["kind"], string]> = [
    ["opened", "Opened “Fall marketplace picks”"],
    ["clicked", "Clicked “Shop the collection”"],
    ["purchased", `Purchased ${pick(PRODUCTS)}`],
    ["visited", "Visited fockis.com/shop"],
    ["posted", `${first} posted to their Fockis feed`],
    ["followed", "Followed a marketplace seller"],
    ["tagged", "Added to tag “Newsletter”"],
    ["subscribed", "Subscribed via Fockis signup"],
  ];
  const count = between(4, 8);
  return Array.from({ length: count }, (_, i) => {
    const [kind, label] = pick(kinds);
    return { id: `act_${first}_${i}`, kind, label, at: daysAgo(i * between(1, 6)) };
  });
}

export const mockContacts: Seed<Contact>[] = Array.from({ length: 72 }, (_, i) => {
  const firstName = FIRST[i % FIRST.length];
  const lastName = LAST[(i * 7) % LAST.length];
  const orderCount = rand() > 0.35 ? between(1, 14) : 0;
  const purchases = Array.from({ length: Math.min(orderCount, 5) }, (_, p) => ({
    id: `ord_${i}_${p}`,
    product: pick(PRODUCTS),
    amount: between(18, 240),
    at: daysAgo(p * between(5, 30) + 2),
  }));
  const revenue = purchases.reduce((s, p) => s + p.amount, 0) + orderCount * between(5, 40);
  const tagIds = mockTags.filter(() => rand() > 0.72).map((t) => t.id);
  const vip = revenue > 600 || tagIds.includes("tag_vip");
  return {
    id: `con_${(i + 1).toString().padStart(3, "0")}`,
    firstName,
    lastName,
    email: `${firstName}.${lastName}${i}@example.com`.toLowerCase(),
    phone: rand() > 0.4 ? `+1 (614) 555-${between(1000, 9999)}` : undefined,
    location: pick(CITIES),
    status: pick(STATUSES),
    tagIds: vip && !tagIds.includes("tag_vip") ? [...tagIds, "tag_vip"] : tagIds,
    source: pick(SOURCES),
    audienceIds: ["aud_all", pick(mockAudiences).id],
    joinedAt: daysAgo(between(1, 400)),
    lastActivityAt: daysAgo(between(0, 60)),
    revenue,
    orderCount,
    vip,
    customFields: {
      "Fockis handle": `@${firstName.toLowerCase()}${i}`,
      "Preferred language": pick(["English", "French", "Portuguese", "Spanish"]),
      "Marketplace store": rand() > 0.8 ? "Yes" : "No",
    },
    activity: makeActivity(firstName),
    purchases,
  };
});

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export const mockSegments: Seed<Segment>[] = [
  {
    id: "seg_highvalue", name: "High-value buyers", match: "all",
    conditions: [
      { id: "c1", field: "purchase_amount", operator: "greater_than", value: "250" },
      { id: "c2", field: "order_count", operator: "greater_than", value: "3" },
    ],
    contactCount: 3120, createdAt: daysAgo(90), updatedAt: daysAgo(3),
  },
  {
    id: "seg_waves", name: "Engaged Waves watchers", match: "all",
    conditions: [
      { id: "c1", field: "fockis_behavior", operator: "is", value: "has_watched_waves" },
      { id: "c2", field: "campaign_opened", operator: "is", value: "last_30_days" },
    ],
    contactCount: 9840, createdAt: daysAgo(60), updatedAt: daysAgo(8),
  },
  {
    id: "seg_lapsed", name: "Lapsed customers", match: "all",
    conditions: [
      { id: "c1", field: "fockis_behavior", operator: "is", value: "has_purchased" },
      { id: "c2", field: "last_activity", operator: "before", value: "2026-07-01" },
    ],
    contactCount: 4410, createdAt: daysAgo(45), updatedAt: daysAgo(12),
  },
  {
    id: "seg_newsellers", name: "New sellers (30 days)", match: "all",
    conditions: [
      { id: "c1", field: "fockis_behavior", operator: "is", value: "has_marketplace_store" },
      { id: "c2", field: "signup_date", operator: "after", value: "2026-09-03" },
    ],
    contactCount: 286, createdAt: daysAgo(20), updatedAt: daysAgo(1),
  },
];

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

function stats(recipients: number, open: number, click: number, rev: number): CampaignStats {
  const delivered = Math.round(recipients * 0.985);
  const uniqueOpens = Math.round(delivered * open);
  const uniqueClicks = Math.round(delivered * click);
  return {
    recipients,
    delivered,
    opens: Math.round(uniqueOpens * 1.4),
    uniqueOpens,
    clicks: Math.round(uniqueClicks * 1.3),
    uniqueClicks,
    bounces: recipients - delivered,
    unsubscribes: Math.round(delivered * 0.0021),
    spamComplaints: Math.round(delivered * 0.0002),
    conversions: Math.round(uniqueClicks * 0.18),
    revenue: rev,
  };
}
const empty: CampaignStats = stats(0, 0, 0, 0);

interface CampaignSeed {
  name: string; subject: string; type: CampaignType; status: CampaignStatus;
  audienceId: string; created: number; when?: number; s?: CampaignStats;
}

const campaignSeeds: CampaignSeed[] = [
  { name: "Fall marketplace picks", subject: "Our sellers' best pieces for fall 🍂", type: "product_promotion", status: "sent", audienceId: "aud_buyers", created: 9, when: 6, s: stats(18440, 0.412, 0.068, 24810) },
  { name: "October creator newsletter", subject: "What creators made this month", type: "newsletter", status: "sent", audienceId: "aud_creators", created: 5, when: 2, s: stats(6780, 0.468, 0.091, 3120) },
  { name: "Premium upgrade — autumn offer", subject: "Premium is 30% off this week", type: "ab_test", status: "sent", audienceId: "aud_all", created: 18, when: 14, s: stats(48210, 0.338, 0.042, 41260) },
  { name: "Welcome to Fockis", subject: "Welcome, let's set up your Fockis", type: "welcome", status: "sending", audienceId: "aud_all", created: 2, when: 0, s: stats(1240, 0.52, 0.11, 640) },
  { name: "New seller onboarding", subject: "Your store is live — here's what's next", type: "automated", status: "sent", audienceId: "aud_sellers", created: 30, when: 21, s: stats(2310, 0.61, 0.24, 8840) },
  { name: "Academy: winter enrollment", subject: "Winter courses open Monday", type: "announcement", status: "scheduled", audienceId: "aud_academy", created: 3, when: -4 },
  { name: "Lisbon travel weekend", subject: "3 nights in Lisbon from $289", type: "product_promotion", status: "scheduled", audienceId: "aud_travel", created: 4, when: -2 },
  { name: "Cart reminder — October", subject: "You left something in your cart", type: "abandoned_cart", status: "sent", audienceId: "aud_buyers", created: 12, when: 10, s: stats(1290, 0.488, 0.152, 11320) },
  { name: "We miss you", subject: "A lot has changed on Fockis", type: "winback", status: "paused", audienceId: "aud_all", created: 16, when: 13, s: stats(4410, 0.214, 0.029, 1980) },
  { name: "Church community update", subject: "New tools for your congregation", type: "announcement", status: "sent", audienceId: "aud_church", created: 25, when: 22, s: stats(940, 0.574, 0.132, 0) },
  { name: "Waves weekly", subject: "5 Waves you haven't seen yet", type: "newsletter", status: "sent", audienceId: "aud_all", created: 8, when: 7, s: stats(48210, 0.296, 0.051, 6210) },
  { name: "Music: new releases", subject: "Fresh drops from producers you follow", type: "regular", status: "draft", audienceId: "aud_music", created: 1 },
  { name: "Business spotlight", subject: "Get your business in front of locals", type: "regular", status: "draft", audienceId: "aud_business", created: 2 },
  { name: "Holiday gift guide (plain)", subject: "A quick note on holiday gifts", type: "plain_text", status: "draft", audienceId: "aud_buyers", created: 0 },
  { name: "Summer recap", subject: "Your Fockis summer in numbers", type: "newsletter", status: "archived", audienceId: "aud_all", created: 80, when: 75, s: stats(45900, 0.351, 0.047, 9200) },
  { name: "Live event: Creator Night", subject: "You're invited to Creator Night", type: "event", status: "sent", audienceId: "aud_creators", created: 35, when: 28, s: stats(6500, 0.502, 0.143, 2450) },
];

export const mockCampaigns: Seed<Campaign>[] = campaignSeeds.map((c, i) => ({
  id: `cmp_${(i + 1).toString().padStart(3, "0")}`,
  name: c.name,
  description: "",
  subject: c.subject,
  previewText: "",
  fromName: "Fockis",
  fromEmail: "hello@fockis.com",
  replyTo: "support@fockis.com",
  type: c.type,
  status: c.status,
  audienceId: c.audienceId,
  tagIds: [],
  createdAt: daysAgo(c.created),
  scheduledAt: c.status === "scheduled" && c.when !== undefined ? daysAhead(-c.when) : undefined,
  sentAt: c.when !== undefined && c.when >= 0 && c.status !== "scheduled" ? daysAgo(c.when) : undefined,
  stats: c.s ?? empty,
}));

// ---------------------------------------------------------------------------
// Templates (generic + Fockis-specific)
// ---------------------------------------------------------------------------

interface TemplateSeed { name: string; category: TemplateCategory; description: string; fockis?: boolean; accent: string; heading: string }

const templateSeeds: TemplateSeed[] = [
  { name: "Welcome to Fockis", category: "welcome", description: "Greets new members and points them to their first steps.", fockis: true, accent: "#1f5eff", heading: "Welcome to Fockis" },
  { name: "Marketplace promotion", category: "fockis_marketplace", description: "Product grid with prices, built for seasonal sales.", fockis: true, accent: "#0e9f6e", heading: "Fresh finds from Fockis sellers" },
  { name: "New seller campaign", category: "fockis_marketplace", description: "Helps new sellers finish setup and list products.", fockis: true, accent: "#0891b2", heading: "Your store is live" },
  { name: "Premium upgrade", category: "promotion", description: "Explains Premium benefits with a clear upgrade button.", fockis: true, accent: "#c98a04", heading: "Do more with Fockis Premium" },
  { name: "Creator campaign", category: "social", description: "Spotlights a creator and links to their profile.", fockis: true, accent: "#e0598b", heading: "Meet this week's featured creator" },
  { name: "New Wave recommendation", category: "social", description: "Recommends Waves based on what people watch.", fockis: true, accent: "#4f46e5", heading: "Waves picked for you" },
  { name: "Business promotion", category: "promotion", description: "Promotes a local business, deal, or spotlight.", fockis: true, accent: "#1f5eff", heading: "Discover local businesses" },
  { name: "Travel promotion", category: "product", description: "Showcases a destination with a booking button.", fockis: true, accent: "#d97706", heading: "Your next weekend away" },
  { name: "Academy announcement", category: "announcement", description: "Announces new courses and enrollment dates.", fockis: true, accent: "#4f46e5", heading: "New courses on Fockis Academy" },
  { name: "Monthly newsletter", category: "newsletter", description: "Three stories and a featured link.", accent: "#14213d", heading: "This month on Fockis" },
  { name: "Event invitation", category: "event", description: "Date, place, and an RSVP button.", accent: "#7c3aed", heading: "You're invited" },
  { name: "Order receipt", category: "transactional", description: "Itemized receipt with order details.", accent: "#475569", heading: "Thanks for your order" },
  { name: "Clean minimal", category: "minimal", description: "Text-first layout with generous spacing.", accent: "#334155", heading: "A short note" },
  { name: "Bold modern", category: "modern", description: "Large headline, image, and strong button.", accent: "#1f5eff", heading: "Something new is here" },
  { name: "Product launch", category: "product", description: "Hero image, product details, and a coupon.", accent: "#0e9f6e", heading: "Introducing our newest drop" },
];

export const mockTemplates: Seed<EmailTemplate>[] = templateSeeds.map((t, i) => ({
  id: `tpl_${(i + 1).toString().padStart(3, "0")}`,
  name: t.name,
  category: t.category,
  description: t.description,
  fockisSpecific: Boolean(t.fockis),
  accent: t.accent,
  updatedAt: daysAgo(between(1, 120)),
  usageCount: between(0, 64),
  document: documentFrom(
    t.category === "fockis_marketplace" || t.category === "product"
      ? [["logo"], ["heading", t.heading], ["text"], ["product_grid"], ["coupon"], ["button"], ["footer"]]
      : t.category === "minimal"
        ? [["heading", t.heading], ["text"], ["text"], ["footer"]]
        : t.category === "event"
          ? [["logo"], ["image"], ["heading", t.heading], ["text"], ["countdown"], ["button", "RSVP now"], ["footer"]]
          : [["logo"], ["image"], ["heading", t.heading], ["text"], ["button"], ["divider"], ["social"], ["footer"]],
  ),
}));

// ---------------------------------------------------------------------------
// Automations & journeys
// ---------------------------------------------------------------------------

export const mockAutomations: Seed<Automation>[] = [
  { id: "aut_welcome", name: "Welcome series", trigger: "Joins Fockis", status: "active", contacts: 12840, emails: 3, conversionRate: 8.4, revenue: 18420, updatedAt: daysAgo(2), journeyId: "jrn_welcome" },
  { id: "aut_newcustomer", name: "New customer", trigger: "First marketplace purchase", status: "active", contacts: 4210, emails: 2, conversionRate: 12.1, revenue: 22180, updatedAt: daysAgo(5) },
  { id: "aut_cart", name: "Abandoned cart", trigger: "Cart idle for 4 hours", status: "active", contacts: 1290, emails: 3, conversionRate: 14.6, revenue: 31240, updatedAt: daysAgo(1) },
  { id: "aut_birthday", name: "Birthday", trigger: "Contact birthday", status: "active", contacts: 2210, emails: 1, conversionRate: 6.2, revenue: 4120, updatedAt: daysAgo(30) },
  { id: "aut_winback", name: "Win back customer", trigger: "No purchase in 90 days", status: "paused", contacts: 4410, emails: 2, conversionRate: 3.1, revenue: 5210, updatedAt: daysAgo(13) },
  { id: "aut_postpurchase", name: "Post purchase", trigger: "Order delivered", status: "active", contacts: 8920, emails: 2, conversionRate: 9.7, revenue: 12840, updatedAt: daysAgo(7) },
  { id: "aut_follower", name: "New follower", trigger: "Gains a follower on Fockis", status: "active", contacts: 15320, emails: 1, conversionRate: 2.4, revenue: 0, updatedAt: daysAgo(4) },
  { id: "aut_seller", name: "Marketplace seller onboarding", trigger: "Opens a marketplace store", status: "active", contacts: 2310, emails: 4, conversionRate: 41.2, revenue: 8840, updatedAt: daysAgo(3) },
  { id: "aut_inactive", name: "Inactive user", trigger: "No login in 30 days", status: "draft", contacts: 0, emails: 2, conversionRate: 0, revenue: 0, updatedAt: daysAgo(1) },
  { id: "aut_renewal", name: "Subscription renewal", trigger: "Premium renews in 7 days", status: "active", contacts: 1840, emails: 2, conversionRate: 71.3, revenue: 26400, updatedAt: daysAgo(9) },
];

export const mockJourneys: Seed<Journey>[] = [
  {
    id: "jrn_welcome", name: "New member welcome", status: "active", entered: 12840, completed: 9310, updatedAt: daysAgo(2),
    nodes: [
      { id: "n1", kind: "trigger", title: "User signs up", detail: "Joins Fockis from any app" },
      { id: "n2", kind: "wait", title: "Wait 1 day", detail: "Delay 24 hours" },
      { id: "n3", kind: "email", title: "Send welcome email", detail: "Template: Welcome to Fockis" },
      { id: "n4", kind: "wait", title: "Wait 3 days", detail: "Delay 72 hours" },
      {
        id: "n5", kind: "condition", title: "Opened email?", detail: "Opened the welcome email",
        yes: [{ id: "n6", kind: "email", title: "Send marketplace recommendations", detail: "Template: Marketplace promotion" }],
        no: [{ id: "n7", kind: "email", title: "Send reminder", detail: "Template: Clean minimal" }],
      },
      {
        id: "n8", kind: "purchase", title: "Purchased?", detail: "Any marketplace order in 7 days",
        yes: [{ id: "n9", kind: "email", title: "Send thank you", detail: "Template: Order receipt" }, { id: "n10", kind: "tag", title: "Tag as buyer", detail: "Adds tag “Buyer”" }],
        no: [{ id: "n11", kind: "email", title: "Send promotion", detail: "Template: Premium upgrade" }],
      },
    ],
  },
  {
    id: "jrn_seller", name: "Seller activation", status: "active", entered: 2310, completed: 1640, updatedAt: daysAgo(6),
    nodes: [
      { id: "s1", kind: "trigger", title: "Opens a marketplace store", detail: "Fockis Marketplace event" },
      { id: "s2", kind: "email", title: "Send setup checklist", detail: "Template: New seller campaign" },
      { id: "s3", kind: "wait", title: "Wait 2 days", detail: "Delay 48 hours" },
      { id: "s4", kind: "event", title: "Listed first product?", detail: "Fockis Marketplace event", yes: [{ id: "s5", kind: "sms", title: "Send congrats SMS", detail: "SMS template: Seller live" }], no: [{ id: "s6", kind: "email", title: "Send listing tips", detail: "Template: Clean minimal" }] },
      { id: "s7", kind: "webhook", title: "Notify seller success team", detail: "POST /hooks/seller-activated" },
    ],
  },
  {
    id: "jrn_winback", name: "Lapsed buyer winback", status: "paused", entered: 4410, completed: 2010, updatedAt: daysAgo(13),
    nodes: [
      { id: "w1", kind: "audience", title: "Enters segment", detail: "Lapsed customers" },
      { id: "w2", kind: "email", title: "Send “we miss you”", detail: "Template: Bold modern" },
      { id: "w3", kind: "wait", title: "Wait 5 days", detail: "Delay 120 hours" },
      { id: "w4", kind: "purchase", title: "Purchased?", detail: "Any order", yes: [{ id: "w5", kind: "tag", title: "Remove lapsed tag", detail: "Removes “Lapsed”" }], no: [{ id: "w6", kind: "email", title: "Send coupon", detail: "Template: Product launch" }] },
    ],
  },
];

// ---------------------------------------------------------------------------
// Forms, landing pages, media
// ---------------------------------------------------------------------------

export const mockForms: Seed<SignupForm>[] = [
  {
    id: "frm_newsletter", name: "Newsletter signup", audienceId: "aud_all", display: "inline",
    title: "Get the best of Fockis weekly", description: "New Waves, marketplace finds, and creator stories.",
    submitLabel: "Subscribe", submissions: 4820, conversionRate: 6.8, updatedAt: daysAgo(4),
    fields: [
      { id: "f1", type: "email", label: "Email", placeholder: "you@example.com", required: true, options: [] },
      { id: "f2", type: "first_name", label: "First name", placeholder: "Your first name", required: false, options: [] },
      { id: "f3", type: "consent", label: "I agree to receive marketing emails from Fockis.", placeholder: "", required: true, options: [] },
    ],
  },
  {
    id: "frm_seller", name: "Seller waitlist", audienceId: "aud_sellers", display: "landing",
    title: "Sell on Fockis Marketplace", description: "Join the waitlist and we'll help you open your store.",
    submitLabel: "Join waitlist", submissions: 1240, conversionRate: 12.4, updatedAt: daysAgo(11),
    fields: [
      { id: "f1", type: "first_name", label: "First name", placeholder: "", required: true, options: [] },
      { id: "f2", type: "email", label: "Email", placeholder: "", required: true, options: [] },
      { id: "f3", type: "dropdown", label: "What will you sell?", placeholder: "", required: false, options: ["Fashion", "Home", "Art", "Services", "Other"] },
    ],
  },
  {
    id: "frm_popup", name: "Shop popup — 10% off", audienceId: "aud_buyers", display: "popup",
    title: "Take 10% off your first order", description: "Join our list and get a code instantly.",
    submitLabel: "Get my code", submissions: 2960, conversionRate: 4.1, updatedAt: daysAgo(2),
    fields: [{ id: "f1", type: "email", label: "Email", placeholder: "you@example.com", required: true, options: [] }],
  },
];

export const mockLandingPages: Seed<LandingPage>[] = [
  { id: "lp_sellers", name: "Become a seller", slug: "sell", status: "published", visits: 18420, signups: 1240, updatedAt: daysAgo(11), accent: "#0e9f6e",
    sections: [
      { id: "s1", kind: "hero", heading: "Open your store on Fockis", body: "Reach millions of people who already love buying from independent sellers.", buttonLabel: "Start selling" },
      { id: "s2", kind: "features", heading: "Everything you need", body: "Payments, shipping labels, and a storefront in minutes.", buttonLabel: "" },
      { id: "s3", kind: "form", heading: "Join the waitlist", body: "We'll reach out within 48 hours.", buttonLabel: "Join waitlist" },
    ] },
  { id: "lp_premium", name: "Premium autumn offer", slug: "premium-autumn", status: "published", visits: 32010, signups: 2140, updatedAt: daysAgo(14), accent: "#c98a04",
    sections: [
      { id: "s1", kind: "hero", heading: "Premium, 30% off", body: "Ad-free Waves, bigger uploads, and creator tools.", buttonLabel: "Upgrade now" },
      { id: "s2", kind: "testimonial", heading: "Loved by creators", body: "“Premium paid for itself in a week.” — a Fockis creator", buttonLabel: "" },
      { id: "s3", kind: "cta", heading: "Offer ends Sunday", body: "", buttonLabel: "Upgrade now" },
    ] },
  { id: "lp_academy", name: "Academy winter courses", slug: "academy-winter", status: "draft", visits: 0, signups: 0, updatedAt: daysAgo(1), accent: "#4f46e5",
    sections: [{ id: "s1", kind: "hero", heading: "Learn something new this winter", body: "Courses from Fockis Academy instructors.", buttonLabel: "Browse courses" }] },
  { id: "lp_summer", name: "Summer travel deals", slug: "summer-travel", status: "archived", visits: 9200, signups: 610, updatedAt: daysAgo(70), accent: "#d97706",
    sections: [{ id: "s1", kind: "hero", heading: "Summer getaways", body: "Weekend trips from Fockis Travel.", buttonLabel: "See deals" }] },
];

const SWATCHES = ["#dbe6ff", "#d9f3e8", "#fde9cf", "#efe0ff", "#ffe0ea", "#d6f1f6", "#e7eaf0"];
export const mockMedia: Seed<MediaAsset>[] = [
  ["fall-hero.jpg", "image", "Campaigns", 820, 1200, 600],
  ["marketplace-grid.jpg", "image", "Campaigns", 640, 1200, 1200],
  ["fockis-logo.svg", "logo", "Brand", 12, 512, 512],
  ["fockis-logo-white.svg", "logo", "Brand", 12, 512, 512],
  ["creator-night.mp4", "video", "Events", 48200, 1920, 1080],
  ["seller-guide.pdf", "document", "Guides", 2140],
  ["premium-banner.png", "image", "Campaigns", 410, 1200, 400],
  ["lisbon-weekend.jpg", "image", "Travel", 960, 1600, 900],
  ["academy-cover.jpg", "image", "Academy", 530, 1200, 630],
  ["waves-teaser.mp4", "video", "Waves", 23100, 1080, 1920],
  ["brand-guidelines.pdf", "document", "Brand", 5120],
  ["holiday-pattern.png", "image", "Seasonal", 220, 800, 800],
].map(([name, kind, folder, size, w, h], i) => ({
  id: `med_${i + 1}`,
  name: String(name),
  kind: kind as MediaAsset["kind"],
  folder: String(folder),
  url: `https://cdn.fockis.com/marketing/demo/${String(name)}`,
  sizeKb: Number(size),
  width: w === undefined ? undefined : Number(w),
  height: h === undefined ? undefined : Number(h),
  uploadedAt: daysAgo(i * 6 + 1),
  swatch: SWATCHES[i % SWATCHES.length],
}));

// ---------------------------------------------------------------------------
// Analytics series
// ---------------------------------------------------------------------------

function series(name: string, length: number, base: number, drift: number, noise: number, labels: string[]): ChartSeries {
  let v = base;
  return {
    name,
    points: Array.from({ length }, (_, i) => {
      v = Math.max(0, v + drift + (rand() - 0.5) * noise);
      return { label: labels[i], value: Math.round(v * 10) / 10 };
    }),
  };
}

export function dayLabels(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(DEMO_NOW.getTime() - (count - 1 - i) * 86400000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

export function buildDashboard(days: number): DashboardSummary {
  const labels = dayLabels(days);
  const scale = days / 30;
  return {
    metrics: [
      { key: "contacts", label: "Total contacts", value: 48210, format: "number", changePct: 12.4, sparkline: [40, 41, 42, 42.8, 44, 45.2, 46.1, 47, 48.2] },
      { key: "audiences", label: "Active audiences", value: 10, format: "number", changePct: 0, sparkline: [8, 8, 9, 9, 9, 10, 10, 10, 10] },
      { key: "sent", label: "Campaigns sent", value: Math.round(24 * scale) || 1, format: "number", changePct: 8.3, sparkline: [3, 4, 2, 5, 3, 6, 4, 5, 6] },
      { key: "open", label: "Open rate", value: 38.6, format: "percent", changePct: 2.4, sparkline: [35, 36, 34, 37, 38, 36, 39, 38, 38.6] },
      { key: "click", label: "Click rate", value: 6.1, format: "percent", changePct: -0.8, sparkline: [6.6, 6.4, 6.5, 6.2, 6.3, 6.0, 6.2, 6.1, 6.1] },
      { key: "revenue", label: "Revenue", value: Math.round(118420 * scale), format: "currency", changePct: 18.9, sparkline: [60, 72, 70, 84, 90, 96, 104, 110, 118] },
      { key: "unsubs", label: "Unsubscribes", value: Math.round(312 * scale), format: "number", changePct: -2.1, invert: true, sparkline: [14, 12, 13, 11, 12, 10, 11, 10, 10] },
      { key: "conversion", label: "Conversion rate", value: 3.4, format: "percent", changePct: 0.6, sparkline: [3.0, 3.1, 3.1, 3.2, 3.3, 3.2, 3.4, 3.3, 3.4] },
    ],
    performance: [series("Open rate", days, 36, 0.05, 6, labels), series("Click rate", days, 6, 0, 2, labels)],
    opens: [series("Opens", days, 5200, 20, 2400, labels)],
    clicks: [series("Clicks", days, 820, 4, 380, labels)],
    revenue: [series("Revenue", days, 3200, 30, 2200, labels)],
    subscriberGrowth: [series("Subscribers", days, 44800, 120, 140, labels)],
    conversions: [series("Conversions", days, 110, 1, 50, labels)],
    activity: [
      { id: "a1", icon: "send", text: "“Welcome to Fockis” is sending to 1,240 new members", at: daysAgo(0.05) },
      { id: "a2", icon: "cart", text: "Abandoned cart automation recovered $1,280 today", at: daysAgo(0.2) },
      { id: "a3", icon: "user", text: "312 contacts joined from Fockis signup", at: daysAgo(0.4) },
      { id: "a4", icon: "form", text: "“Shop popup — 10% off” collected 96 signups", at: daysAgo(0.9) },
      { id: "a5", icon: "alert", text: "Winback campaign paused after an unsubscribe spike", at: daysAgo(1.2) },
      { id: "a6", icon: "flow", text: "Seller activation journey reached 1,640 completions", at: daysAgo(2) },
    ],
    recommendations: [
      { id: "r1", title: "Re-engage 4,410 lapsed buyers", body: "Your winback journey is paused. Review the content and resume it.", actionLabel: "Review journey", actionPath: "journeys" },
      { id: "r2", title: "Verify your sending domain", body: "news.fockis.com still needs a DMARC record to protect deliverability.", actionLabel: "Open domain settings", actionPath: "settings?section=domains" },
      { id: "r3", title: "Test your Premium subject line", body: "Premium emails open 4 points below average. An A/B test can show what lands.", actionLabel: "Create A/B test", actionPath: "ab-testing" },
    ],
  };
}

export function buildAnalytics(days: number): AnalyticsOverview {
  const labels = dayLabels(days);
  return {
    metrics: [
      { key: "contacts", label: "Contacts", value: 48210, format: "number", changePct: 12.4, sparkline: [40, 42, 44, 45, 47, 48] },
      { key: "growth", label: "Net growth", value: 5240, format: "number", changePct: 9.1, sparkline: [3, 4, 4.4, 4.8, 5, 5.2] },
      { key: "engagement", label: "Engagement rate", value: 41.8, format: "percent", changePct: 1.9, sparkline: [38, 39, 40, 41, 41, 41.8] },
      { key: "conversions", label: "Conversions", value: 3920, format: "number", changePct: 6.5, sparkline: [3, 3.2, 3.5, 3.6, 3.8, 3.9] },
      { key: "revenue", label: "Revenue", value: 248600, format: "currency", changePct: 18.9, sparkline: [150, 170, 190, 210, 230, 248] },
      { key: "clv", label: "Customer lifetime value", value: 184, format: "currency", changePct: 4.2, sparkline: [170, 172, 175, 178, 181, 184] },
      { key: "roi", label: "Campaign ROI", value: 3820, format: "percent", changePct: 7.7, sparkline: [3200, 3400, 3500, 3600, 3700, 3820] },
    ],
    audienceGrowth: [series("Total contacts", days, 43000, 160, 120, labels), series("Subscribed", days, 39000, 140, 110, labels)],
    revenue: [series("Email revenue", days, 6400, 40, 2600, labels), series("Automation revenue", days, 3400, 30, 1400, labels)],
    conversion: [series("Conversion rate", days, 3.0, 0.01, 0.6, labels)],
    engagement: [series("Opens", days, 40, 0.02, 5, labels), series("Clicks", days, 6.2, 0, 1.6, labels)],
    customerActivity: [
      { label: "Opened an email", value: 18620 },
      { label: "Clicked a link", value: 6240 },
      { label: "Visited marketplace", value: 9810 },
      { label: "Watched a Wave", value: 15800 },
      { label: "Purchased", value: 3920 },
    ],
    audienceMix: mockAudiences.slice(1, 7).map((a) => ({ label: a.name, value: a.contactCount })),
  };
}

// ---------------------------------------------------------------------------
// A/B tests, transactional, SMS, social
// ---------------------------------------------------------------------------

export const mockABTests: Seed<ABTest>[] = [
  {
    id: "ab_premium", name: "Premium upgrade subject line", variable: "subject", status: "running", testSizePct: 20, winnerMetric: "open_rate", startedAt: daysAgo(1),
    variants: [
      { key: "A", label: "Variant A", value: "Premium is 30% off this week", recipients: 4821, openRate: 33.1, clickRate: 4.0, conversionRate: 1.9, revenue: 6120 },
      { key: "B", label: "Variant B", value: "Your Fockis, without limits", recipients: 4820, openRate: 34.4, clickRate: 4.3, conversionRate: 2.1, revenue: 6480 },
    ],
  },
  {
    id: "ab_sendtime", name: "Newsletter send time", variable: "send_time", status: "completed", testSizePct: 30, winnerMetric: "click_rate", startedAt: daysAgo(20),
    variants: [
      { key: "A", label: "Variant A", value: "Tuesday 9:00 AM", recipients: 7230, openRate: 29.6, clickRate: 5.0, conversionRate: 1.4, revenue: 2210 },
      { key: "B", label: "Variant B", value: "Thursday 7:00 PM", recipients: 7231, openRate: 31.2, clickRate: 5.4, conversionRate: 1.6, revenue: 2490 },
    ],
  },
  {
    id: "ab_from", name: "Seller onboarding from name", variable: "from_name", status: "draft", testSizePct: 50, winnerMetric: "click_rate",
    variants: [
      { key: "A", label: "Variant A", value: "Fockis Marketplace", recipients: 0, openRate: 0, clickRate: 0, conversionRate: 0, revenue: 0 },
      { key: "B", label: "Variant B", value: "Ama from Fockis", recipients: 0, openRate: 0, clickRate: 0, conversionRate: 0, revenue: 0 },
    ],
  },
];

export const mockTransactional: Seed<TransactionalTemplate>[] = [
  { id: "tx_order", name: "Order confirmation", event: "order.created", status: "active", sent: 42180, delivered: 42011, failed: 169, updatedAt: daysAgo(12) },
  { id: "tx_reset", name: "Password reset", event: "auth.password_reset", status: "active", sent: 9120, delivered: 9101, failed: 19, updatedAt: daysAgo(40) },
  { id: "tx_welcome", name: "Welcome", event: "user.created", status: "active", sent: 12840, delivered: 12790, failed: 50, updatedAt: daysAgo(2) },
  { id: "tx_verify", name: "Email verification", event: "auth.verify_email", status: "active", sent: 13920, delivered: 13861, failed: 59, updatedAt: daysAgo(40) },
  { id: "tx_receipt", name: "Receipt", event: "payment.succeeded", status: "active", sent: 38610, delivered: 38512, failed: 98, updatedAt: daysAgo(8) },
  { id: "tx_subscription", name: "Subscription", event: "subscription.updated", status: "active", sent: 6230, delivered: 6214, failed: 16, updatedAt: daysAgo(19) },
  { id: "tx_marketplace", name: "Marketplace notification", event: "marketplace.order_shipped", status: "paused", sent: 21040, delivered: 20880, failed: 160, updatedAt: daysAgo(3) },
  { id: "tx_seller", name: "Seller notification", event: "seller.new_order", status: "draft", sent: 0, delivered: 0, failed: 0, updatedAt: daysAgo(1) },
];

export const mockSmsCampaigns: Seed<SmsCampaign>[] = [
  { id: "sms_flash", name: "Flash sale reminder", message: "Fockis: Flash sale ends at midnight. Shop now: fockis.com/s/flash Reply STOP to opt out.", status: "sent", recipients: 6210, delivered: 6102, clicks: 812 },
  { id: "sms_event", name: "Creator Night tonight", message: "Creator Night starts at 7pm on Fockis Live. Join: fockis.com/live Reply STOP to opt out.", status: "scheduled", recipients: 3120, delivered: 0, clicks: 0, scheduledAt: daysAhead(2) },
  { id: "sms_cart", name: "Cart nudge", message: "Still thinking it over? Your cart is saved: fockis.com/cart Reply STOP to opt out.", status: "draft", recipients: 0, delivered: 0, clicks: 0 },
];

export const mockSocialCampaigns: Seed<SocialCampaign>[] = [
  { id: "soc_fall", name: "Fall marketplace picks", networks: ["fockis", "instagram", "facebook"], content: "Fall is here, and so are our sellers' best pieces. Shop the collection on Fockis.", mediaIds: ["med_1"], audience: "marketplace_buyers", status: "published", reach: 84200, engagement: 6.4 },
  { id: "soc_creator", name: "Creator Night promo", networks: ["fockis", "tiktok"], content: "Creator Night is this Friday. Bring your questions, your ideas, and your friends.", mediaIds: ["med_5"], audience: "creators", status: "scheduled", scheduledAt: daysAhead(3), reach: 0, engagement: 0 },
  { id: "soc_premium", name: "Premium autumn offer", networks: ["instagram", "facebook"], content: "Premium is 30% off this week only.", mediaIds: ["med_7"], audience: "fockis_users", status: "draft", reach: 0, engagement: 0 },
];

// ---------------------------------------------------------------------------
// Integrations & settings
// ---------------------------------------------------------------------------

export const mockIntegrations: Seed<MarketingIntegration>[] = [
  { id: "int_mailchimp", name: "Mailchimp", category: "email", description: "Sync audiences and send through your Mailchimp account.", connected: true, monogram: "Mc", color: "#c98a04", connectedAccount: "Audience configured via VITE_MAILCHIMP_AUDIENCE_ID", lastSyncAt: daysAgo(0.1) },
  { id: "int_stripe", name: "Stripe", category: "payments", description: "Attribute revenue from payments to campaigns.", connected: true, monogram: "St", color: "#635bff", connectedAccount: "Fockis payments", lastSyncAt: daysAgo(0.02) },
  { id: "int_google", name: "Google", category: "developer", description: "Analytics tracking and Google sign-in for forms.", connected: false, monogram: "G", color: "#1a73e8" },
  { id: "int_meta", name: "Meta", category: "social", description: "Publish to Facebook pages and sync custom audiences.", connected: false, monogram: "Me", color: "#0866ff" },
  { id: "int_instagram", name: "Instagram", category: "social", description: "Schedule posts and reels from social campaigns.", connected: true, monogram: "Ig", color: "#e0598b", connectedAccount: "@fockis", lastSyncAt: daysAgo(0.5) },
  { id: "int_tiktok", name: "TikTok", category: "social", description: "Publish short videos alongside Fockis Waves.", connected: false, monogram: "Tt", color: "#14213d" },
  { id: "int_shopify", name: "Shopify", category: "commerce", description: "Import products and orders from a Shopify store.", connected: false, monogram: "Sh", color: "#5e8e3e" },
  { id: "int_marketplace", name: "Fockis Marketplace", category: "fockis", description: "Products, orders, carts, and seller events.", connected: true, monogram: "Fm", color: "#1f5eff", connectedAccount: "Native", lastSyncAt: daysAgo(0.01) },
  { id: "int_users", name: "Fockis Users", category: "fockis", description: "Profiles, follows, posts, Waves, and Premium status.", connected: true, monogram: "Fu", color: "#1f5eff", connectedAccount: "Native", lastSyncAt: daysAgo(0.01) },
  { id: "int_webhooks", name: "Webhooks", category: "developer", description: "Send marketing events to your own endpoints.", connected: false, monogram: "Wh", color: "#475569" },
];

export const mockDomains: Seed<SendingDomain>[] = [
  { id: "dom_1", domain: "fockis.com", verified: true, dkim: "valid", spf: "valid", dmarc: "valid", addedAt: daysAgo(400) },
  { id: "dom_2", domain: "news.fockis.com", verified: true, dkim: "valid", spf: "valid", dmarc: "missing", addedAt: daysAgo(30) },
  { id: "dom_3", domain: "shop.fockis.com", verified: false, dkim: "pending", spf: "pending", dmarc: "missing", addedAt: daysAgo(1) },
];

export const mockSettings: MarketingSettings = {
  accountName: "Fockis Marketing",
  companyName: "Fockis Inc.",
  timezone: "America/New_York",
  defaultAudienceId: "aud_all",
  doubleOptIn: true,
  fromName: "Fockis",
  fromEmail: "hello@fockis.com",
  replyTo: "support@fockis.com",
  footer: "Fockis Inc. · Columbus, Ohio",
  unsubscribeMessage: "You've been unsubscribed. You can rejoin any time from your Fockis settings.",
  oneClickUnsubscribe: true,
  dailySendLimit: 250000,
  sendWindowStart: "08:00",
  sendWindowEnd: "20:00",
  trackOpens: true,
  trackClicks: true,
  trackEcommerce: true,
  notifyOnSend: true,
  notifyWeeklyDigest: true,
  notifyOnUnsubscribeSpike: true,
  twoFactorRequired: false,
  plan: "Growth (demo)",
  monthlyContactLimit: 100000,
};
