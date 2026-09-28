/**
 * member-role.enum.ts
 * -----------------------------------------------------------------------------
 * Defines the authority level of a member inside a Church organization.
 *
 * Distinct from MembershipStatus:
 *
 * MembershipStatus:
 *   - pending
 *   - active
 *   - suspended
 *   - etc.
 *
 * MemberRole:
 *   - administrator
 *   - pastor/director
 *   - leader
 *   - department manager
 *   - group leader
 *   - member
 *   - guest
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts -> MemberRole
 * -----------------------------------------------------------------------------
 */

export enum MemberRole {
  /**
   * Full organization administration.
   */
  Administrator = 'administrator',

  /**
   * Organization-wide pastoral/director authority.
   */
  PastorDirector = 'pastor_director',

  /**
   * General leadership role.
   */
  Leader = 'leader',

  /**
   * Manages one or more departments.
   */
  DepartmentManager = 'department_manager',

  /**
   * Leads one or more church groups.
   */
  GroupLeader = 'group_leader',

  /**
   * Standard organization member.
   */
  Member = 'member',

  /**
   * Limited/guest membership.
   */
  Guest = 'guest',
}

/**
 * Roles authorized to access the organization administration console.
 *
 * IMPORTANT:
 * Role alone is NOT sufficient.
 *
 * MembersService.isAdmin() also requires:
 *
 *   membership.status === MembershipStatus.Active
 *
 * Therefore:
 *
 *   Administrator + Active       => ADMIN
 *   PastorDirector + Active      => ADMIN
 *   Administrator + Pending      => NOT ADMIN
 *   PastorDirector + Pending     => NOT ADMIN
 *   Member + Active              => NOT ADMIN
 */
export const ADMIN_MEMBER_ROLES: readonly MemberRole[] = [
  MemberRole.Administrator,
  MemberRole.PastorDirector,
];