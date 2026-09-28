/**
 * permission.enum.ts
 * -----------------------------------------------------------------------------
 * Canonical organization-level permissions.
 *
 * OWNER
 * -----------------------------------------------------------------------------
 * The permanent organization owner is Organization.createdByUserId.
 *
 * The owner always has full authority regardless of permissions stored on the
 * membership document.
 *
 * ADMINISTRATOR
 * -----------------------------------------------------------------------------
 * Administrators do NOT automatically receive all permissions.
 *
 * Their access is determined by the permissions assigned to their membership.
 * -----------------------------------------------------------------------------
 */

export enum ChurchPermission {
  /* --------------------------------------------------------------------------
     MEMBERS — READ
  -------------------------------------------------------------------------- */

  ViewMembers = 'view_members',

  /* --------------------------------------------------------------------------
     MEMBERS — WRITE
  -------------------------------------------------------------------------- */

  AddMember = 'add_member',
  UpdateMember = 'update_member',
  RemoveMember = 'remove_member',
  ApproveMember = 'approve_member',
  RejectMember = 'reject_member',

  /* --------------------------------------------------------------------------
     MEMBER PRIVATE INFORMATION
  -------------------------------------------------------------------------- */

  ViewPrivateMemberInfo = 'view_private_member_info',

  /* --------------------------------------------------------------------------
     ADMINISTRATORS / PERMISSIONS
  -------------------------------------------------------------------------- */

  ManageAdministrators = 'manage_administrators',
  ManagePermissions = 'manage_permissions',

  /* --------------------------------------------------------------------------
     ORGANIZATION
  -------------------------------------------------------------------------- */

  UpdateOrganization = 'update_organization',
  ManageSettings = 'manage_settings',

  /* --------------------------------------------------------------------------
     ORGANIZATION LIFECYCLE
  -------------------------------------------------------------------------- */

  ArchiveOrganization = 'archive_organization',
  DeleteOrganization = 'delete_organization',

  /* --------------------------------------------------------------------------
     BRANCHES
  -------------------------------------------------------------------------- */

  ViewBranches = 'view_branches',
  ManageBranches = 'manage_branches',

  /* --------------------------------------------------------------------------
     DEPARTMENTS
  -------------------------------------------------------------------------- */

  ViewDepartments = 'view_departments',
  ManageDepartments = 'manage_departments',

  /* --------------------------------------------------------------------------
     GROUPS
  -------------------------------------------------------------------------- */

  ViewGroups = 'view_groups',
  ManageGroups = 'manage_groups',

  /* --------------------------------------------------------------------------
     EVENTS
  -------------------------------------------------------------------------- */

  ViewEvents = 'view_events',
  ManageEvents = 'manage_events',

  /* --------------------------------------------------------------------------
     LEADERSHIP
  -------------------------------------------------------------------------- */

  ViewLeadership = 'view_leadership',
  ManageLeadership = 'manage_leadership',

  /* --------------------------------------------------------------------------
     LIVE
  -------------------------------------------------------------------------- */

  ViewLive = 'view_live',
  ManageLive = 'manage_live',

  /* --------------------------------------------------------------------------
     MEDIA
  -------------------------------------------------------------------------- */

  ViewMedia = 'view_media',
  ManageMedia = 'manage_media',

  /* --------------------------------------------------------------------------
     COMMUNICATION
  -------------------------------------------------------------------------- */

  ViewCommunication = 'view_communication',
  ManageCommunication = 'manage_communication',

  /* --------------------------------------------------------------------------
     ATTENDANCE
  -------------------------------------------------------------------------- */

  ViewAttendance = 'view_attendance',
  ManageAttendance = 'manage_attendance',
}