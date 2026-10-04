import type {
  AutomationStatus,
  CampaignStatus,
  CampaignType,
  ContactSource,
  ContactStatus,
  EmailBlockType,
  FockisAudienceType,
  FockisBehaviorFilter,
  FormFieldType,
  JourneyNodeKind,
  SegmentField,
  SegmentOperator,
  TemplateCategory,
} from "../types/mailchimp.types";

export type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "violet";

export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  regular: "Regular email",
  automated: "Automated email",
  ab_test: "A/B test",
  plain_text: "Plain text",
  product_promotion: "Product promotion",
  newsletter: "Newsletter",
  announcement: "Announcement",
  event: "Event",
  welcome: "Welcome email",
  abandoned_cart: "Abandoned cart",
  winback: "Customer winback",
  transactional: "Transactional email",
};

export const CAMPAIGN_TYPE_DESCRIPTIONS: Record<CampaignType, string> = {
  regular: "A designed email sent once to an audience or segment.",
  automated: "Sent automatically when a contact meets a trigger.",
  ab_test: "Test two versions on a slice of your audience first.",
  plain_text: "A simple, personal-looking email with no design.",
  product_promotion: "Feature marketplace products with prices and links.",
  newsletter: "A regular digest of news, stories, and updates.",
  announcement: "Share a launch, change, or important update.",
  event: "Invite people to an event and drive RSVPs.",
  welcome: "Greet new Fockis members and new subscribers.",
  abandoned_cart: "Remind shoppers about items left in their cart.",
  winback: "Re-engage customers who have gone quiet.",
  transactional: "Receipts, confirmations, and account messages.",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  paused: "Paused",
  archived: "Archived",
};

export const CAMPAIGN_STATUS_TONES: Record<CampaignStatus, Tone> = {
  draft: "neutral",
  scheduled: "violet",
  sending: "blue",
  sent: "green",
  paused: "amber",
  archived: "neutral",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  subscribed: "Subscribed",
  unsubscribed: "Unsubscribed",
  cleaned: "Cleaned",
  pending: "Pending",
};

export const CONTACT_STATUS_TONES: Record<ContactStatus, Tone> = {
  subscribed: "green",
  unsubscribed: "neutral",
  cleaned: "red",
  pending: "amber",
};

export const CONTACT_SOURCE_LABELS: Record<ContactSource, string> = {
  fockis_signup: "Fockis signup",
  marketplace: "Marketplace",
  import: "Import",
  form: "Signup form",
  api: "API",
  manual: "Added manually",
  landing_page: "Landing page",
};

export const AUTOMATION_STATUS_TONES: Record<AutomationStatus, Tone> = {
  active: "green",
  paused: "amber",
  draft: "neutral",
};

export const FOCKIS_AUDIENCE_LABELS: Record<FockisAudienceType, string> = {
  fockis_users: "Fockis users",
  marketplace_buyers: "Marketplace buyers",
  marketplace_sellers: "Marketplace sellers",
  businesses: "Businesses",
  creators: "Creators",
  premium_users: "Premium users",
  church_organizations: "Church organizations",
  travel_customers: "Travel customers",
  academy_students: "Academy students",
  music_users: "Music users",
};

export const FOCKIS_BEHAVIOR_LABELS: Record<FockisBehaviorFilter, string> = {
  has_purchased: "Has purchased",
  has_not_purchased: "Hasn't purchased",
  has_posted: "Has posted",
  has_followed: "Has followed",
  has_liked: "Has liked",
  has_commented: "Has commented",
  has_watched_waves: "Has watched Waves",
  has_created_business: "Has created a business",
  has_marketplace_store: "Has a marketplace store",
  has_premium: "Has premium",
  inactive: "Inactive users",
};

export const SEGMENT_FIELD_LABELS: Record<SegmentField, string> = {
  email: "Email",
  first_name: "First name",
  last_name: "Last name",
  location: "Location",
  signup_date: "Signup date",
  last_activity: "Last activity",
  campaign_opened: "Campaign opened",
  campaign_clicked: "Campaign clicked",
  purchase_amount: "Purchase amount",
  product_purchased: "Product purchased",
  order_count: "Order count",
  vip_status: "VIP status",
  tags: "Tags",
  fockis_audience: "Fockis audience",
  fockis_behavior: "Fockis activity",
};

export const SEGMENT_OPERATORS: Record<SegmentField, SegmentOperator[]> = {
  email: ["contains", "equals", "not_equals", "starts_with"],
  first_name: ["equals", "contains", "starts_with"],
  last_name: ["equals", "contains", "starts_with"],
  location: ["equals", "contains", "not_equals"],
  signup_date: ["after", "before"],
  last_activity: ["after", "before"],
  campaign_opened: ["is", "is_not"],
  campaign_clicked: ["is", "is_not"],
  purchase_amount: ["greater_than", "less_than", "equals"],
  product_purchased: ["equals", "contains"],
  order_count: ["greater_than", "less_than", "equals"],
  vip_status: ["is", "is_not"],
  tags: ["is", "is_not"],
  fockis_audience: ["is", "is_not"],
  fockis_behavior: ["is", "is_not"],
};

export const OPERATOR_LABELS: Record<SegmentOperator, string> = {
  contains: "contains",
  equals: "equals",
  not_equals: "does not equal",
  starts_with: "starts with",
  greater_than: "is greater than",
  less_than: "is less than",
  before: "is before",
  after: "is after",
  is: "is",
  is_not: "is not",
};

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  newsletter: "Newsletter",
  welcome: "Welcome",
  promotion: "Promotion",
  product: "Product",
  event: "Event",
  announcement: "Announcement",
  transactional: "Transactional",
  minimal: "Minimal",
  modern: "Modern",
  social: "Social",
  fockis_marketplace: "Fockis Marketplace",
  small_business: "Small business",
};

export const BLOCK_LABELS: Record<EmailBlockType, string> = {
  text: "Text",
  heading: "Heading",
  image: "Image",
  button: "Button",
  divider: "Divider",
  spacer: "Spacer",
  video: "Video",
  social: "Social links",
  logo: "Logo",
  product: "Product",
  product_grid: "Product grid",
  coupon: "Coupon",
  countdown: "Countdown",
  columns: "Columns",
  footer: "Footer",
};

export const JOURNEY_NODE_LABELS: Record<JourneyNodeKind, string> = {
  trigger: "Trigger",
  email: "Send email",
  wait: "Wait",
  condition: "Condition",
  tag: "Tag contact",
  webhook: "Webhook",
  sms: "Send SMS",
  audience: "Audience",
  purchase: "Purchase check",
  event: "Fockis event",
};

export const FORM_FIELD_LABELS: Record<FormFieldType, string> = {
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  phone: "Phone",
  birthday: "Birthday",
  address: "Address",
  custom: "Custom field",
  checkbox: "Checkbox",
  dropdown: "Dropdown",
  radio: "Radio",
  consent: "Consent",
};
