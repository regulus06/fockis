/**
 * permissionCatalog.ts — labels and grouping for the server's ChurchPermission
 * values (apps/api/src/org/enums/permission.enum.ts). The server enforces them;
 * this file only names and groups them.
 *
 * In Fockis, permissions belong to each team member (not to a role): an
 * administrator-level role (Administrator, Pastor / Director) can use any
 * permission granted to them; other roles can only use "view" permissions.
 */

export interface PermissionDef {
  id: string;
  label: string;
  action: "view" | "create" | "edit" | "delete" | "approve" | "manage";
  /** Only the owner may grant it (the server refuses others). */
  dangerous?: boolean;
}

export interface PermissionModule {
  id: string;
  label: string;
  permissions: PermissionDef[];
  note?: string;
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    id: "members",
    label: "Members",
    permissions: [
      { id: "view_members", label: "View members", action: "view" },
      { id: "add_member", label: "Add members", action: "create" },
      { id: "update_member", label: "Edit members", action: "edit" },
      { id: "remove_member", label: "Remove members", action: "delete" },
      { id: "approve_member", label: "Approve requests", action: "approve" },
      { id: "reject_member", label: "Reject requests", action: "approve" },
      { id: "view_private_member_info", label: "View private information", action: "view" },
    ],
  },
  { id: "ministries", label: "Ministries", permissions: [{ id: "view_departments", label: "View", action: "view" }, { id: "manage_departments", label: "Manage", action: "manage" }] },
  { id: "groups", label: "Groups & Communities", permissions: [{ id: "view_groups", label: "View", action: "view" }, { id: "manage_groups", label: "Manage", action: "manage" }] },
  { id: "events", label: "Events", permissions: [{ id: "view_events", label: "View", action: "view" }, { id: "manage_events", label: "Manage", action: "manage" }] },
  { id: "attendance", label: "Attendance", permissions: [{ id: "view_attendance", label: "View", action: "view" }, { id: "manage_attendance", label: "Manage", action: "manage" }] },
  { id: "communication", label: "Communication", permissions: [{ id: "view_communication", label: "View", action: "view" }, { id: "manage_communication", label: "Manage", action: "manage" }] },
  { id: "media", label: "Media & Documents", permissions: [{ id: "view_media", label: "View", action: "view" }, { id: "manage_media", label: "Manage", action: "manage" }] },
  { id: "live", label: "Live Streaming", permissions: [{ id: "view_live", label: "View", action: "view" }, { id: "manage_live", label: "Manage", action: "manage" }] },
  { id: "leadership", label: "Leadership", permissions: [{ id: "view_leadership", label: "View", action: "view" }, { id: "manage_leadership", label: "Manage", action: "manage" }] },
  {
    id: "profile",
    label: "Profile & Locations",
    permissions: [
      { id: "update_organization", label: "Edit profile", action: "edit" },
      { id: "view_branches", label: "View locations", action: "view" },
      { id: "manage_branches", label: "Manage locations", action: "manage" },
    ],
  },
  {
    id: "settings",
    label: "Settings & Roles · Giving",
    note: "Giving, Quick Settings and currencies use the Settings permission.",
    permissions: [
      { id: "manage_settings", label: "Manage settings & giving", action: "manage" },
      { id: "manage_administrators", label: "Manage administrators", action: "manage", dangerous: true },
      { id: "manage_permissions", label: "Manage permissions", action: "manage", dangerous: true },
    ],
  },
  {
    id: "organization",
    label: "Organization",
    permissions: [
      { id: "archive_organization", label: "Archive / reactivate", action: "manage", dangerous: true },
      { id: "delete_organization", label: "Delete permanently", action: "delete", dangerous: true },
    ],
  },
];

export const ALL_PERMISSION_IDS = PERMISSION_MODULES.flatMap((m) => m.permissions.map((p) => p.id));
export const ADMIN_ROLES = ["administrator", "pastor_director"];

export const ROLE_OPTIONS: { id: string; label: string; admin: boolean }[] = [
  { id: "administrator", label: "Organization Admin", admin: true },
  { id: "pastor_director", label: "Pastor / Director", admin: true },
  { id: "leader", label: "Leader", admin: false },
  { id: "department_manager", label: "Ministry Director", admin: false },
  { id: "group_leader", label: "Group Leader", admin: false },
  { id: "member", label: "Member", admin: false },
  { id: "guest", label: "Guest", admin: false },
];

export const roleLabel = (role: string, isOwner = false) => (isOwner ? "Owner" : (ROLE_OPTIONS.find((r) => r.id === role)?.label ?? role));

/** Ready-made permission sets for common church positions (applied to one person). */
export const PRESETS: { id: string; label: string; role: string; permissions: string[] }[] = [
  {
    id: "senior_pastor",
    label: "Senior Pastor",
    role: "pastor_director",
    permissions: ["view_members", "add_member", "update_member", "approve_member", "reject_member", "view_private_member_info", "view_departments", "manage_departments", "view_groups", "manage_groups", "view_events", "manage_events", "view_attendance", "manage_attendance", "view_communication", "manage_communication", "view_media", "manage_media", "view_live", "manage_live", "view_leadership", "manage_leadership", "view_branches"],
  },
  {
    id: "org_admin",
    label: "Organization Admin",
    role: "administrator",
    permissions: ["view_members", "add_member", "update_member", "remove_member", "approve_member", "reject_member", "view_private_member_info", "view_departments", "manage_departments", "view_groups", "manage_groups", "view_events", "manage_events", "view_attendance", "manage_attendance", "view_communication", "manage_communication", "view_media", "manage_media", "view_live", "manage_live", "view_leadership", "manage_leadership", "update_organization", "view_branches", "manage_branches", "manage_settings"],
  },
  { id: "secretary", label: "Church Secretary", role: "administrator", permissions: ["view_members", "add_member", "update_member", "approve_member", "reject_member", "view_events", "manage_events", "view_communication", "manage_communication", "view_attendance", "manage_attendance", "view_branches"] },
  { id: "treasurer", label: "Treasurer", role: "administrator", permissions: ["view_members", "manage_settings", "view_events"] },
  { id: "ministry_director", label: "Ministry Director", role: "administrator", permissions: ["view_members", "view_departments", "manage_departments", "view_groups", "manage_groups", "view_events", "manage_events", "view_attendance", "manage_attendance"] },
  { id: "event_coordinator", label: "Event Coordinator", role: "administrator", permissions: ["view_members", "view_events", "manage_events", "view_attendance", "manage_attendance"] },
  { id: "media_director", label: "Media Director", role: "administrator", permissions: ["view_media", "manage_media", "view_live", "manage_live", "view_communication"] },
  { id: "membership_manager", label: "Membership Manager", role: "administrator", permissions: ["view_members", "add_member", "update_member", "approve_member", "reject_member", "view_private_member_info"] },
  { id: "volunteer", label: "Volunteer", role: "member", permissions: ["view_events", "view_groups"] },
];
