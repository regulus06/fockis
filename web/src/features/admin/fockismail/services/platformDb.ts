// Session-scoped mock state for platform-level data (businesses, agency,
// applications, billing, notifications). Mock mode only; resets on reload.

import { mockAgencyActivity, mockAgencySettings, mockApprovals, mockBusinesses, mockTasks, mockTeam, mockViewer } from "../data/agencyMockData";
import { mockApplications } from "../data/applicationMockData";
import {
  mockBalances,
  mockBillingSettings,
  mockCreditPackages,
  mockInvoices,
  mockPaymentMethods,
  mockPlans,
  mockTransactions,
} from "../data/billingMockData";
import type { MarketingNotification } from "../types/platform.types";
import { daysAgo } from "../data/demoTime";

const seedNotifications: MarketingNotification[] = [
  { id: "n1", type: "APPLICATION_SUBMITTED", businessId: null, title: "New marketing application", body: "Sunrise Bakery requested email and social media marketing.", link: "/marketing/agency/applications/app_1", read: false, createdAt: daysAgo(0.4) },
  { id: "n2", type: "LOW_EMAIL_CREDITS", businessId: "biz_joes", title: "Email credits are running low", body: "Joe's Restaurant has 450 email credits left.", link: "/marketing/billing/email", read: false, createdAt: daysAgo(0.3) },
  { id: "n3", type: "EMAIL_CREDITS_EXHAUSTED", businessId: "biz_bloom", title: "Email credits exhausted", body: "Bloom Salon can't send email until credits are added.", link: "/marketing/billing/credits?type=email", read: false, createdAt: daysAgo(1.6) },
  { id: "n4", type: "APPROVAL_REQUESTED", businessId: "biz_abc", title: "Approval requested", body: "“Fresh fade Friday” is waiting for client approval.", link: "/marketing/agency/approvals", read: true, createdAt: daysAgo(1) },
  { id: "n5", type: "WORKSPACE_CREATED", businessId: "biz_xyz", title: "Workspace created", body: "XYZ Construction's workspace is ready.", link: "/marketing/agency/clients/biz_xyz", read: true, createdAt: daysAgo(6) },
  { id: "n6", type: "CAMPAIGN_SENT", businessId: "biz_fockis", title: "Campaign sent", body: "“October creator newsletter” finished sending.", link: "/marketing/mailchimp/campaigns", read: true, createdAt: daysAgo(2) },
  { id: "n7", type: "CREDIT_PURCHASE_COMPLETED", businessId: "biz_abc", title: "Credits added", body: "5,000 email credits were added to ABC Barber Shop.", link: "/marketing/billing/transactions", read: true, createdAt: daysAgo(5) },
];

export const platformDb = {
  viewer: structuredClone(mockViewer),
  businesses: structuredClone(mockBusinesses),
  team: structuredClone(mockTeam),
  tasks: structuredClone(mockTasks),
  approvals: structuredClone(mockApprovals),
  activity: structuredClone(mockAgencyActivity),
  agencySettings: structuredClone(mockAgencySettings),
  applications: structuredClone(mockApplications),
  plans: structuredClone(mockPlans),
  packages: structuredClone(mockCreditPackages),
  balances: structuredClone(mockBalances),
  transactions: structuredClone(mockTransactions),
  invoices: structuredClone(mockInvoices),
  paymentMethods: structuredClone(mockPaymentMethods),
  billingSettings: structuredClone(mockBillingSettings),
  notifications: seedNotifications,
};
