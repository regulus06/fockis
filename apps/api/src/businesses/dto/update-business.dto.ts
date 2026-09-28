import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

import {
  BusinessCategory,
} from "../enums/business-category.enum";

/* ============================================================================
   SOCIAL LINKS
============================================================================ */

export class UpdateBusinessSocialLinksDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  linkedin?: string;
}

/* ============================================================================
   UPDATE BUSINESS DTO
============================================================================ */

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(BusinessCategory)
  category?: BusinessCategory;

  // ==========================================================================
  // IMAGES
  // ==========================================================================

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;

  // ==========================================================================
  // WEBSITE / CONTACT
  // ==========================================================================

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  // ==========================================================================
  // ADDRESS
  // ==========================================================================

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  zipCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  // ==========================================================================
  // LOCATION
  // ==========================================================================

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;

  // ==========================================================================
  // SOCIAL LINKS
  // ==========================================================================

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBusinessSocialLinksDto)
  socialLinks?: UpdateBusinessSocialLinksDto;

  // ==========================================================================
  // SPOTLIGHT
  // ==========================================================================

  @IsOptional()
  spotlightEnabled?: boolean;

  @IsOptional()
  spotlightPriority?: number;
}