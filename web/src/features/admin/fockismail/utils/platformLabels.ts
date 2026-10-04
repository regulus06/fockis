import type {
  ApplicationStatus,
  ApprovalStatus,
  BudgetRange,
  BusinessType,
  ContactMethod,
  IntegrationKey,
  MarketingChannel,
  MarketingGoal,
  NotificationType,
  ServiceKey,
  ServiceStatus,
  TaskPriority,
  TaskStatus,
  TeamRole,
  Timeline,
  TransactionType,
} from "../types/platform.types";
import type { Tone } from "./labels";

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  restaurant: "Restaurant",
  retail: "Retail",
  ecommerce: "E-commerce",
  barbershop: "Barbershop",
  salon: "Salon",
  real_estate: "Real estate",
  construction: "Construction",
  professional_services: "Professional services",
  consulting: "Consulting",
  gym_fitness: "Gym / fitness",
  church_organization: "Church / organization",
  creator: "Creator",
  nonprofit: "Nonprofit",
  local_service: "Local service",
  other: "Other",
};

export const GOAL_LABELS: Record<MarketingGoal, string> = {
  more_customers: "Get more customers",
  generate_leads: "Generate leads",
  increase_sales: "Increase sales",
  repeat_customers: "Increase repeat customers",
  build_email_list: "Build an email list",
  promote_products: "Promote products",
  promote_services: "Promote services",
  increase_appointments: "Increase appointments",
  promote_events: "Promote events",
  grow_social: "Grow social media",
  improve_retention: "Keep customers coming back",
  launch_product: "Launch a new product",
  launch_business: "Launch a new business",
  other: "Other",
};

export interface ServiceInfo {
  label: string;
  description: string;
}

/** Plain-language descriptions for business owners who aren't marketers. */
export const SERVICE_INFO: Record<ServiceKey, ServiceInfo> = {
  email_marketing: { label: "Email marketing", description: "Newsletters, offers, and updates sent to customers who signed up to hear from you." },
  social_media: { label: "Social media marketing", description: "Planning and posting on Fockis, Instagram, Facebook, and TikTok so people keep seeing you." },
  sms_marketing: { label: "SMS marketing", description: "Short text messages for reminders, flash sales, and time-sensitive news." },
  advertising: { label: "Advertising", description: "Paid ads that show your business to new people in your area or niche." },
  lead_generation: { label: "Lead generation", description: "Collecting contact details from people interested in what you offer, so you can follow up." },
  marketing_automation: { label: "Marketing automation", description: "Messages that send themselves, like a welcome email or a birthday offer." },
  customer_retention: { label: "Customer retention", description: "Bringing past customers back with reminders, rewards, and check-ins." },
  content_creation: { label: "Content creation", description: "Writing, photos, and graphics for your emails, posts, and pages." },
  landing_pages: { label: "Landing pages", description: "A simple web page for one offer or event, built to get sign-ups or bookings." },
  analytics_reporting: { label: "Analytics & reporting", description: "Clear monthly reports on what's working and what to change." },
  ecommerce_marketing: { label: "E-commerce marketing", description: "Product promotions, abandoned-cart reminders, and repeat-purchase offers for online stores." },
  local_marketing: { label: "Local business marketing", description: "Getting found by people nearby: local listings, reviews, and neighborhood offers." },
  campaign_management: { label: "Campaign management", description: "We plan, build, send, and adjust your campaigns for you." },
  promotions: { label: "Promotions", description: "Sales, coupons, and seasonal offers designed and announced for you." },
};

/** Services a business can request on the public form (promotions is agency-side). */
export const REQUESTABLE_SERVICES: ServiceKey[] = [
  "email_marketing", "social_media", "sms_marketing", "advertising", "lead_generation",
  "marketing_automation", "customer_retention", "content_creation", "landing_pages",
  "analytics_reporting", "ecommerce_marketing", "local_marketing", "campaign_management",
];

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = { active: "Active", paused: "Paused", not_included: "Not included" };
export const SERVICE_STATUS_TONES: Record<ServiceStatus, Tone> = { active: "green", paused: "amber", not_included: "neutral" };

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: "New",
  UNDER_REVIEW: "Under review",
  MORE_INFORMATION_NEEDED: "More information needed",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CONVERTED_TO_CLIENT: "Converted to client",
};

