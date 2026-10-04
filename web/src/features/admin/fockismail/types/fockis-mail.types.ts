import type { BusinessType } from "./platform.types";







// ============================================================================



// FOCKIS MARKETING — DOMAIN TYPES



// Every entity used by the marketing module is declared here so mock services



// and real API services share one contract.



// ============================================================================







export type ID = string;







/** Seed/demo records before the per-business store assigns an owner. */



export type Seed<T> = Omit<T, "businessId">;



export type ISODate = string;







export type DateRangePreset = "today" | "7d" | "30d" | "90d" | "custom";







export interface DateRange {



  preset: DateRangePreset;



  from?: ISODate;



  to?: ISODate;



}







// ---------------------------------------------------------------------------



// Fockis-specific audience concepts



// ---------------------------------------------------------------------------







export type FockisAudienceType =



  | "fockis_users"



  | "marketplace_buyers"



  | "marketplace_sellers"



  | "businesses"



  | "creators"



  | "premium_users"



  | "church_organizations"



  | "travel_customers"



  | "academy_students"



  | "music_users";







export type FockisBehaviorFilter =



  | "has_purchased"



  | "has_not_purchased"



  | "has_posted"



  | "has_followed"



  | "has_liked"



  | "has_commented"



  | "has_watched_waves"



  | "has_created_business"



  | "has_marketplace_store"



  | "has_premium"



  | "inactive";







// ---------------------------------------------------------------------------



// Campaigns



// ---------------------------------------------------------------------------







export type CampaignType =



  | "regular"



  | "automated"



  | "ab_test"



  | "plain_text"



  | "product_promotion"



  | "newsletter"



  | "announcement"



  | "event"



  | "welcome"



  | "abandoned_cart"



  | "winback"



  | "transactional";







export type CampaignStatus =



  | "draft"



  | "scheduled"



  | "sending"



  | "sent"



  | "paused"



  | "archived";







export interface CampaignStats {



  recipients: number;



  delivered: number;



  opens: number;



  uniqueOpens: number;



  clicks: number;



  uniqueClicks: number;



  bounces: number;



  unsubscribes: number;



  spamComplaints: number;



  conversions: number;



  revenue: number;



}







export interface Campaign {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  description?: string;



  subject: string;



  previewText?: string;



  fromName: string;



  fromEmail: string;



  replyTo: string;



  type: CampaignType;



  status: CampaignStatus;



  audienceId: ID;



  segmentId?: ID;



  tagIds: ID[];



  /** Fockis behavior filters applied on top of the audience/segment. */



  fockisFilters?: FockisBehaviorFilter[];



  createdAt: ISODate;



  scheduledAt?: ISODate;



  sentAt?: ISODate;



  stats: CampaignStats;



  content?: EmailDocument;



}







export interface CampaignDraftInput {



  name: string;



  description: string;



  type: CampaignType;



  fromName: string;



  fromEmail: string;



  replyTo: string;



  subject: string;



  previewText: string;



  audienceId: ID;



  segmentId: ID;



  tagIds: ID[];



  fockisFilters: FockisBehaviorFilter[];



  content: EmailDocument;



}







export interface CampaignFilters {



  status?: CampaignStatus | "all";



  type?: CampaignType | "all";



  audienceId?: ID | "all";



  search?: string;



  performance?: "all" | "high" | "average" | "low";



}







// ---------------------------------------------------------------------------



// Audiences, contacts, segments, tags



// ---------------------------------------------------------------------------







export interface Audience {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  /****** Set for Fockis-platform audiences; client businesses leave it empty. *****/



  fockisType?: FockisAudienceType;



  contactCount: number;



  createdAt: ISODate;



  growthPct: number;



}







export type ContactStatus =



  | "subscribed"



  | "unsubscribed"



  | "cleaned"



  | "pending";







export type ContactSource =



  | "fockis_signup"



  | "marketplace"



  | "import"



  | "form"



  | "api"



  | "manual"



  | "landing_page";







