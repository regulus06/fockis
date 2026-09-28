import {
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";

import {
  Type,
} from "class-transformer";

import {
  BusinessCategory,
} from "../enums/business-category.enum";


/* ============================================================================
   SOCIAL LINKS
============================================================================ */

export class BusinessSocialLinksDto {

  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  facebook?: string;


  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  instagram?: string;


  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  tiktok?: string;


  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(500)
  youtube?: string;


  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
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
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(2000)
  logoUrl?: string;


  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
  @MaxLength(2000)
  coverImageUrl?: string;


  @IsOptional()
  @IsUrl({
    require_protocol: true,
  })
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


  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessSocialLinksDto)
  socialLinks?: BusinessSocialLinksDto;
}