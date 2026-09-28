/**
 * create-branch.dto.ts
 * -----------------------------------------------------------------------------
 * Payload for POST /organizations/:organizationId/branches.
 * -----------------------------------------------------------------------------
 */

import { Type } from "class-transformer";

import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/* ============================================================================
   ADDRESS
============================================================================ */

class BranchAddressDto {
  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsString()
  country!: string;
}

/* ============================================================================
   CONTACT
============================================================================ */

class BranchContactDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

/* ============================================================================
   CREATE BRANCH DTO
============================================================================ */

export class CreateBranchDto {
  @IsString()
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
  timezone?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}