export interface ContactActivity {



  id: ID;



  kind:



    | "opened"



    | "clicked"



    | "purchased"



    | "subscribed"



    | "visited"



    | "tagged"



    | "posted"



    | "followed";



  label: string;



  at: ISODate;



}







export interface ContactPurchase {



  id: ID;



  product: string;



  amount: number;



  at: ISODate;



}







export interface Contact {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  firstName: string;



  lastName: string;



  email: string;



  phone?: string;



  location: string;



  status: ContactStatus;



  tagIds: ID[];



  source: ContactSource;



  audienceIds: ID[];



  joinedAt: ISODate;



  lastActivityAt: ISODate;



  revenue: number;



  orderCount: number;



  vip: boolean;



  customFields: Record<string, string>;



  activity: ContactActivity[];



  purchases: ContactPurchase[];



}







export interface ContactInput {



  firstName: string;



  lastName: string;



  email: string;



  phone: string;



  location: string;



  status: ContactStatus;



  tagIds: ID[];



}







export type SegmentField =



  | "email"



  | "first_name"



  | "last_name"



  | "location"



  | "signup_date"



  | "last_activity"



  | "campaign_opened"



  | "campaign_clicked"



  | "purchase_amount"



  | "product_purchased"



  | "order_count"



  | "vip_status"



  | "tags"



  | "fockis_audience"



  | "fockis_behavior";







export type SegmentOperator =



  | "contains"



  | "equals"



  | "not_equals"



  | "starts_with"



  | "greater_than"



  | "less_than"



  | "before"



  | "after"



  | "is"



  | "is_not";







export interface SegmentCondition {



  id: ID;



  field: SegmentField;



  operator: SegmentOperator;



  value: string;



}







export interface Segment {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  match: "all" | "any";



  conditions: SegmentCondition[];



  contactCount: number;



  createdAt: ISODate;



  updatedAt: ISODate;



}







export interface Tag {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  color: string;



  contactCount: number;



  createdAt: ISODate;



  lastUsedAt: ISODate;



}







// ---------------------------------------------------------------------------



// Email builder



// ---------------------------------------------------------------------------







export type EmailBlockType =



  | "text"



  | "heading"



  | "image"



  | "button"



  | "divider"



  | "spacer"



  | "video"



  | "social"



  | "logo"



  | "product"



  | "product_grid"



  | "coupon"



  | "countdown"



  | "columns"



  | "footer";







export type TextAlign = "left" | "center" | "right";







export interface EmailBlockStyle {



  fontFamily: string;



  fontSize: number;



  color: string;



  align: TextAlign;



  paddingY: number;



  paddingX: number;



  background: string;



  borderWidth: number;



  borderColor: string;



  borderRadius: number;



  buttonColor: string;



  buttonTextColor: string;



}







export interface EmailProduct {



  name: string;



  price: string;



  imageUrl: string;



  url: string;



}







export interface EmailBlock {



  id: ID;



  type: EmailBlockType;



  text: string;



  url: string;



  imageUrl: string;



  height: number;



  products: EmailProduct[];



  code: string;



  endsAt: string;



  columns: [string, string];



  style: EmailBlockStyle;



}







export interface EmailDocument {



  background: string;



  contentWidth: number;



  blocks: EmailBlock[];



}







export type TemplateCategory =



  | "newsletter"



  | "welcome"



  | "promotion"



  | "product"



  | "event"



  | "announcement"



  | "transactional"



  | "minimal"



  | "modern"



  | "social"



  | "fockis_marketplace"



  | "small_business";







export interface EmailTemplate {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  category: TemplateCategory;



  description: string;



  fockisSpecific: boolean;



  /****** Business types this template suits; empty = any. *****/



  businessTypes?: BusinessType[];



  accent: string;



  updatedAt: ISODate;



  usageCount: number;



  document: EmailDocument;



}







// ---------------------------------------------------------------------------



// Automations & journeys



// ---------------------------------------------------------------------------







