export interface AdminPermissionDefinition {
  key: string;
  label: string;
  description: string;
  module: string;
}

export const ADMIN_PERMISSION_CATALOG: AdminPermissionDefinition[] = [
  // ============================================================
  // ADMINISTRATION
  // ============================================================

  {
    key: 'administrators.view',
    label: 'View Administrators',
    description: 'View Fockis administrators.',
    module: 'administration',
  },
  {
    key: 'administrators.create',
    label: 'Create Administrators',
    description: 'Create new administrators.',
    module: 'administration',
  },
  {
    key: 'administrators.update',
    label: 'Update Administrators',
    description: 'Update administrator accounts.',
    module: 'administration',
  },
  {
    key: 'administrators.delete',
    label: 'Delete Administrators',
    description: 'Delete administrator accounts.',
    module: 'administration',
  },
  {
    key: 'administrators.roles.manage',
    label: 'Manage Administrator Roles',
    description: 'Assign and change administrator roles.',
    module: 'administration',
  },

  // ============================================================
  // USERS
  // ============================================================

  {
    key: 'users.view',
    label: 'View Users',
    description: 'View platform users.',
    module: 'users',
  },
  {
    key: 'users.manage',
    label: 'Manage Users',
    description: 'Manage platform user accounts.',
    module: 'users',
  },
  {
    key: 'users.delete',
    label: 'Delete Users',
    description: 'Delete platform users.',
    module: 'users',
  },

  // ============================================================
  // MARKETPLACE
  // ============================================================

  {
    key: 'marketplace.view',
    label: 'View Marketplace',
    description: 'View marketplace administration.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.products.view',
    label: 'View Products',
    description: 'View marketplace products.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.products.manage',
    label: 'Manage Products',
    description: 'Create, edit, suspend and manage products.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.orders.view',
    label: 'View Orders',
    description: 'View marketplace orders.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.orders.manage',
    label: 'Manage Orders',
    description: 'Manage marketplace orders.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.sellers.view',
    label: 'View Sellers',
    description: 'View marketplace sellers.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.sellers.manage',
    label: 'Manage Sellers',
    description: 'Manage marketplace sellers.',
    module: 'marketplace',
  },
  {
    key: 'marketplace.reviews.manage',
    label: 'Manage Reviews',
    description: 'Review and moderate marketplace reviews.',
    module: 'marketplace',
  },

  // ============================================================
  // FINANCE
  // ============================================================

  {
    key: 'finance.view',
    label: 'View Finance',
    description: 'View financial information.',
    module: 'finance',
  },
  {
    key: 'finance.payouts.manage',
    label: 'Manage Payouts',
    description: 'Manage platform payouts.',
    module: 'finance',
  },
  {
    key: 'finance.subscriptions.view',
    label: 'View Subscriptions',
    description: 'View subscription revenue and accounts.',
    module: 'finance',
  },

  // ============================================================
  // MARKETING
  // ============================================================

  {
    key: 'marketing.view',
    label: 'View Marketing',
    description: 'View marketing administration.',
    module: 'marketing',
  },
  {
    key: 'marketing.manage',
    label: 'Manage Marketing',
    description: 'Manage campaigns and advertising.',
    module: 'marketing',
  },

  // ============================================================
  // AI
  // ============================================================

  {
    key: 'ai.view',
    label: 'View AI',
    description: 'View Fockis AI administration.',
    module: 'ai',
  },
  {
    key: 'ai.manage',
    label: 'Manage AI',
    description: 'Manage AI and Vapi configuration.',
    module: 'ai',
  },

  // ============================================================
  // MUSIC
  // ============================================================

  {
    key: 'music.view',
    label: 'View Music',
    description: 'View music administration.',
    module: 'music',
  },
  {
    key: 'music.rules.manage',
    label: 'Manage Music Rules',
    description: 'Manage music platform rules.',
    module: 'music',
  },
  {
    key: 'music.creators.manage',
    label: 'Manage Creator Applications',
    description: 'Review music creator applications.',
    module: 'music',
  },

  // ============================================================
  // TRAVEL
  // ============================================================

  {
    key: 'travel.view',
    label: 'View Travel',
    description: 'View Fockis Travel administration.',
    module: 'travel',
  },
  {
    key: 'travel.manage',
    label: 'Manage Travel',
    description: 'Manage travel operations.',
    module: 'travel',
  },

  // ============================================================
  // PLATFORM
  // ============================================================

  {
    key: 'messages.manage',
    label: 'Manage Messages',
    description: 'Manage platform messaging.',
    module: 'platform',
  },
  {
    key: 'live.manage',
    label: 'Manage Live',
    description: 'Manage live streaming.',
    module: 'platform',
  },
  {
    key: 'meetings.manage',
    label: 'Manage Meetings',
    description: 'Manage Fockis Meetings.',
    module: 'platform',
  },
  {
    key: 'realestate.manage',
    label: 'Manage Real Estate',
    description: 'Manage real estate administration.',
    module: 'platform',
  },
  {
    key: 'documents.manage',
    label: 'Manage Documents',
    description: 'Manage document administration.',
    module: 'platform',
  },
  {
    key: 'design.manage',
    label: 'Manage Design Studio',
    description: 'Manage Design Studio.',
    module: 'platform',
  },
  {
    key: 'playlists.manage',
    label: 'Manage Playlists',
    description: 'Manage playlists.',
    module: 'platform',
  },

  // ============================================================
  // MODERATION
  // ============================================================

  {
    key: 'moderation.view',
    label: 'View Moderation',
    description: 'View moderation queues.',
    module: 'moderation',
  },
  {
    key: 'moderation.manage',
    label: 'Manage Moderation',
    description: 'Perform moderation actions.',
    module: 'moderation',
  },

  // ============================================================
  // SECURITY
  // ============================================================

  {
    key: 'security.view',
    label: 'View Security',
    description: 'View security administration.',
    module: 'security',
  },
  {
    key: 'security.manage',
    label: 'Manage Security',
    description: 'Manage platform security controls.',
    module: 'security',
  },

  // ============================================================
  // AUDIT
  // ============================================================

  {
    key: 'audit.view',
    label: 'View Audit Logs',
    description: 'View administrative audit logs.',
    module: 'audit',
  },

  // ============================================================
  // DOMAINS
  // ============================================================

  {
    key: 'domains.view',
    label: 'View Domains',
    description: 'View domain administration.',
    module: 'domains',
  },
  {
    key: 'domains.manage',
    label: 'Manage Domains',
    description: 'Manage Fockis domains.',
    module: 'domains',
  },

  // ============================================================
  // SYSTEM
  // ============================================================

  {
    key: 'system.settings.manage',
    label: 'Manage System Settings',
    description: 'Manage platform settings.',
    module: 'system',
  },
];