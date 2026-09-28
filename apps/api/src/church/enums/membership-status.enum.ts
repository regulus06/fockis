/**
 * membership-status.enum.ts
 * Mirrors web/src/features/church/types/church.types.ts -> MembershipStatus.
 * Describes where a member is in the membership lifecycle — kept distinct
 * from MemberRole, which describes their level of authority.
 */

export enum MembershipStatus {
  Pending = 'pending',
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived',
}
