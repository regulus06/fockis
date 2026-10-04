// ============================================================================
// FOCKIS MARKETING PLATFORM — AGENCY, BUSINESS, APPLICATION & BILLING TYPES
// ============================================================================

// ----------------------------------------------------------------------------
// Shared platform types
// ----------------------------------------------------------------------------

export type ID = string;

export type ISODate = string;

export type CampaignType =
  | "email"
  | "sms"
  | "automation"
  | "newsletter"
  | "promotional"
  | "transactional";

// ----------------------------------------------------------------------------
// Businesses & workspaces
// ----------------------------------------------------------------------------

export type BusinessType =
  | "restaurant"
  | "retail"
  | "ecommerce"
  | "barbershop"
  | "salon"
  | "real_estate"
  | "construction"
  | "professional_services"
  | "consulting"
  | "gym_fitness"
  | "church_organization"
  | "creator"
  | "nonprofit"
  | "local_service"
  | "other";

export type BusinessStatus =
  | "active"
  | "onboarding"
  | "paused"
  | "archived";

export type MarketingGoal =
  | "more_customers"
  | "generate_leads"
  | "increase_sales"
  | "repeat_customers"
  | "build_email_list"
  | "promote_products"
  | "promote_services"
  | "increase_appointments"
  | "promote_events"
  | "grow_social"
  | "improve_retention"
  | "launch_product"
  | "launch_business"
  | "other";

export type ServiceKey =
  | "email_marketing"
  | "social_media"
  | "sms_marketing"
  | "advertising"
  | "lead_generation"
  | "marketing_automation"
  | "customer_retention"
  | "content_creation"
  | "landing_pages"
  | "analytics_reporting"
  | "ecommerce_marketing"
  | "local_marketing"
  | "campaign_management"
  | "promotions";

export type ServiceStatus =
  | "active"
  | "paused"
  | "not_included";

export interface BusinessHours {
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  open: string;
  close: string;
  closed: boolean;
}

export interface SocialLinks {
  website?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  fockis?: string;
}

export interface BusinessProfile {
  description: string;
  website: string;
  phone: string;
  email: string;
  address: string;
  serviceArea: string;
  hours: BusinessHours[];
  timezone: string;
  currency: string;
  brandColors: string[];
  brandFonts: string[];
  social: SocialLinks;
  goals: MarketingGoal[];
  defaultSenderName: string;
  defaultSenderEmail: string;
  replyToEmail: string;
}

export interface Business {
  id: ID;

  /** One marketing workspace per business today; kept separate for the future. */
  workspaceId: ID;

  name: string;
  type: BusinessType;
  status: BusinessStatus;

  /** Logo URL from the Fockis upload service or empty for a monogram. */
  logo: string;

  accent: string;

  /** The Fockis account itself is a workspace too, but not an agency client. */
  isAgencyOwner: boolean;

  /** Approximate audience size, used to scale demo data. */
  sizeHint: number;

  planId: ID;

  services: Record<ServiceKey, ServiceStatus>;

  profile: BusinessProfile;

  sourceApplicationId?: ID;

  createdAt: ISODate;
  lastActivityAt: ISODate;
}

export interface BusinessSummary {
  businessId: ID;
  contacts: number;
  campaigns: number;
  activeCampaigns: number;
  openRate: number;
  clickRate: number;
  revenue: number;
  emailsSent: number;
  leads: number;
  conversions: number;
}

// ----------------------------------------------------------------------------
// Agency team, tasks, approvals
// ----------------------------------------------------------------------------

export type TeamRole =
  | "owner"
  | "admin"
  | "marketing_manager"
  | "editor"
  | "analyst"
  | "viewer";

export interface TeamMember {
  id: ID;
  businessId: ID;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "invited";
  invitedAt: ISODate;
  lastActiveAt?: ISODate;
}

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "waiting"
  | "completed";

export type TaskPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export interface AgencyTask {
  id: ID;
  title: string;
  businessId: ID;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: ISODate;
  createdAt: ISODate;
}

export type ApprovalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "changes_requested"
  | "scheduled"
  | "sent";

export interface ApprovalComment {
  id: ID;
  author: string;
  side: "agency" | "client";
  body: string;
  at: ISODate;
}

export interface Approval {
  id: ID;
  businessId: ID;
  campaignName: string;
  campaignType: CampaignType;
  subject: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: ISODate;
  scheduledFor?: ISODate;
  comments: ApprovalComment[];
}

export interface AgencyActivity {
  id: ID;
  businessId: ID;
  text: string;
  at: ISODate;
}

export interface AgencySettings {
  agencyName: string;
  supportEmail: string;
  defaultPlanId: ID;
  requireClientApproval: boolean;
  autoCreateTasksOnConversion: boolean;
  defaultServices: ServiceKey[];
  notifyOnNewApplication: boolean;
  notifyOnLowCredits: boolean;
}