export type AutomationStatus = "active" | "paused" | "draft";







export interface Automation {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  trigger: string;



  status: AutomationStatus;



  contacts: number;



  emails: number;



  conversionRate: number;



  revenue: number;



  updatedAt: ISODate;



  journeyId?: ID;



}







export type JourneyNodeKind =



  | "trigger"



  | "email"



  | "wait"



  | "condition"



  | "tag"



  | "webhook"



  | "sms"



  | "audience"



  | "purchase"



  | "event";







export interface JourneyNodeData {



  id: ID;



  kind: JourneyNodeKind;



  title: string;



  detail: string;



  /** For condition nodes, children are split into yes/no branches. */



  yes?: JourneyNodeData[];



  no?: JourneyNodeData[];



}







export interface Journey {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  status: AutomationStatus;



  entered: number;



  completed: number;



  updatedAt: ISODate;



  nodes: JourneyNodeData[];



}







// ---------------------------------------------------------------------------



// Forms, landing pages, media



// ---------------------------------------------------------------------------







export type FormFieldType =



  | "first_name"



  | "last_name"



  | "email"



  | "phone"



  | "birthday"



  | "address"



  | "custom"



  | "checkbox"



  | "dropdown"



  | "radio"



  | "consent";







export interface FormField {



  id: ID;



  type: FormFieldType;



  label: string;



  placeholder: string;



  required: boolean;



  options: string[];



}







export type FormDisplay = "embed" | "popup" | "inline" | "landing";







export interface SignupForm {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  audienceId: ID;



  display: FormDisplay;



  title: string;



  description: string;



  submitLabel: string;



  fields: FormField[];



  submissions: number;



  conversionRate: number;



  updatedAt: ISODate;



}







export type LandingPageStatus = "draft" | "published" | "archived";







export interface LandingPageSection {



  id: ID;



  kind: "hero" | "features" | "form" | "testimonial" | "cta" | "products";



  heading: string;



  body: string;



  buttonLabel: string;



}







export interface LandingPage {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  slug: string;



  status: LandingPageStatus;



  visits: number;



  signups: number;



  updatedAt: ISODate;



  accent: string;



  sections: LandingPageSection[];



}







export type MediaKind = "image" | "video" | "logo" | "document";







export interface MediaAsset {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  kind: MediaKind;



  folder: string;



  url: string;



  sizeKb: number;



  width?: number;



  height?: number;



  uploadedAt: ISODate;



  /****** Used to render a local placeholder preview without remote assets. *****/



  swatch: string;



}







// ---------------------------------------------------------------------------



// Reports & analytics



// ---------------------------------------------------------------------------







export interface TimeSeriesPoint {



  label: string;



  value: number;



}







export interface ChartSeries {



  name: string;



  color?: string;



  points: TimeSeriesPoint[];



}







export interface BreakdownItem {



  label: string;



  value: number;



}







export interface LinkPerformance {



  url: string;



  clicks: number;



  uniqueClicks: number;



}







export interface CampaignReport {



  campaignId: ID;



  campaignName: string;



  sentAt: ISODate;



  stats: CampaignStats;



  opensOverTime: TimeSeriesPoint[];



  clicksOverTime: TimeSeriesPoint[];



  revenueOverTime: TimeSeriesPoint[];



  devices: BreakdownItem[];



  locations: BreakdownItem[];



  links: LinkPerformance[];



}







export interface AnalyticsMetric {



  key: string;



  label: string;



  value: number;



  format: "number" | "percent" | "currency";



  changePct: number;



  /****** Whether a decrease is good news (e.g., unsubscribes). *****/



  invert?: boolean;



  sparkline: number[];



}







export interface DashboardSummary {



  metrics: AnalyticsMetric[];



  performance: ChartSeries[];



  opens: ChartSeries[];



  clicks: ChartSeries[];



  revenue: ChartSeries[];



  subscriberGrowth: ChartSeries[];



  conversions: ChartSeries[];



