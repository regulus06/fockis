/**
 * create-organization.dto.ts
 * ---
 * Payload for POST /church/organizations.
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts
 *
 * Supports:
 * - organization information
 * - required Fockis organization domain
 * - branding
 * - contact information
 * - social links
 * - multiple branches
 * - branch addresses
 * - frontend address aliases
 */

import { Type } from "class-transformer";

import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from "class-validator";

import { OrganizationType } from "../../enums/organization-type.enum";

/* ============================================================================
 * FOCKIS ORGANIZATION DOMAINS
 * ========================================================================== */

export const FOCKIS_DOMAIN_SUFFIXES = [
  ".fockis.com",
  ".fockis.org",
  ".fockis.net",
  ".fockis.edu",
  ".fockis.church",
  ".fockis.co",
  ".fockis.io",
] as const;

/**
 * Organization domain format:
 *
 * springfieldchurch.fockis.com
 * springfieldchurch.fockis.org
 * springfieldchurch.fockis.net
 * springfieldchurch.fockis.edu
 * springfieldchurch.fockis.church
 * springfieldchurch.fockis.co
 * springfieldchurch.fockis.io
 *
 * The organization name/prefix:
 * - must contain only lowercase letters, numbers, and hyphens
 * - must start and end with a letter or number
 * - must be 2–63 characters
 */
const FOCKIS_DOMAIN_PATTERN =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.fockis\.(?:com|org|net|edu|church|co|io)$/i;

/* ============================================================================
 * SOCIAL LINKS
 * ========================================================================== */

export class OrganizationSocialLinksDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  youtube?: string;

  @IsOptional()
  @IsString()
  x?: string;

  @IsOptional()
  @IsString()
  tiktok?: string;
}

/* ============================================================================
 * CONTACT
 * ========================================================================== */

export class OrganizationContactDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSocialLinksDto)
  socialLinks?: OrganizationSocialLinksDto;
}

/* ============================================================================
 * BRANCH ADDRESS
 * ========================================================================== */

export class OrganizationBranchAddressDto {
  /**
   * Frontend field:
   * "Address line 1"
   */
  @IsOptional()
  @IsString()
  line1?: string;

  /**
   * Backend/API-compatible alias.
   */
  @IsOptional()
  @IsString()
  street?: string;

  /**
   * Frontend-compatible second address line.
   */
  @IsOptional()
  @IsString()
  line2?: string;

  /**
   * Backend/API-compatible alias.
   */
  @IsOptional()
  @IsString()
  street2?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  stateCode?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  /**
   * Frontend may use zipCode.
   */
  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  /**
   * Frontend-compatible coordinate aliases.
   */
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  /**
   * Optional formatted address.
   */
  @IsOptional()
  @IsString()
  formatted?: string;
}

/* ============================================================================
 * BRANCH
 * ========================================================================== */

export class CreateOrganizationBranchDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isMainLocation?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationBranchAddressDto)
  address?: OrganizationBranchAddressDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

/* ============================================================================
 * CREATE ORGANIZATION
 * ========================================================================== */

export class CreateOrganizationDto {
  @IsString()
  name!: string;

  /**
   * Required Fockis organization domain.
   *
   * Examples:
   * springfieldchurch.fockis.com
   * springfieldchurch.fockis.org
   * springfieldchurch.fockis.net
   * springfieldchurch.fockis.edu
   * springfieldchurch.fockis.church
   * springfieldchurch.fockis.co
   * springfieldchurch.fockis.io
   *
   * Invalid:
   * fockis.com
   * springfieldchurch.com
   * springfieldchurch.org
   */
  @IsString()
  @Matches(FOCKIS_DOMAIN_PATTERN, {
    message:
      "Organization domain must be a valid Fockis domain such as springfieldchurch.fockis.com, springfieldchurch.fockis.org, springfieldchurch.fockis.net, springfieldchurch.fockis.edu, springfieldchurch.fockis.church, springfieldchurch.fockis.co, or springfieldchurch.fockis.io.",
  })
  domain!: string;

  @IsEnum(OrganizationType)
  organizationType!: OrganizationType;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationContactDto)
  contact?: OrganizationContactDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrganizationBranchDto)
  branches?: CreateOrganizationBranchDto[];
}