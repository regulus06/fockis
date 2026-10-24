
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

import { BusinessCategory } from "../enums/business-category.enum";

import {
  BusinessPrimaryAction,
  BusinessSize,
} from "../schemas/business.schema";

import {
  BusinessHoursEntryDto,
  IsOptionalHttpUrl,
} from "./business-fields.dto";

/*
 * "" and null mean "clear this value" for optional fields.
 */
const hasValue = (
  _object: unknown,
  value: unknown,
) =>
  value !== "" &&
  value !== null &&
  value !== undefined;

/* ============================================================================
   SOCIAL LINKS
============================================================================ */

export class UpdateBusinessSocialLinksDto {
  @IsOptionalHttpUrl()
  @MaxLength(500)
  facebook?: string;

  @IsOptionalHttpUrl()
  @MaxLength(500)
  instagram?: string;

  @IsOptionalHttpUrl()
  @MaxLength(500)
  tiktok?: string;

  @IsOptionalHttpUrl()
  @MaxLength(500)
  youtube?: string;

  @IsOptionalHttpUrl()
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

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @ValidateIf(hasValue)
  @IsInt()
  @Min(1800)
  @Max(2100)
  foundedYear?: number | null;

  @IsOptional()
  @ValidateIf(hasValue)
  @IsEnum(BusinessSize)
  businessSize?: BusinessSize | "" | null;

  // IMAGES

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImageUrl?: string;

  // WEBSITE / CONTACT

  @IsOptionalHttpUrl()
  @MaxLength(2000)
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @ValidateIf(hasValue)
  @IsEmail()
  @MaxLength(255)
  email?: string;

  // FOCKIS SHOP / BUSINESS CARD LINKS

  @IsOptional()
  @ValidateIf(hasValue)
  @IsMongoId()
  storeId?: string | null;

  @IsOptional()
  @ValidateIf(hasValue)
  @IsEnum(BusinessPrimaryAction)
  primaryAction?: BusinessPrimaryAction | "" | null;

  // ADDRESS

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

  // LOCATION

  @IsOptional()
  @ValidateIf(hasValue)
  @IsLatitude()
  latitude?: number | null;

  @IsOptional()
  @ValidateIf(hasValue)
  @IsLongitude()
  longitude?: number | null;

  // OPENING HOURS

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => BusinessHoursEntryDto)
  hours?: BusinessHoursEntryDto[];

  @IsOptional()
  @IsBoolean()
  byAppointmentOnly?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  // SOCIAL LINKS

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateBusinessSocialLinksDto)
  socialLinks?: UpdateBusinessSocialLinksDto;

  // MAIN FOCKIS FEED

  @IsOptional()
  @IsBoolean()
  feedEnabled?: boolean;

  // SPOTLIGHT — INDEPENDENT OF THE MAIN FEED

  @IsOptional()
  @IsBoolean()
  spotlightEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  spotlightPriority?: number;
}