export const APPLICATION_STATUS_TONES: Record<ApplicationStatus, Tone> = {
  NEW: "blue",
  UNDER_REVIEW: "violet",
  MORE_INFORMATION_NEEDED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  CONVERTED_TO_CLIENT: "green",
};

/** Ordered path shown in the status timeline. */
export const APPLICATION_FLOW: ApplicationStatus[] = ["NEW", "UNDER_REVIEW", "APPROVED", "CONVERTED_TO_CLIENT"];

export const BUDGET_LABELS: Record<BudgetRange, string> = {
  under_250: "Under $250/month",
  "250_500": "$250–$500/month",
  "500_1000": "$500–$1,000/month",
  "1000_2500": "$1,000–$2,500/month",
  "2500_plus": "$2,500+/month",
  not_sure: "Not sure yet",
};

export const TIMELINE_LABELS: Record<Timeline, string> = {
  asap: "As soon as possible",
  one_week: "Within 1 week",
  thirty_days: "Within 30 days",
  later: "Planning for later",
};

export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = { email: "Email", phone: "Phone", fockis_messages: "Fockis Messages" };

export const CHANNEL_LABELS: Record<MarketingChannel, string> = {
  email: "Email", facebook: "Facebook", instagram: "Instagram", tiktok: "TikTok", google: "Google",
  website: "Website", sms: "SMS", advertising: "Advertising", print: "Print", events: "Events", none: "None yet", other: "Other",
};

export const INTEGRATION_LABELS: Record<IntegrationKey, { label: string; description: string }> = {
  fockis: { label: "Fockis", description: "Your Fockis business page, store, or profile" },
  shopify: { label: "Shopify", description: "Online store products and orders" },
  stripe: { label: "Stripe", description: "Payments, to measure revenue from marketing" },
  google: { label: "Google", description: "Business profile and Analytics" },
  facebook: { label: "Facebook", description: "Your Facebook page" },
  instagram: { label: "Instagram", description: "Your Instagram account" },
  tiktok: { label: "TikTok", description: "Your TikTok account" },
  email_platform: { label: "Existing email platform", description: "Mailchimp, Klaviyo, Constant Contact, or similar" },
  crm: { label: "CRM", description: "Customer records in HubSpot, Salesforce, or similar" },
  other: { label: "Other", description: "Anything else we should know about" },
};

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  marketing_manager: "Marketing manager",
  editor: "Editor",
  analyst: "Analyst",
  viewer: "Viewer",
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  owner: "Full access, including billing and deleting the workspace.",
  admin: "Manage everything except ownership.",
  marketing_manager: "Create, approve, and send campaigns and automations.",
  editor: "Create and edit drafts. Can't send.",
  analyst: "View reports and analytics only.",
  viewer: "Read-only access.",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = { todo: "To do", in_progress: "In progress", waiting: "Waiting", completed: "Completed" };
export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
export const TASK_PRIORITY_TONES: Record<TaskPriority, Tone> = { low: "neutral", medium: "blue", high: "amber", urgent: "red" };

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  changes_requested: "Changes requested",
  scheduled: "Scheduled",
  sent: "Sent",
};
export const APPROVAL_STATUS_TONES: Record<ApprovalStatus, Tone> = {
  draft: "neutral", pending_approval: "amber", approved: "green", changes_requested: "red", scheduled: "violet", sent: "blue",
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  purchase: "Purchase",
  email_campaign: "Email campaign",
  sms_campaign: "SMS campaign",
  automation: "Automation",
  refund: "Refund",
  adjustment: "Adjustment",
  promotional: "Promotional",
  plan_renewal: "Plan renewal",
};

export const NOTIFICATION_ICONS: Record<NotificationType, "form" | "users" | "check" | "x" | "alert" | "receipt" | "send" | "star"> = {
  APPLICATION_SUBMITTED: "form",
  APPLICATION_UNDER_REVIEW: "form",
  APPLICATION_MORE_INFO: "alert",
  APPLICATION_APPROVED: "check",
  APPLICATION_REJECTED: "x",
  WORKSPACE_CREATED: "users",
  LOW_EMAIL_CREDITS: "alert",
  LOW_SMS_CREDITS: "alert",
  EMAIL_CREDITS_EXHAUSTED: "alert",
  SMS_CREDITS_EXHAUSTED: "alert",
  PLAN_CHANGED: "star",
  CREDIT_PURCHASE_COMPLETED: "receipt",
  CAMPAIGN_SENT: "send",
  APPROVAL_REQUESTED: "check",
};
