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
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

import {
  Type,
} from "class-transformer";

import {
  BusinessCategory,
} from "../enums/business-category.enum";

import {
  BusinessPrimaryAction,
  BusinessSize,
} from "../schemas/business.schema";

import {
  BusinessHoursEntryDto,
  IsOptionalHttpUrl,
} from "./business-fields.dto";


/* ============================================================================
   SOCIAL LINKS
============================================================================ */

export class BusinessSocialLinksDto {

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
   CREATE BUSINESS DTO
============================================================================ */

export class CreateBusinessDto {

  @IsString()
  @MaxLength(120)
  name!: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  @IsEnum(BusinessCategory)
  category!: BusinessCategory;


  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;


  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  foundedYear?: number;


  @IsOptional()
  @IsEnum(BusinessSize)
  businessSize?: BusinessSize;


  /* ==========================================================================
     IMAGES

     Uploaded images are attached after creation through
     POST /businesses/:id/logo and POST /businesses/:id/cover-image.
  ========================================================================== */

  @IsOptionalHttpUrl()
  @MaxLength(2000)
  logoUrl?: string;


  @IsOptionalHttpUrl()
  @MaxLength(2000)
  coverImageUrl?: string;


  /* ==========================================================================
     CONTACT
  ========================================================================== */

  @IsOptionalHttpUrl()
  @MaxLength(2000)
  websiteUrl?: string;


  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;


  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;


  /* ==========================================================================
     FOCKIS SHOP / BUSINESS CARD LINKS
  ========================================================================== */

  @IsOptional()
  @IsMongoId()
  storeId?: string | null;


  @IsOptional()
  @IsEnum(BusinessPrimaryAction)
  primaryAction?: BusinessPrimaryAction | null;


  /* ==========================================================================
     ADDRESS
  ========================================================================== */

  @IsOptional()
  @IsString()
  @MaxLength(200)
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


  @IsOptional()
  @IsLatitude()
  latitude?: number;


  @IsOptional()
  @IsLongitude()
  longitude?: number;


  /* ==========================================================================
     OPENING HOURS
  ========================================================================== */

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({
    each: true,
  })
  @Type(() => BusinessHoursEntryDto)
  hours?: BusinessHoursEntryDto[];


  @IsOptional()
  @IsBoolean()
  byAppointmentOnly?: boolean;


  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;


  /* ==========================================================================
     SOCIAL
  ========================================================================== */

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessSocialLinksDto)
  socialLinks?: BusinessSocialLinksDto;
}
