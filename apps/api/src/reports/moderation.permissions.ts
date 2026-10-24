import { Permission } from "../admin/rbac/permissions.enum";

/** Granular permissions used by the reports & moderation module. */
export const MODERATION_PERMISSIONS = {
  VIEW: Permission.MODERATION_VIEW,
  REVIEW: Permission.MODERATION_REVIEW,
  ASSIGN: Permission.MODERATION_ASSIGN,
  RESOLVE: Permission.MODERATION_RESOLVE,
  CONTENT_REMOVE: Permission.MODERATION_CONTENT_REMOVE,
  WARN: Permission.MODERATION_WARN,
  RESTRICT: Permission.MODERATION_RESTRICT,
  SUSPEND: Permission.MODERATION_SUSPEND,
  RESTORE: Permission.MODERATION_RESTORE,
  APPEALS: Permission.MODERATION_APPEALS,
  SETTINGS: Permission.MODERATION_SETTINGS,
} as const;