// ----------------------------------------------------------------------------
// Marketing applications
// ----------------------------------------------------------------------------

export type ApplicationStatus =
  | "NEW"
  | "UNDER_REVIEW"
  | "MORE_INFORMATION_NEEDED"
  | "APPROVED"
  | "REJECTED"
  | "CONVERTED_TO_CLIENT";

export type ContactMethod =
  | "email"
  | "phone"
  | "fockis_messages";

export type BudgetRange =
  | "under_250"
  | "250_500"
  | "500_1000"
  | "1000_2500"
  | "2500_plus"
  | "not_sure";

export type Timeline =
  | "asap"
  | "one_week"
  | "thirty_days"
  | "later";

export type MarketingChannel =
  | "email"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "google"
  | "website"
  | "sms"
  | "advertising"
  | "print"
  | "events"
  | "none"
  | "other";

export type IntegrationKey =
  | "fockis"
  | "shopify"
  | "stripe"
  | "google"
  | "facebook"
  | "instagram"
  | "tiktok"
  | "email_platform"
  | "crm"
  | "other";

export interface ApplicationUpload {
  id: ID;
  kind:
    | "logo"
    | "brand_guidelines"
    | "product_images"
    | "business_photos"
    | "marketing_materials";
  name: string;
  sizeKb: number;

  /** Local preview only until the backend upload service is connected. */
  previewUrl?: string;
}

export interface MarketingApplication {
  id: ID;

  /** Human-friendly reference shown to the applicant. */
  reference: string;

  business: {
    name: string;
    type: BusinessType;
    website: string;
    email: string;
    phone: string;
    address: string;
    serviceArea: string;
    description: string;
  };

  contact: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    preferredMethod: ContactMethod;
  };

  goals: MarketingGoal[];
  goalsDetail: string;
  services: ServiceKey[];

  products: {
    mainProducts: string;
    mainServices: string;
    bestSellers: string;
    newOfferings: string;
    currentPromotions: string;
    averagePurchase: string;
    advantages: string;
    notes: string;
  };

  targetCustomers: {
    idealCustomer: string;
    ageRange: string;
    location: string;
    customerType: string;
    market: "b2b" | "b2c" | "both";
    interests: string;
    additional: string;
  };

  currentMarketing: {
    channels: MarketingChannel[];
    whatWorked: string;
    whatDidNot: string;
    hasAgency: "yes" | "no" | "not_sure";
  };

  branding: {
    colors: string[];
    fonts: string;
    uploads: ApplicationUpload[];
  };

  budget: BudgetRange;
  currentAdSpend: string;
  timeline: Timeline;
  integrations: IntegrationKey[];

  status: ApplicationStatus;

  statusHistory: Array<{
    status: ApplicationStatus;
    at: ISODate;
    by: string;
    note?: string;
  }>;

  messages: ApplicationMessage[];

  convertedBusinessId?: ID;

  createdAt: ISODate;
  updatedAt: ISODate;
}

/** Draft shape used by the public form before an ID exists. */
export type ApplicationDraft = Omit<
  MarketingApplication,
  | "id"
  | "reference"
  | "status"
  | "statusHistory"
  | "messages"
  | "convertedBusinessId"
  | "createdAt"
  | "updatedAt"
>;

export interface ApplicationMessage {
  id: ID;

  /** client_visible messages are shared with the business; internal notes are not. */
  visibility: "client_visible" | "internal";

  kind:
    | "message"
    | "note"
    | "question"
    | "response";

  author: string;
  body: string;
  at: ISODate;
}

// ----------------------------------------------------------------------------
// Plans, credits, billing
// ----------------------------------------------------------------------------

export type BillingCycle =
  | "monthly"
  | "annual"
  | "one_time"
  | "custom";

export type PlanKind =
  | "standard"
  | "custom"
  | "promotional"
  | "enterprise"
  | "agency_managed";

export type PlanStatus =
  | "active"
  | "legacy"
  | "hidden";

export interface Money {
  /** Integer minor units (cents) to avoid float drift. */
  amount: number;
  currency: string;
}

export interface MarketingPlan {
  planId: ID;
  planName: string;
  kind: PlanKind;
  description: string;

  emailCreditsIncluded: number;
  smsCreditsIncluded: number;

  /** null = price supplied by sales/backend ("Contact us"). */
  price: Money | null;

  billingCycle: BillingCycle;

  features: string[];

  limits: {
    contacts: number | null;
    seats: number | null;
    workspaces: number | null;
  };

  status: PlanStatus;

  /** Lower rank = smaller plan. Used to label upgrade vs. downgrade. */
  rank: number;

  highlighted?: boolean;

  /** For custom/agency plans: which business it was created for. */
  businessId?: ID;

