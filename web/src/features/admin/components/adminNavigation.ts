import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ChartColumn,
  Crown,
  FileText,
  Globe,
  Headset,
  Landmark,
  LayoutDashboard,
  MapPinned,
  Megaphone,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";

import { PERMISSIONS } from "../permissions/permission.constants";

/* ============================================================================
   ADMIN NAVIGATION CONFIG

   Every path below is an existing route (AdminRoutes.tsx, the nested module
   routers, or App.tsx). `anyOf` mirrors the permission guard on that route so
   the sidebar only shows what the administrator can actually open.
   Links that previously pointed at non-existent routes (/admin/categories,
   /admin/inventory, /admin/business) are intentionally not listed.
============================================================================ */

const P = PERMISSIONS;

export interface AdminNavLink {
  label: string;
  path: string;
  anyOf?: readonly string[];
}

export interface AdminNavItem extends AdminNavLink {
  icon: LucideIcon;
  /** When present the item renders as an expandable group. */
  children?: AdminNavLink[];
}

export const ADMIN_NAV: AdminNavItem[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin/dashboard",
    anyOf: [P.ANALYTICS_VIEW],
  },
  {
    label: "Users",
    icon: Users,
    path: "/admin/users",
    anyOf: [P.USERS_VIEW],
  },
  {
    label: "Administrators",
    icon: ShieldCheck,
    path: "/admin/administrators",
    children: [
      { label: "Administrators", path: "/admin/administrators", anyOf: [P.ADMINS_VIEW] },
      { label: "Roles", path: "/admin/roles", anyOf: [P.ROLES_VIEW] },
      { label: "Permissions", path: "/admin/permissions", anyOf: [P.PERMISSIONS_VIEW] },
    ],
  },
  {
    label: "Audit Logs",
    icon: ScrollText,
    path: "/admin/audit",
    anyOf: [P.AUDIT_VIEW],
  },
  {
    label: "Marketplace",
    icon: Store,
    path: "/admin/shop",
    children: [
      { label: "Overview", path: "/admin/shop", anyOf: [P.MARKETPLACE_VIEW] },
      { label: "Products", path: "/admin/shop/products", anyOf: [P.MARKETPLACE_VIEW] },
      { label: "Sellers", path: "/admin/shop/sellers", anyOf: [P.MARKETPLACE_VIEW] },
      { label: "Stores", path: "/admin/shop/stores", anyOf: [P.MARKETPLACE_VIEW] },
      { label: "Orders", path: "/admin/marketplace/orders", anyOf: [P.MARKETPLACE_ORDERS_VIEW] },
      { label: "Reviews", path: "/admin/marketplace/reviews", anyOf: [P.MARKETPLACE_REVIEWS_MANAGE] },
      { label: "Shipping", path: "/admin/shipping", anyOf: [P.SHIPPING_VIEW] },
      { label: "Moderation", path: "/admin/shop/moderation", anyOf: [P.MARKETPLACE_VIEW] },
      { label: "Shop Rules", path: "/admin/shop/rules", anyOf: [P.MARKETPLACE_VIEW] },
    ],
  },
  {
    label: "Finance",
    icon: Landmark,
    path: "/admin/finance",
    children: [
      { label: "Overview", path: "/admin/finance", anyOf: [P.FINANCE_VIEW] },
      { label: "Transactions", path: "/admin/finance/transactions", anyOf: [P.FINANCE_TRANSACTIONS] },
      { label: "Payments", path: "/admin/finance/payments", anyOf: [P.PAYMENTS_VIEW, P.FINANCE_VIEW] },
      { label: "Payouts", path: "/admin/finance/payouts", anyOf: [P.FINANCE_PAYOUTS] },
      { label: "Refunds", path: "/admin/finance/refunds", anyOf: [P.FINANCE_REFUNDS] },
      { label: "Invoices", path: "/admin/finance/invoices", anyOf: [P.FINANCE_VIEW] },
      { label: "Revenue", path: "/admin/finance/revenue", anyOf: [P.FINANCE_EARNINGS, P.FINANCE_VIEW] },
      { label: "Fees", path: "/admin/finance/fees", anyOf: [P.FINANCE_VIEW] },
      { label: "Wallets", path: "/admin/finance/wallets", anyOf: [P.FINANCE_VIEW] },
      { label: "Coins", path: "/admin/finance/coins", anyOf: [P.FINANCE_VIEW] },
    ],
  },
  {
    label: "Subscriptions",
    icon: Crown,
    path: "/admin/finance/subscriptions",
    children: [
      {
        label: "Subscribers",
        path: "/admin/finance/subscriptions",
        anyOf: [P.SUBSCRIPTIONS_VIEW, P.FINANCE_VIEW],
      },
      { label: "Manage Plans", path: "/admin/subscription-plans", anyOf: [P.SUBSCRIPTIONS_VIEW] },
      { label: "Gifts", path: "/admin/gifts", anyOf: [P.GIFTS_VIEW] },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    path: "/admin/marketing-admin",
    children: [
      { label: "Marketing Admin", path: "/admin/marketing-admin" },
      { label: "Campaigns", path: "/admin/marketing-admin/campaigns" },
      { label: "Ads", path: "/admin/marketing-admin/ads" },
      { label: "Pending Review", path: "/admin/marketing-admin/pending-review" },
      { label: "Analytics", path: "/admin/marketing-admin/analytics" },
      { label: "Advertisers", path: "/admin/marketing-admin/advertisers" },
      { label: "Workflow & Settings", path: "/admin/marketing-admin/workflow" },
      { label: "Marketing Audit", path: "/admin/marketing-admin/audit" },
      { label: "Fockis Marketing", path: "/marketing" },
      { label: "Marketing Campaigns", path: "/marketing/campaigns" },
      { label: "Marketing Credits", path: "/marketing/credits" },
    ],
  },
  {
    label: "Support & Moderation",
    icon: Headset,
    path: "/admin/support",
    children: [
      { label: "Overview", path: "/admin/support", anyOf: [P.SUPPORT_VIEW, P.MODERATION_VIEW] },
      { label: "Feedback Inbox", path: "/admin/support/feedback", anyOf: [P.SUPPORT_VIEW] },
      { label: "Support Tickets", path: "/admin/support/tickets", anyOf: [P.SUPPORT_VIEW] },
      { label: "Content Reports", path: "/admin/support/reports", anyOf: [P.MODERATION_VIEW] },
      { label: "Hidden Posts", path: "/admin/support/hidden-posts", anyOf: [P.MODERATION_VIEW] },
      { label: "Moderation History", path: "/admin/support/history", anyOf: [P.MODERATION_VIEW] },
      { label: "Help Articles", path: "/admin/support/articles", anyOf: [P.HELP_CONTENT_MANAGE] },
      { label: "Live Support", path: "/admin/support/live", anyOf: [P.SUPPORT_VIEW] },
    ],
  },
  {
    label: "Maps",
    icon: MapPinned,
    path: "/admin/map/addresses",
    children: [
      { label: "Address Verification", path: "/admin/map/addresses", anyOf: [P.MAP_ADDRESSES_VIEW] },
    ],
  },
  {
    label: "Legal & Evidence",
    icon: Scale,
    path: "/admin/legal",
    children: [
      { label: "Overview", path: "/admin/legal", anyOf: [P.LEGAL_VIEW] },
      { label: "Evidence Archive", path: "/admin/legal/evidence", anyOf: [P.LEGAL_VIEW] },
      { label: "Deleted Accounts", path: "/admin/legal/deletions", anyOf: [P.LEGAL_DELETIONS_VIEW] },
      { label: "Legal Requests", path: "/admin/legal/requests", anyOf: [P.LEGAL_VIEW] },
      { label: "Legal Holds", path: "/admin/legal/holds", anyOf: [P.LEGAL_VIEW] },
      { label: "Evidence Export", path: "/admin/legal/exports", anyOf: [P.LEGAL_VIEW] },
      { label: "Access Audit Logs", path: "/admin/legal/audit", anyOf: [P.LEGAL_AUDIT_VIEW] },
      { label: "Retention Policies", path: "/admin/legal/retention", anyOf: [P.LEGAL_VIEW] },
    ],
  },
  {
    label: "Policy & Compliance",
    icon: ShieldCheck,
    path: "/admin/policy-compliance",
    children: [
      { label: "Overview", path: "/admin/policy-compliance", anyOf: [P.POLICY_VIEW] },
      { label: "Policies", path: "/admin/policy-compliance/policies", anyOf: [P.POLICY_VIEW] },
      { label: "Operational Rules", path: "/admin/policy-compliance/rules", anyOf: [P.POLICY_VIEW] },
      { label: "Versions", path: "/admin/policy-compliance/versions", anyOf: [P.POLICY_VIEW] },
      { label: "Approvals", path: "/admin/policy-compliance/approvals", anyOf: [P.POLICY_VIEW] },
      { label: "Acceptance Records", path: "/admin/policy-compliance/acceptances", anyOf: [P.POLICY_ACCEPTANCE_VIEW] },
      { label: "Audit Logs", path: "/admin/policy-compliance/audit", anyOf: [P.POLICY_AUDIT_VIEW] },
      { label: "Settings", path: "/admin/policy-compliance/settings", anyOf: [P.POLICY_VIEW] },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    path: "/admin/messages",
    children: [
      { label: "Messages", path: "/admin/messages", anyOf: [P.USERS_VIEW] },
      { label: "Moderation", path: "/admin/moderation", anyOf: [P.MODERATION_VIEW] },
      { label: "Moderation Queue", path: "/admin/moderation/cases", anyOf: [P.MODERATION_VIEW] },
      { label: "Appeals", path: "/admin/moderation/appeals", anyOf: [P.MODERATION_APPEALS] },
      { label: "Music Rules", path: "/admin/music/rules", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Creator Applications", path: "/admin/music/producers", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Live", path: "/admin/live", anyOf: [P.LIVE_VIEW] },
      { label: "Meetings", path: "/admin/meetings", anyOf: [P.MEETINGS_VIEW] },
      { label: "Real Estate", path: "/admin/realestate", anyOf: [P.REALESTATE_VIEW] },
      { label: "Documents", path: "/admin/documents", anyOf: [P.DOCUMENTS_VIEW] },
      { label: "Design Studio", path: "/admin/design", anyOf: [P.DESIGN_VIEW] },
      { label: "Playlists", path: "/admin/playlists", anyOf: [P.PLAYLISTS_VIEW] },
    ],
  },
  {
    label: "Platforms",
    icon: Globe,
    path: "/admin/travel",
    children: [
      { label: "Travel Admin", path: "/admin/travel", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Travel Users", path: "/admin/travel/users", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Travel Partners", path: "/admin/travel/partners", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Travel Applications", path: "/admin/travel/applications", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Travel Listings", path: "/admin/travel/listings", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Travel Bookings", path: "/admin/travel/bookings", anyOf: [P.ANALYTICS_VIEW] },
      { label: "Domain Administration", path: "/admin/domains", anyOf: [P.SYSTEM_SETTINGS] },
    ],
  },
  {
    label: "AI & Vapi",
    icon: Bot,
    path: "/admin/ai",
    anyOf: [P.AI_VIEW],
  },
  {
    label: "Reports",
    icon: ChartColumn,
    path: "/admin/analytics",
    children: [
      { label: "Global Analytics", path: "/admin/analytics", anyOf: [P.ANALYTICS_VIEW] },
      {
        label: "Financial Reports",
        path: "/admin/finance/reports",
        anyOf: [P.FINANCE_VIEW, P.FINANCE_EARNINGS],
      },
      { label: "Moderation Reports", path: "/admin/moderation/reports", anyOf: [P.MODERATION_VIEW] },
      { label: "Message Reports", path: "/admin/messages/reports", anyOf: [P.MODERATION_VIEW] },
    ],
  },
  {
    label: "Settings",
    icon: Settings,
    path: "/admin/system/settings",
    children: [
      { label: "System Settings", path: "/admin/system/settings", anyOf: [P.SYSTEM_SETTINGS] },
      { label: "Feature Flags", path: "/admin/system/features", anyOf: [P.SYSTEM_FEATURES] },
      { label: "Security Center", path: "/admin/security", anyOf: [P.SECURITY_VIEW] },
      {
        label: "Emergency Center",
        path: "/admin/system/emergency",
        anyOf: [P.EMERGENCY_EXECUTE, P.EMERGENCY_VIEW],
      },
    ],
  },
];

/** Every navigable path, used to pick the single best-matching active link. */
export function allNavPaths(items: AdminNavItem[]): string[] {
  const paths: string[] = [];

  for (const item of items) {
    if (item.children?.length) {
      for (const child of item.children) paths.push(child.path);
    } else {
      paths.push(item.path);
    }
  }

  return paths;
}

/**
 * Longest-prefix match so exactly one link is active, e.g. /admin/roles/42
 * highlights "Roles" and /admin/finance/refunds highlights "Refunds" rather
 * than the Finance "Overview" link.
 */
export function bestMatchingPath(pathname: string, paths: string[]): string | null {
  let best: string | null = null;

  for (const path of paths) {
    const matches = pathname === path || pathname.startsWith(`${path}/`);

    if (matches && (!best || path.length > best.length)) {
      best = path;
    }
  }

  return best;
}
