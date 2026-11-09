
/**
 * create-branch.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for:
 * POST /organizations/:organizationId/branches
 *
 * Also reusable when creating an organization with initial branches.
 * -----------------------------------------------------------------------------
 */

import { Type } from "class-transformer";

import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";

/* ============================================================================
   ADDRESS
============================================================================ */

export class BranchAddressDto {
  @IsString()
  @MaxLength(200)
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  line2?: string;

  @IsString()
  @MaxLength(100)
  city!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @IsString()
  @MaxLength(100)
  country!: string;
}

/* ============================================================================
   CONTACT
============================================================================ */

export class BranchContactDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}

/* ============================================================================
   CREATE BRANCH DTO
============================================================================ */

export class CreateBranchDto {
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isMainLocation?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchAddressDto)
  address?: BranchAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BranchContactDto)
  contact?: BranchContactDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  serviceTimes?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  photoUrl?: string;
}
