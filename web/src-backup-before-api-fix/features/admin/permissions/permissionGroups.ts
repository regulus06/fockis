import {
  PERMISSIONS,
  type PermissionValue,
} from "./permission.constants";

export interface NavItem {
  label: string;
  path: string;

  /** Any one of these permissions grants visibility. */
  anyOf: PermissionValue[];
}

export interface NavSection {
  label: string;
  path?: string;

  /** Any one of these permissions grants visibility. */
  anyOf: PermissionValue[];

  children?: NavItem[];
}

const P = PERMISSIONS;

export const NAV_SECTIONS: NavSection[] = [
  // ============================================================
  // DASHBOARD
  // ============================================================

  {
    label: "Dashboard",
    path: "/admin/dashboard",
    anyOf: [P.ANALYTICS_VIEW],
  },

  // ============================================================
  // PEOPLE
  // ============================================================

  {
    label: "People",
    anyOf: [
      P.USERS_VIEW,
      P.ADMINS_VIEW,
      P.ROLES_VIEW,
      P.PERMISSIONS_VIEW,
    ],
    children: [
      {
        label: "Users",
        path: "/admin/users",
        anyOf: [P.USERS_VIEW],
      },
      {
        label: "Administrators",
        path: "/admin/administrators",
        anyOf: [P.ADMINS_VIEW],
      },
      {
        label: "Roles",
        path: "/admin/roles",
        anyOf: [P.ROLES_VIEW],
      },
      {
        label: "Permissions",
        path: "/admin/permissions",
        anyOf: [P.PERMISSIONS_VIEW],
      },
    ],
  },

  // ============================================================
  // MODERATION
  // ============================================================

  {
    label: "Moderation",
    path: "/admin/moderation",
    anyOf: [P.MODERATION_VIEW],
  },

  // ============================================================
  // SUPPORT
  // ============================================================

  {
    label: "Support",
    anyOf: [
      P.SUPPORT_VIEW,
      P.USERS_RECOVERY,
    ],
    children: [
      {
        label: "Support Cases",
        path: "/admin/support/cases",
        anyOf: [P.SUPPORT_VIEW],
      },
      {
        label: "Account Recovery",
        path: "/admin/recovery",
        anyOf: [P.USERS_RECOVERY],
      },
    ],
  },

  // ============================================================
  // MARKETPLACE
  // ============================================================

  {
    label: "Marketplace",
    anyOf: [P.MARKETPLACE_VIEW],
    children: [
      {
        label: "Products",
        path: "/admin/marketplace/products",
        anyOf: [P.MARKETPLACE_PRODUCTS_VIEW],
      },
      {
        label: "Sellers",
        path: "/admin/marketplace/sellers",
        anyOf: [P.MARKETPLACE_SELLERS_VIEW],
      },
      {
        label: "Stores",
        path: "/admin/marketplace/stores",
        anyOf: [P.MARKETPLACE_VIEW],
      },
      {
        label: "Orders",
        path: "/admin/marketplace/orders",
        anyOf: [P.MARKETPLACE_ORDERS_VIEW],
      },
      {
        label: "Disputes",
        path: "/admin/marketplace/disputes",
        anyOf: [P.MARKETPLACE_DISPUTES_MANAGE],
      },
      {
        label: "Reviews",
        path: "/admin/marketplace/reviews",
        anyOf: [P.MARKETPLACE_REVIEWS_MANAGE],
      },
    ],
  },

  // ============================================================
  // FINANCE
  // ============================================================

  {
    label: "Finance",
    anyOf: [P.FINANCE_VIEW],
    children: [
      {
        label: "Transactions",
        path: "/admin/finance/transactions",
        anyOf: [P.FINANCE_TRANSACTIONS],
      },
      {
        label: "Refunds",
        path: "/admin/finance/refunds",
        anyOf: [P.FINANCE_REFUNDS],
      },
      {
        label: "Payouts",
        path: "/admin/finance/payouts",
        anyOf: [P.FINANCE_PAYOUTS],
      },
      {
        label: "Earnings",
        path: "/admin/finance/earnings",
        anyOf: [P.FINANCE_EARNINGS],
      },
      {
        label: "Wallet",
        path: "/admin/finance/wallet",
        anyOf: [P.FINANCE_VIEW],
      },
    ],
  },

  // ============================================================
  // MARKETING
  // ============================================================

  {
    label: "Marketing",
    anyOf: [P.MARKETING_VIEW],
    children: [
      {
        label: "Campaigns",
        path: "/admin/marketing/campaigns",
        anyOf: [P.MARKETING_CAMPAIGNS],
      },
      {
        label: "Ads",
        path: "/admin/marketing/ads",
        anyOf: [P.MARKETING_ADS],
      },
      {
        label: "Analytics",
        path: "/admin/marketing/analytics",
        anyOf: [P.MARKETING_ANALYTICS],
      },
    ],
  },

  // ============================================================
  // FOCKIS AI / VAPI
  // ============================================================

  {
    label: "Fockis AI",
    anyOf: [P.AI_VIEW],
    children: [
      {
        label: "AI Dashboard",
        path: "/admin/ai",
        anyOf: [P.AI_VIEW],
      },
      {
        label: "AI Plans",
        path: "/admin/ai/plans",
        anyOf: [P.AI_MANAGE_PLANS],
      },
      {
        label: "AI Users",
        path: "/admin/ai/users",
        anyOf: [P.AI_MANAGE_USERS],
      },
      {
        label: "AI Conversations",
        path: "/admin/ai/conversations",
        anyOf: [P.AI_MANAGE_CONVERSATIONS],
      },
      {
        label: "AI Tools",
        path: "/admin/ai/tools",
        anyOf: [P.AI_MANAGE_TOOLS],
      },
      {
        label: "Recommendations",
        path: "/admin/ai/recommendations",
        anyOf: [P.AI_RECOMMENDATIONS],
      },
      {
        label: "Special AI Ads",
        path: "/admin/ai/special-ads",
        anyOf: [P.AI_SPECIAL_ADS],
      },
      {
        label: "AI Usage",
        path: "/admin/ai/usage",
        anyOf: [P.AI_VIEW_USAGE],
      },
      {
        label: "AI Settings",
        path: "/admin/ai/settings",
        anyOf: [P.AI_SETTINGS],
      },
    ],
  },

  // ============================================================
  // LIVE
  // ============================================================

  {
    label: "Live",
    path: "/admin/live",
    anyOf: [P.LIVE_VIEW],
  },

  // ============================================================
  // MEETINGS
  // ============================================================

  {
    label: "Meetings",
    path: "/admin/meetings",
    anyOf: [P.MEETINGS_VIEW],
  },

  // ============================================================
  // REAL ESTATE
  // ============================================================

  {
    label: "Real Estate",
    path: "/admin/realestate",
    anyOf: [P.REALESTATE_VIEW],
  },

  // ============================================================
  // DOCUMENTS
  // ============================================================

  {
    label: "Documents",
    path: "/admin/documents",
    anyOf: [P.DOCUMENTS_VIEW],
  },

  // ============================================================
  // DESIGN STUDIO
  // ============================================================

  {
    label: "Design Studio",
    path: "/admin/design",
    anyOf: [P.DESIGN_VIEW],
  },

  // ============================================================
  // SUBSCRIPTIONS
  // ============================================================

  {
    label: "Subscriptions",
    path: "/admin/subscriptions",
    anyOf: [P.SUBSCRIPTIONS_VIEW],
  },

  // ============================================================
  // GIFTS
  // ============================================================

  {
    label: "Gifts",
    path: "/admin/gifts",
    anyOf: [P.GIFTS_VIEW],
  },

  // ============================================================
  // SHIPPING
  // ============================================================

  {
    label: "Shipping",
    path: "/admin/shipping",
    anyOf: [P.SHIPPING_VIEW],
  },

  // ============================================================
  // PLAYLISTS
  // ============================================================

  {
    label: "Playlists",
    path: "/admin/playlists",
    anyOf: [P.PLAYLISTS_VIEW],
  },

  // ============================================================
  // REVIEWS
  // ============================================================

  {
    label: "Reviews",
    path: "/admin/reviews",
    anyOf: [P.REVIEWS_VIEW],
  },

  // ============================================================
  // ANALYTICS
  // ============================================================

  {
    label: "Analytics",
    path: "/admin/analytics",
    anyOf: [P.ANALYTICS_VIEW],
  },

  // ============================================================
  // SECURITY
  // ============================================================

  {
    label: "Security",
    path: "/admin/security",
    anyOf: [P.SECURITY_VIEW],
  },

  // ============================================================
  // AUDIT LOGS
  // ============================================================

  {
    label: "Audit Logs",
    path: "/admin/audit",
    anyOf: [P.AUDIT_VIEW],
  },

  // ============================================================
  // SYSTEM
  // ============================================================

  {
    label: "System",
    anyOf: [
      P.SYSTEM_VIEW,
      P.SYSTEM_SETTINGS,
      P.SYSTEM_FEATURES,
      P.EMERGENCY_VIEW,
    ],
    children: [
      {
        label: "Settings",
        path: "/admin/system/settings",
        anyOf: [P.SYSTEM_SETTINGS],
      },
      {
        label: "Feature Flags",
        path: "/admin/system/features",
        anyOf: [P.SYSTEM_FEATURES],
      },
      {
        label: "Emergency Center",
        path: "/admin/system/emergency",
        anyOf: [P.EMERGENCY_VIEW],
      },
    ],
  },
];