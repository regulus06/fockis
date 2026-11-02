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
    key: "administrators.view",
    label: "View Administrators",
    description: "View Fockis administrators.",
    module: "administration",
  },
  {
    key: "administrators.create",
    label: "Create Administrators",
    description: "Create new administrators.",
    module: "administration",
  },
  {
    key: "administrators.update",
    label: "Update Administrators",
    description: "Update administrator accounts.",
    module: "administration",
  },
  {
    key: "administrators.delete",
    label: "Delete Administrators",
    description: "Delete administrator accounts.",
    module: "administration",
  },
  {
    key: "administrators.roles.manage",
    label: "Manage Administrator Roles",
    description:
      "Assign and change administrator roles.",
    module: "administration",
  },

  // ============================================================
  // USERS — GENERAL
  // ============================================================

  {
    key: "users.view",
    label: "View Users",
    description:
      "View the platform user administration list.",
    module: "users",
  },
  {
    key: "users.details.view",
    label: "View User Details",
    description:
      "View detailed administrative information about users.",
    module: "users",
  },
  {
    key: "users.manage",
    label: "Manage Users",
    description:
      "Perform general user administration actions.",
    module: "users",
  },
  {
    key: "users.delete",
    label: "Delete Users",
    description:
      "Delete platform users.",
    module: "users",
  },
  {
    key: "users.export",
    label: "Export Users",
    description:
      "Export authorized user administration data.",
    module: "users",
  },
  {
    key: "users.bulk.manage",
    label: "Manage Bulk User Actions",
    description:
      "Perform bulk administrative actions on users.",
    module: "users",
  },

  // ============================================================
  // USERS — PROFILE
  // ============================================================

  {
    key: "users.profile.manage",
    label: "Manage User Profiles",
    description:
      "Update authorized user profile information.",
    module: "users",
  },

  // ============================================================
  // USERS — ACCOUNT STATUS
  // ============================================================

  {
    key: "users.status.manage",
    label: "Manage User Status",
    description:
      "Change user account status.",
    module: "users",
  },
  {
    key: "users.lock",
    label: "Lock User Accounts",
    description:
      "Temporarily lock user accounts.",
    module: "users",
  },
  {
    key: "users.unlock",
    label: "Unlock User Accounts",
    description:
      "Unlock user accounts.",
    module: "users",
  },

  // ============================================================
  // USERS — ROLES
  // ============================================================

  {
    key: "users.roles.manage",
    label: "Manage User Roles",
    description:
      "Assign or change user system and custom administrative roles.",
    module: "users",
  },

  // ============================================================
  // USERS — PERMISSIONS
  // ============================================================

  {
    key: "users.permissions.manage",
    label: "Manage User Permissions",
    description:
      "Assign or remove direct permissions from users.",
    module: "users",
  },

  // ============================================================
  // USERS — VERIFICATION
  // ============================================================

  {
    key: "users.verification.manage",
    label: "Manage User Verification",
    description:
      "Manage user verification status.",
    module: "users",
  },

  // ============================================================
  // USERS — PREMIUM
  // ============================================================

  {
    key: "users.premium.manage",
    label: "Manage User Premium",
    description:
      "Manage user premium and subscription status.",
    module: "users",
  },

  // ============================================================
  // USERS — FOCKIS ID
  // ============================================================

  {
    key: "users.fockis_id.manage",
    label: "Manage Fockis ID Access",
    description:
      "Manage Fockis ID access for users.",
    module: "users",
  },

  // ============================================================
  // USERS — PASSWORD SECURITY
  // ============================================================

  {
    key: "users.force_password_change",
    label: "Force Password Change",
    description:
      "Force a user to change their password.",
    module: "users",
  },
  {
    key: "users.reset_password",
    label: "Reset User Password",
    description:
      "Reset a user's password through administration.",
    module: "users",
  },

  // ============================================================
  // USERS — ACTIVITY
  // ============================================================

  {
    key: "users.activity.view",
    label: "View User Activity",
    description:
      "View administrative user activity information.",
    module: "users",
  },

  // ============================================================
  // USERS — MESSAGES
  // ============================================================

  {
    key: "users.messages.view",
    label: "View User Messages",
    description:
      "View authorized user messaging information.",
    module: "users",
  },

  // ============================================================
  // USERS — BOOKINGS
  // ============================================================

  {
    key: "users.bookings.view",
    label: "View User Bookings",
    description:
      "View authorized user booking information.",
    module: "users",
  },

  // ============================================================
  // USERS — PAYMENTS
  // ============================================================

  {
    key: "users.payments.view",
    label: "View User Payments",
    description:
      "View authorized user payment information.",
    module: "users",
  },

  // ============================================================
  // USERS — REPORTS
  // ============================================================

  {
    key: "users.reports.view",
    label: "View User Reports",
    description:
      "View reports associated with users.",
    module: "users",
  },

  // ============================================================
  // USERS — SECURITY
  // ============================================================

  {
    key: "users.security.view",
    label: "View User Security",
    description:
      "View authorized user security information.",
    module: "users",
  },

  // ============================================================
  // USERS — DOMAINS
  // ============================================================

  {
    key: "users.domains.view",
    label: "View User Domains",
    description:
      "View authorized domain information associated with users.",
    module: "users",
  },

  // ============================================================
  // MARKETPLACE
  // ============================================================

  {
    key: "marketplace.view",
    label: "View Marketplace",
    description:
      "View marketplace administration.",
    module: "marketplace",
  },
  {
    key: "marketplace.products.view",
    label: "View Products",
    description:
      "View marketplace products.",
    module: "marketplace",
  },
  {
    key: "marketplace.products.manage",
    label: "Manage Products",
    description:
      "Create, edit, suspend and manage products.",
    module: "marketplace",
  },
  {
    key: "marketplace.orders.view",
    label: "View Orders",
    description:
      "View marketplace orders.",
    module: "marketplace",
  },
  {
    key: "marketplace.orders.manage",
    label: "Manage Orders",
    description:
      "Manage marketplace orders.",
    module: "marketplace",
  },
  {
    key: "marketplace.sellers.view",
    label: "View Sellers",
    description:
      "View marketplace sellers.",
    module: "marketplace",
  },
  {
    key: "marketplace.sellers.manage",
    label: "Manage Sellers",
    description:
      "Manage marketplace sellers.",
    module: "marketplace",
  },
  {
    key: "marketplace.reviews.manage",
    label: "Manage Reviews",
    description:
      "Review and moderate marketplace reviews.",
    module: "marketplace",
  },

  // ============================================================
  // FINANCE
  // ============================================================

  {
    key: "finance.view",
    label: "View Finance",
    description:
      "View financial information.",
    module: "finance",
  },
  {
    key: "finance.payouts.manage",
    label: "Manage Payouts",
    description:
      "Manage platform payouts.",
    module: "finance",
  },
  {
    key: "finance.subscriptions.view",
    label: "View Subscriptions",
    description:
      "View subscription revenue and accounts.",
    module: "finance",
  },

  // ============================================================
  // MARKETING
  // ============================================================

  {
    key: "marketing.view",
    label: "View Marketing",
    description:
      "View marketing administration.",
    module: "marketing",
  },
  {
    key: "marketing.manage",
    label: "Manage Marketing",
    description:
      "Manage campaigns and advertising.",
    module: "marketing",
  },

  // ============================================================
  // AI
  // ============================================================

  {
    key: "ai.view",
    label: "View AI",
    description:
      "View Fockis AI administration.",
    module: "ai",
  },
  {
    key: "ai.manage",
    label: "Manage AI",
    description:
      "Manage AI and Vapi configuration.",
    module: "ai",
  },

  // ============================================================
  // MUSIC
  // ============================================================

  {
    key: "music.view",
    label: "View Music",
    description:
      "View music administration.",
    module: "music",
  },
  {
    key: "music.rules.manage",
    label: "Manage Music Rules",
    description:
      "Manage music platform rules.",
    module: "music",
  },
  {
    key: "music.creators.manage",
    label: "Manage Creator Applications",
    description:
      "Review music creator applications.",
    module: "music",
  },

  // ============================================================
  // TRAVEL
  // ============================================================

  {
    key: "travel.view",
    label: "View Travel",
    description:
      "View Fockis Travel administration.",
    module: "travel",
  },
  {
    key: "travel.manage",
    label: "Manage Travel",
    description:
      "Manage travel operations.",
    module: "travel",
  },

  // ============================================================
  // PLATFORM
  // ============================================================

  {
    key: "messages.manage",
    label: "Manage Messages",
    description:
      "Manage platform messaging.",
    module: "platform",
  },
  {
    key: "live.manage",
    label: "Manage Live",
    description:
      "Manage live streaming.",
    module: "platform",
  },
  {
    key: "meetings.manage",
    label: "Manage Meetings",
    description:
      "Manage Fockis Meetings.",
    module: "platform",
  },
  {
    key: "realestate.manage",
    label: "Manage Real Estate",
    description:
      "Manage real estate administration.",
    module: "platform",
  },
  {
    key: "documents.manage",
    label: "Manage Documents",
    description:
      "Manage document administration.",
    module: "platform",
  },
  {
    key: "design.manage",
    label: "Manage Design Studio",
    description:
      "Manage Design Studio.",
    module: "platform",
  },
  {
    key: "playlists.manage",
    label: "Manage Playlists",
    description:
      "Manage playlists.",
    module: "platform",
  },

  // ============================================================
  // MODERATION
  // ============================================================

  {
    key: "moderation.view",
    label: "View Moderation",
    description:
      "View moderation queues.",
    module: "moderation",
  },
  {
    key: "moderation.manage",
    label: "Manage Moderation",
    description:
      "Perform moderation actions.",
    module: "moderation",
  },
  {
    key: "moderation.review",
    label: "Review Reports",
    description:
      "Open cases, change review status, add internal notes and mark reports invalid.",
    module: "moderation",
  },
  {
    key: "moderation.assign",
    label: "Assign Cases",
    description:
      "Assign moderation cases to moderators.",
    module: "moderation",
  },
  {
    key: "moderation.resolve",
    label: "Resolve Cases",
    description:
      "Dismiss reports or confirm a violation.",
    module: "moderation",
  },
  {
    key: "moderation.content.remove",
    label: "Remove Reported Content",
    description:
      "Remove posts after a confirmed violation.",
    module: "moderation",
  },
  {
    key: "moderation.warn",
    label: "Warn Users",
    description:
      "Send a moderation warning after a confirmed violation.",
    module: "moderation",
  },
  {
    key: "moderation.restrict",
    label: "Restrict Posting",
    description:
      "Temporarily restrict an account from posting.",
    module: "moderation",
  },
  {
    key: "moderation.suspend",
    label: "Suspend Accounts",
    description:
      "Temporarily or permanently suspend accounts after a confirmed violation.",
    module: "moderation",
  },
  {
    key: "moderation.restore",
    label: "Restore Content and Accounts",
    description:
      "Reverse moderation decisions and lift restrictions.",
    module: "moderation",
  },
  {
    key: "moderation.appeals",
    label: "Review Appeals",
    description:
      "Review and decide user appeals.",
    module: "moderation",
  },
  {
    key: "moderation.settings",
    label: "Moderation Settings",
    description:
      "Change report thresholds and alert settings.",
    module: "moderation",
  },

  // ============================================================
  // SECURITY
  // ============================================================

  {
    key: "security.view",
    label: "View Security",
    description:
      "View security administration.",
    module: "security",
  },
  {
    key: "security.manage",
    label: "Manage Security",
    description:
      "Manage platform security controls.",
    module: "security",
  },

  // ============================================================
  // AUDIT
  // ============================================================

  {
    key: "audit.view",
    label: "View Audit Logs",
    description:
      "View administrative audit logs.",
    module: "audit",
  },

  // ============================================================
  // DOMAINS
  // ============================================================

  {
    key: "domains.view",
    label: "View Domains",
    description:
      "View domain administration.",
    module: "domains",
  },
  {
    key: "domains.manage",
    label: "Manage Domains",
    description:
      "Manage Fockis domains.",
    module: "domains",
  },

  // ============================================================
  // HELP & SUPPORT
  // ============================================================

  {
    key: "support.view",
    label: "View Support",
    description: "View feedback, support tickets and live chats.",
    module: "support",
  },
  {
    key: "support.respond",
    label: "Respond to Users",
    description: "Reply to feedback, tickets and live chats, and add internal notes.",
    module: "support",
  },
  {
    key: "support.assign",
    label: "Assign Support Work",
    description: "Assign, transfer and escalate tickets, chats and feedback.",
    module: "support",
  },
  {
    key: "support.resolve",
    label: "Resolve Support Work",
    description: "Change status and priority, close, reopen and archive.",
    module: "support",
  },
  {
    key: "support.settings",
    label: "Support Settings",
    description: "Switch live chat availability on or off.",
    module: "support",
  },
  {
    key: "help.content.manage",
    label: "Manage Help Articles",
    description: "Create, edit, publish and archive Help Center articles and FAQs.",
    module: "support",
  },

  // ============================================================
  // MAPS
  // ============================================================

  {
    key: "map.addresses.view",
    label: "View Address Requests",
    description: "See Smart Addresses people add, with their pin, details and owner, to review them.",
    module: "maps",
  },
  {
    key: "map.addresses.verify",
    label: "Verify Addresses",
    description: "Approve, reject or ask for more information on Smart Addresses.",
    module: "maps",
  },
  {
    key: "legal.view",
    label: "View Legal & Evidence",
    description: "Open the Legal & Evidence dashboard and list holds, requests and records (no record contents).",
    module: "legal",
  },
  {
    key: "legal.evidence.view",
    label: "View Preserved Evidence",
    description: "Open preserved record contents. Every access requires a reason and is logged.",
    module: "legal",
  },
  {
    key: "legal.evidence.preserve",
    label: "Preserve Evidence",
    description: "Preserve records under a legal hold or verified request.",
    module: "legal",
  },
  {
    key: "legal.evidence.export",
    label: "Export Evidence",
    description: "Create evidence packages with hashes and chain of custody.",
    module: "legal",
  },
  {
    key: "legal.holds.manage",
    label: "Manage Legal Holds",
    description: "Create, update and release legal holds.",
    module: "legal",
  },
  {
    key: "legal.requests.manage",
    label: "Manage Legal Requests",
    description: "Record, verify and work on legal requests.",
    module: "legal",
  },
  {
    key: "legal.requests.approve",
    label: "Approve Disclosure",
    description: "Approve or deny disclosure for a verified legal request.",
    module: "legal",
  },
  {
    key: "legal.retention.manage",
    label: "Manage Retention Policies",
    description: "Change retention periods and run the retention job.",
    module: "legal",
  },
  {
    key: "legal.audit.view",
    label: "View Evidence Access Logs",
    description: "Read the tamper-evident evidence access log.",
    module: "legal",
  },
  {
    key: "legal.deletions.view",
    label: "View Deleted Account Records",
    description: "Read minimal records of account deletions.",
    module: "legal",
  },
  {
    key: "policy.view",
    label: "View Policies",
    description: "Open Policy & Compliance: library, versions, approvals and rules.",
    module: "policy",
  },
  {
    key: "policy.edit",
    label: "Edit Policies",
    description: "Create policies, edit drafts, create versions and submit them for approval.",
    module: "policy",
  },
  {
    key: "policy.review",
    label: "Approve Policies",
    description: "Approve, reject or request changes on submitted policy versions and rules.",
    module: "policy",
  },
  {
    key: "policy.publish",
    label: "Publish Policies",
    description: "Schedule and publish approved versions, archive and restore policies.",
    module: "policy",
  },
  {
    key: "policy.rules.manage",
    label: "Manage Operational Rules",
    description: "Create and edit operational rules and submit them for approval.",
    module: "policy",
  },
  {
    key: "policy.acceptance.view",
    label: "View Acceptance Records",
    description: "View and export policy acceptance records and handle data correction requests.",
    module: "policy",
  },
  {
    key: "policy.audit.view",
    label: "View Policy Audit Log",
    description: "Read the policy audit log.",
    module: "policy",
  },
  {
    key: "policy.settings",
    label: "Policy Settings",
    description: "Change approval, notification and versioning settings.",
    module: "policy",
  },

  // ============================================================
  // SYSTEM
  // ============================================================

  {
    key: "system.settings.manage",
    label: "Manage System Settings",
    description:
      "Manage platform settings.",
    module: "system",
  },
];
