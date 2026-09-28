/**
 * add-member.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for:
 *
 *   POST /organizations/:organizationId/members
 *
 * Supports:
 * - existing platform users
 * - email-based invitations
 * - required Fockis member domains
 * - branch assignment
 * - member roles
 * - member profile information
 *
 * MEMBER DOMAIN
 * -----------------------------------------------------------------------------
 *
 * Organization:
 *
 *   springfieldchurch.fockis.com
 *
 * Member:
 *
 *   john.springfieldchurch.fockis.com
 *
 * Other valid examples:
 *
 *   mary.springfieldchurch.fockis.org
 *   david.springfieldchurch.fockis.net
 *   admin.springfieldchurch.fockis.church
 *
 * Invalid examples:
 *
 *   john.com
 *   john.fockis.com
 *   john.springfieldchurch.com
 *   springfieldchurch.fockis.com
 *   fockis.com
 *
 * IMPORTANT
 * -----------------------------------------------------------------------------
 *
 * The DTO validates the SHAPE of the member domain.
 *
 * MembersService MUST additionally verify that:
 *
 *   memberDomain = <member-prefix>.<organization.domain>
 *
 * For example, if:
 *
 *   organization.domain =
 *   springfieldchurch.fockis.com
 *
 * then:
 *
 *   john.springfieldchurch.fockis.com
 *
 * is valid.
 *
 * But:
 *
 *   john.otherchurch.fockis.com
 *
 * is NOT valid for that organization.
 *
 * The DTO cannot safely determine this because it does not know which
 * organization is represented by :organizationId.
 */

import { Type } from "class-transformer";

import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";

import { MemberRole } from "../../enums/member-role.enum";

/* ============================================================================
   FOCKIS ORGANIZATION DOMAIN RULES
============================================================================ */

/**
 * Supported Fockis organization namespaces.
 *
 * Examples:
 *
 *   springfieldchurch.fockis.com
 *   springfieldchurch.fockis.org
 *   springfieldchurch.fockis.net
 *   springfieldchurch.fockis.edu
 *   springfieldchurch.fockis.church
 *   springfieldchurch.fockis.co
 *   springfieldchurch.fockis.io
 */
export const FOCKIS_ORGANIZATION_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/* ============================================================================
   FOCKIS MEMBER DOMAIN RULES
============================================================================ */

/**
 * Supported Fockis member domain.
 *
 * Structure:
 *
 *   <member-prefix>.<organization-domain>
 *
 * Example:
 *
 *   john.springfieldchurch.fockis.com
 *
 * The member prefix:
 *
 *   - must contain only letters, numbers, and hyphens
 *   - must begin with a letter or number
 *   - must end with a letter or number
 *   - may contain up to 63 characters
 *
 * The organization portion:
 *
 *   - must itself be a valid Fockis organization domain
 *
 * Examples:
 *
 *   john.springfieldchurch.fockis.com
 *   mary.springfieldchurch.fockis.org
 *   david.springfieldchurch.fockis.net
 *   admin.springfieldchurch.fockis.church
 */
export const FOCKIS_MEMBER_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/* ============================================================================
   PROFILE DTO
============================================================================ */

/**
 * Optional profile information supplied when creating the member.
 */
class AddMemberProfileDto {
  /**
   * Member display name.
   */
  @IsString()
  displayName!: string;

  /**
   * Optional avatar URL.
   */
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

/* ============================================================================
   ADD MEMBER DTO
============================================================================ */

export class AddMemberDto {
  /**
   * Existing platform user ID.
   *
   * Use this when the person already has a Fockis platform account.
   *
   * Omit when creating/inviting the member by email.
   */
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * Email address used for:
   *
   * - an invitation
   * - identifying an existing platform account
   */
  @IsOptional()
  @IsEmail()
  email?: string;

  /**
   * REQUIRED Fockis member domain.
   *
   * Example:
   *
   *   john.springfieldchurch.fockis.com
   *
   * The member domain MUST have this structure:
   *
   *   <member-prefix>.<organization-domain>
   *
   * Example:
   *
   *   john
   *   +
   *   springfieldchurch.fockis.com
   *
   *   =
   *
   *   john.springfieldchurch.fockis.com
   *
   * IMPORTANT:
   *
   * MembersService MUST verify that the organization domain belongs to
   * :organizationId.
   */
  @IsString()
  @Matches(FOCKIS_MEMBER_DOMAIN_PATTERN, {
    message:
      "Member domain must be a valid Fockis member domain such as john.springfieldchurch.fockis.com.",
  })
  domain!: string;

  /**
   * Optional branch to which this member belongs.
   */
  @IsOptional()
  @IsString()
  branchId?: string;

  /**
   * Optional member role.
   *
   * MembersService remains responsible for determining whether the
   * authenticated user is allowed to assign the requested role.
   */
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  /**
   * Member profile information.
   */
  @ValidateNested()
  @Type(() => AddMemberProfileDto)
  profile!: AddMemberProfileDto;
}