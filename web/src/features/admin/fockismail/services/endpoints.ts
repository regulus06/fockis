// ============================================================================
// FOCKIS MAIL BACKEND ENDPOINTS
// ----------------------------------------------------------------------------
// All Fockis Mail endpoints are relative to VITE_MARKETING_API_URL.
//
// Example:
// VITE_MARKETING_API_URL=https://fockis.onrender.com
//
// The backend owns all secrets and external integrations.
// ============================================================================

export const ENDPOINTS = {
  // --------------------------------------------------------------------------
  // Fockis Mail Analytics
  // --------------------------------------------------------------------------

  dashboard: "/fockis-mail/analytics",

  analytics: "/fockis-mail/analytics",

  campaignReport: (id: string) =>
    `/fockis-mail/analytics/campaigns/${id}`,

  abTests: "/fockis-mail/analytics/ab-tests",

  abTest: (id: string) =>
    `/fockis-mail/analytics/ab-tests/${id}`,

  // --------------------------------------------------------------------------
  // Campaigns
  // --------------------------------------------------------------------------

  campaigns: "/fockis-mail/campaigns",

  campaign: (id: string) =>
    `/fockis-mail/campaigns/${id}`,

  campaignAction: (
    id: string,
    action:
      | "duplicate"
      | "schedule"
      | "pause"
      | "resume"
      | "archive"
      | "send"
      | "test",
  ) =>
    `/fockis-mail/campaigns/${id}/${action}`,

  campaignImport:
    "/fockis-mail/campaigns/import",

  // --------------------------------------------------------------------------
  // Contacts
  // --------------------------------------------------------------------------

  audiences: "/fockis-mail/contacts",

  contacts: "/fockis-mail/contacts",

  contact: (id: string) =>
    `/fockis-mail/contacts/${id}`,

  contactsBulk:
    "/fockis-mail/contacts/bulk",

  contactsImport:
    "/fockis-mail/contacts/import",

  // --------------------------------------------------------------------------
  // Segments
  // --------------------------------------------------------------------------

  segments: "/fockis-mail/segments",

  segment: (id: string) =>
    `/fockis-mail/segments/${id}`,

  segmentPreview:
    "/fockis-mail/segments/preview",

  // --------------------------------------------------------------------------
  // Tags
  // --------------------------------------------------------------------------

  tags: "/fockis-mail/tags",

  tag: (id: string) =>
    `/fockis-mail/tags/${id}`,

  // --------------------------------------------------------------------------
  // Templates
  // --------------------------------------------------------------------------

  templates: "/fockis-mail/templates",

  template: (id: string) =>
    `/fockis-mail/templates/${id}`,

  // --------------------------------------------------------------------------
  // Automations
  // --------------------------------------------------------------------------

  automations:
    "/fockis-mail/automations",

  automation: (id: string) =>
    `/fockis-mail/automations/${id}`,

  // --------------------------------------------------------------------------
  // Journeys
  // --------------------------------------------------------------------------

  journeys:
    "/fockis-mail/journeys",

  journey: (id: string) =>
    `/fockis-mail/journeys/${id}`,

  // --------------------------------------------------------------------------
  // Forms
  // --------------------------------------------------------------------------

  forms: "/fockis-mail/forms",

  form: (id: string) =>
    `/fockis-mail/forms/${id}`,

  // --------------------------------------------------------------------------
  // Landing pages
  // --------------------------------------------------------------------------

  landingPages:
    "/fockis-mail/landing-pages",

  landingPage: (id: string) =>
    `/fockis-mail/landing-pages/${id}`,

  // --------------------------------------------------------------------------
  // Media
  // --------------------------------------------------------------------------

  media: "/fockis-mail/media",

  mediaItem: (id: string) =>
    `/fockis-mail/media/${id}`,

  mediaUpload:
    "/fockis-mail/media/upload",

  // --------------------------------------------------------------------------
  // Transactional
  // --------------------------------------------------------------------------

  transactional:
    "/fockis-mail/transactional",

  transactionalItem: (id: string) =>
    `/fockis-mail/transactional/${id}`,

  // --------------------------------------------------------------------------
  // SMS
  // --------------------------------------------------------------------------

  smsCampaigns:
    "/fockis-mail/sms/campaigns",

  // --------------------------------------------------------------------------
  // Social
  // --------------------------------------------------------------------------

  socialCampaigns:
    "/fockis-mail/social/campaigns",

  // --------------------------------------------------------------------------
  // Integrations
  // --------------------------------------------------------------------------

  integrations:
    "/fockis-mail/integrations",

  integration: (id: string) =>
    `/fockis-mail/integrations/${id}`,

  // --------------------------------------------------------------------------
  // Settings
  // --------------------------------------------------------------------------

  settings:
    "/fockis-mail/settings",

  domains:
    "/fockis-mail/settings/domains",

  domain: (id: string) =>
    `/fockis-mail/settings/domains/${id}`,
} as const;

