import type { IconName } from "./ui/Icon";
import type { Permission } from "../types/platform.types";

const M = "/marketing/mailchimp";
const A = "/marketing/agency";
const B = "/marketing/billing";

/** Absolute routes used for cross-section links. */
export const MARKETING_ROUTES = {
  overview: M,
  compose: `${M}/compose`,
  campaigns: `${M}/campaigns`,
  audience: `${M}/audience`,
  automations: `${M}/automations`,
  templates: `${M}/templates`,
  sms: `${M}/sms`,
  settings: `${M}/settings`,
  agency: A,
  applications: `${A}/applications`,
  application: (id: string) => `${A}/applications/${id}`,
  clients: `${A}/clients`,
  newClient: `${A}/clients/new`,
  client: (id: string) => `${A}/clients/${id}`,
  clientTeam: (id: string) => `${A}/clients/${id}/team`,
  approvals: `${A}/approvals`,
  tasks: `${A}/tasks`,
  agencyReports: `${A}/reports`,
  agencyCredits: `${A}/billing`,
  agencySettings: `${A}/settings`,
  billing: B,
  emailCredits: `${B}/email`,
  smsCredits: `${B}/sms`,
  usage: `${B}/usage`,
  buyCredits: (type: "email" | "sms" = "email") => `${B}/credits?type=${type}`,
  transactions: `${B}/transactions`,
  plans: `${B}/plans`,
  history: `${B}/history`,
  paymentMethods: `${B}/payment-methods`,
  billingSettings: `${B}/settings`,
  request: "/marketing/request",
} as const;

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Exact match only (for section roots that have sibling pages). */
  end?: boolean;
  children?: Array<{ label: string; path: string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  requires?: Permission;
}

/** Single source of truth for marketing navigation (sidebar, mobile, search). */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Marketing",
    items: [
      { label: "Overview", path: M, icon: "home", end: true },
      {
        label: "Campaigns", path: `${M}/campaigns`, icon: "send",
        children: [
          { label: "All campaigns", path: `${M}/campaigns` },
          { label: "Create campaign", path: `${M}/compose` },
          { label: "A/B testing", path: `${M}/ab-testing` },
          { label: "Transactional", path: `${M}/transactional` },
          { label: "SMS", path: `${M}/sms` },
          { label: "Social", path: `${M}/social` },
        ],
      },
      {
        label: "Audience", path: `${M}/audience`, icon: "users",
        children: [
          { label: "Contacts", path: `${M}/audience` },
          { label: "Segments", path: `${M}/segments` },
          { label: "Tags", path: `${M}/tags` },
        ],
      },
      { label: "Automations", path: `${M}/automations`, icon: "zap" },
      { label: "Journeys", path: `${M}/journeys`, icon: "route" },
      { label: "Analytics", path: `${M}/analytics`, icon: "chart" },
      { label: "Reports", path: `${M}/reports`, icon: "report" },
    ],
  },
  {
    label: "Agency",
    requires: "agency.view",
    items: [
      { label: "Agency dashboard", path: A, icon: "grid", end: true },
      { label: "Applications", path: `${A}/applications`, icon: "form" },
      { label: "Clients", path: `${A}/clients`, icon: "users" },
      { label: "Approvals", path: `${A}/approvals`, icon: "check" },
      { label: "Tasks", path: `${A}/tasks`, icon: "layout" },
      { label: "Client reports", path: `${A}/reports`, icon: "report" },
      { label: "Client credits", path: `${A}/billing`, icon: "dollar" },
    ],
  },
  {
    label: "Tools",
    items: [
      { label: "Templates", path: `${M}/templates`, icon: "layout" },
      { label: "Forms", path: `${M}/forms`, icon: "form" },
      { label: "Landing pages", path: `${M}/landing-pages`, icon: "globe" },
      { label: "Media", path: `${M}/content`, icon: "image" },
    ],
  },
  {
    label: "Billing & credits",
    items: [
      {
        label: "Billing & credits", path: B, icon: "receipt",
        children: [
          { label: "Overview", path: B },
          { label: "Email credits", path: `${B}/email` },
          { label: "SMS credits", path: `${B}/sms` },
          { label: "Usage", path: `${B}/usage` },
          { label: "Buy credits", path: `${B}/credits` },
          { label: "Transactions", path: `${B}/transactions` },
          { label: "Plans", path: `${B}/plans` },
          { label: "Billing history", path: `${B}/history` },
          { label: "Payment methods", path: `${B}/payment-methods` },
          { label: "Billing settings", path: `${B}/settings` },
        ],
      },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Marketing settings", path: `${M}/settings`, icon: "settings" },
      { label: "Agency settings", path: `${A}/settings`, icon: "settings" },
      { label: "Integrations", path: `${M}/integrations`, icon: "plug" },
    ],
  },
];

/** Flat list (kept for search and older imports). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export const MOBILE_NAV: Array<{ label: string; path: string; icon: IconName; end?: boolean }> = [
  { label: "Overview", path: M, icon: "home", end: true },
  { label: "Campaigns", path: `${M}/campaigns`, icon: "send" },
  { label: "Audience", path: `${M}/audience`, icon: "users" },
  { label: "Credits", path: B, icon: "receipt" },
];