  /** Credits shown as "or more". */
  creditsAreMinimum?: boolean;
}

export type CreditChannel =
  | "email"
  | "sms";

export type CreditStatus =
  | "active"
  | "low"
  | "exhausted"
  | "suspended";

export interface CreditBalance {
  businessId: ID;
  workspaceId: ID;
  planId: ID;

  emailCreditsIncluded: number;
  emailCreditsRemaining: number;
  emailCreditsUsed: number;

  smsCreditsIncluded: number;
  smsCreditsRemaining: number;
  smsCreditsUsed: number;

  /** Purchased/promotional credits on top of the plan allotment. */
  emailCreditsBonus: number;
  smsCreditsBonus: number;

  billingCycle: BillingCycle;
  renewalDate: ISODate;

  status: CreditStatus;

  billingStatus:
    | "active"
    | "past_due"
    | "canceled"
    | "trialing";
}

export interface CreditPackage {
  packageId: ID;
  channel: CreditChannel;
  credits: number;

  /** null until the backend supplies a price. */
  price: Money | null;

  label?: string;
  bestValue?: boolean;

  status:
    | "active"
    | "hidden";
}

export type TransactionType =
  | "purchase"
  | "email_campaign"
  | "sms_campaign"
  | "automation"
  | "refund"
  | "adjustment"
  | "promotional"
  | "plan_renewal";

export interface CreditTransaction {
  id: ID;
  businessId: ID;
  workspaceId: ID;

  type: TransactionType;
  channel: CreditChannel;

  description: string;

  /** Positive = credits added, negative = consumed. */
  credits: number;

  amount?: Money;

  status:
    | "completed"
    | "pending"
    | "failed"
    | "refunded";

  referenceId?: ID;
  createdAt: ISODate;
}

export interface Invoice {
  id: ID;
  businessId: ID;
  number: string;
  description: string;
  amount: Money;

  status:
    | "paid"
    | "open"
    | "failed"
    | "refunded"
    | "void";

  issuedAt: ISODate;

  /** Hosted invoice URL from Stripe, supplied by the backend. */
  hostedUrl?: string;
}

export interface PaymentMethod {
  id: ID;
  businessId: ID;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BillingSettings {
  businessId: ID;
  billingEmail: string;
  companyName: string;
  taxId: string;
  address: string;

  autoRecharge: {
    enabled: boolean;
    channel: CreditChannel;
    threshold: number;
    packageId: ID;
  };

  lowCreditAlerts: boolean;
}

export interface CreditThresholds {
  /** Remaining/included at or below this fraction counts as low. */
  lowFraction: number;

  /** Absolute floor that always counts as low. */
  lowAbsolute: Record<
    CreditChannel,
    number
  >;
}

export type CreditLevel =
  | "normal"
  | "low"
  | "critical";

export interface CreditCheck {
  channel: CreditChannel;
  required: number;
  remaining: number;
  shortfall: number;
  sufficient: boolean;
  level: CreditLevel;
}

export interface UsagePoint {
  date: ISODate;
  email: number;
  sms: number;
}

export interface UsageBreakdown {
  label: string;

  kind:
    | "campaign"
    | "automation"
    | "client"
    | "channel";

  email: number;
  sms: number;
}

/** Returned by the backend when starting a Stripe Checkout session. */
export interface CheckoutSession {
  mode:
    | "redirect"
    | "mock";

  url?: string;
  sessionId: ID;
}

// ----------------------------------------------------------------------------
// Notifications & permissions
// ----------------------------------------------------------------------------

export type NotificationType =
  | "APPLICATION_SUBMITTED"
  | "APPLICATION_UNDER_REVIEW"
  | "APPLICATION_MORE_INFO"
  | "APPLICATION_APPROVED"
  | "APPLICATION_REJECTED"
  | "WORKSPACE_CREATED"
  | "LOW_EMAIL_CREDITS"
  | "LOW_SMS_CREDITS"
  | "EMAIL_CREDITS_EXHAUSTED"
  | "SMS_CREDITS_EXHAUSTED"
  | "PLAN_CHANGED"
  | "CREDIT_PURCHASE_COMPLETED"
  | "CAMPAIGN_SENT"
  | "APPROVAL_REQUESTED";

export interface MarketingNotification {
  id: ID;
  type: NotificationType;

  /** null = agency-level notification. */
  businessId: ID | null;

  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: ISODate;
}

export type Permission =
  | "agency.view"
  | "agency.manage_clients"
  | "agency.review_applications"
  | "billing.view"
  | "billing.purchase"
  | "billing.manage_client_credits"
  | "campaigns.send";

/** UI-only stand-in for the signed-in user. NOT a security boundary. */
export interface MarketingViewer {
  id: ID;
  name: string;

  role:
    | "agency_admin"
    | "agency_member"
    | "client_owner";

  permissions: Permission[];
}