// ============================================================================
// PLATFORM ENDPOINTS
// ----------------------------------------------------------------------------
// Agency, businesses, applications, credits and billing.
//
// These remain under /marketing because they are platform-level services,
// separate from the Fockis Mail module.
// ============================================================================

export const PLATFORM_ENDPOINTS = {
  // --------------------------------------------------------------------------
  // Businesses / workspaces
  // --------------------------------------------------------------------------

  businesses:
    "/marketing/businesses",

  business: (id: string) =>
    `/marketing/businesses/${id}`,

  businessSummary: (id: string) =>
    `/marketing/businesses/${id}/summary`,

  businessServices: (id: string) =>
    `/marketing/businesses/${id}/services`,

  team: (businessId: string) =>
    `/marketing/businesses/${businessId}/team`,

  teamMember: (
    businessId: string,
    memberId: string,
  ) =>
    `/marketing/businesses/${businessId}/team/${memberId}`,

  teamResend: (
    businessId: string,
    memberId: string,
  ) =>
    `/marketing/businesses/${businessId}/team/${memberId}/resend`,

  // --------------------------------------------------------------------------
  // Agency
  // --------------------------------------------------------------------------

  agencyDashboard:
    "/marketing/agency/dashboard",

  agencyReports:
    "/marketing/agency/reports",

  agencySettings:
    "/marketing/agency/settings",

  agencyActivity:
    "/marketing/agency/activity",

  tasks:
    "/marketing/agency/tasks",

  task: (id: string) =>
    `/marketing/agency/tasks/${id}`,

  approvals:
    "/marketing/agency/approvals",

  approval: (id: string) =>
    `/marketing/agency/approvals/${id}`,

  approvalComments: (id: string) =>
    `/marketing/agency/approvals/${id}/comments`,

  // --------------------------------------------------------------------------
  // Applications
  // --------------------------------------------------------------------------

  applications:
    "/marketing/applications",

  application: (id: string) =>
    `/marketing/applications/${id}`,

  applicationStatus: (id: string) =>
    `/marketing/applications/${id}/status`,

  applicationMessages: (id: string) =>
    `/marketing/applications/${id}/messages`,

  applicationConvert: (id: string) =>
    `/marketing/applications/${id}/convert`,

  // --------------------------------------------------------------------------
  // Plans & packages
  // --------------------------------------------------------------------------

  plans:
    "/marketing/plans",

  creditPackages:
    "/marketing/credit-packages",

  // --------------------------------------------------------------------------
  // Credits & ledger
  // --------------------------------------------------------------------------

  credits: (businessId: string) =>
    `/marketing/businesses/${businessId}/credits`,

  creditCheck: (businessId: string) =>
    `/marketing/businesses/${businessId}/credits/check`,

  creditAdjust: (businessId: string) =>
    `/marketing/businesses/${businessId}/credits/adjust`,

  transactions: (businessId: string) =>
    `/marketing/businesses/${businessId}/transactions`,

  usage: (businessId: string) =>
    `/marketing/businesses/${businessId}/usage`,

  agencyCredits:
    "/marketing/agency/credits",

  // --------------------------------------------------------------------------
  // Billing
  // --------------------------------------------------------------------------

  checkoutSession: (businessId: string) =>
    `/marketing/businesses/${businessId}/billing/checkout-sessions`,

  planChange: (businessId: string) =>
    `/marketing/businesses/${businessId}/billing/plan`,

  invoices: (businessId: string) =>
    `/marketing/businesses/${businessId}/billing/invoices`,

  paymentMethods: (businessId: string) =>
    `/marketing/businesses/${businessId}/billing/payment-methods`,

  paymentMethod: (
    businessId: string,
    id: string,
  ) =>
    `/marketing/businesses/${businessId}/billing/payment-methods/${id}`,

  setupIntent: (businessId: string) =>
    `/marketing/businesses/${businessId}/billing/setup-intents`,

  billingSettings: (businessId: string) =>
    `/marketing/businesses/${businessId}/billing/settings`,

  // --------------------------------------------------------------------------
  // Notifications
  // --------------------------------------------------------------------------

  notifications:
    "/marketing/notifications",

  notificationRead: (id: string) =>
    `/marketing/notifications/${id}/read`,

  notificationsReadAll:
    "/marketing/notifications/read-all",
} as const;