  activity: ActivityItem[];



  recommendations: Recommendation[];



}







export interface ActivityItem {



  id: ID;



  icon: "send" | "user" | "cart" | "alert" | "flow" | "form";



  text: string;



  at: ISODate;



}







export interface Recommendation {



  id: ID;



  title: string;



  body: string;



  actionLabel: string;



  actionPath: string;



}







export interface AnalyticsOverview {



  metrics: AnalyticsMetric[];



  audienceGrowth: ChartSeries[];



  revenue: ChartSeries[];



  conversion: ChartSeries[];



  engagement: ChartSeries[];



  customerActivity: BreakdownItem[];



  audienceMix: BreakdownItem[];



}







// ---------------------------------------------------------------------------



// A/B testing



// ---------------------------------------------------------------------------







export type ABTestVariable = "subject" | "from_name" | "send_time" | "content";







export interface ABVariant {



  key: "A" | "B";



  label: string;



  value: string;



  recipients: number;



  openRate: number;



  clickRate: number;



  conversionRate: number;



  revenue: number;



}







export interface ABTest {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  variable: ABTestVariable;



  status: "draft" | "running" | "completed";



  testSizePct: number;



  winnerMetric: "open_rate" | "click_rate" | "conversion_rate" | "revenue";



  variants: [ABVariant, ABVariant];



  /****** Only set when a real backend has declared a statistically valid winner. *****/



  declaredWinner?: "A" | "B";



  startedAt?: ISODate;



}







// ---------------------------------------------------------------------------



// Transactional, SMS, social



// ---------------------------------------------------------------------------







export interface TransactionalTemplate {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  event: string;



  status: "active" | "paused" | "draft";



  sent: number;



  delivered: number;



  failed: number;



  updatedAt: ISODate;



}







export interface SmsCampaign {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  message: string;



  status: CampaignStatus;



  recipients: number;



  delivered: number;



  clicks: number;



  scheduledAt?: ISODate;



}







export type SocialNetwork = "facebook" | "instagram" | "tiktok" | "fockis";







export interface SocialCampaign {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  networks: SocialNetwork[];



  content: string;



  mediaIds: ID[];



  audience: FockisAudienceType;



  status: "draft" | "scheduled" | "published";



  scheduledAt?: ISODate;



  reach: number;



  engagement: number;



}







// ---------------------------------------------------------------------------



// Integrations & settings



// ---------------------------------------------------------------------------







export type IntegrationCategory =



  | "email"



  | "payments"



  | "social"



  | "commerce"



  | "fockis"



  | "developer";







export interface MarketingIntegration {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  name: string;



  category: IntegrationCategory;



  description: string;



  connected: boolean;



  monogram: string;



  color: string;



  connectedAccount?: string;



  lastSyncAt?: ISODate;



}







export interface SendingDomain {



  id: ID;



  /****** Owning business workspace. Enforced by the backend, not the UI. *****/



  businessId: ID;



  domain: string;



  verified: boolean;



  dkim: "valid" | "pending" | "missing";



  spf: "valid" | "pending" | "missing";



  dmarc: "valid" | "pending" | "missing";



  addedAt: ISODate;



}







export interface MarketingSettings {



  accountName: string;



  companyName: string;



  timezone: string;



  defaultAudienceId: ID;



  doubleOptIn: boolean;



  fromName: string;



  fromEmail: string;



  replyTo: string;



  footer: string;



  unsubscribeMessage: string;



  oneClickUnsubscribe: boolean;



  dailySendLimit: number;



  sendWindowStart: string;



  sendWindowEnd: string;



  trackOpens: boolean;



  trackClicks: boolean;



  trackEcommerce: boolean;



  notifyOnSend: boolean;



  notifyWeeklyDigest: boolean;



  notifyOnUnsubscribeSpike: boolean;



  twoFactorRequired: boolean;



  plan: string;



  monthlyContactLimit: number;



}







export interface Paginated<T> {



  items: T[];



  total: number;



}
