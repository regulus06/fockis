import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";

import {
  CampaignAdFormat,
  CampaignCTA,
  CampaignObjective,
} from "../schemas/campaign.schema";

/* ============================================================
   UPDATE CAMPAIGN DTO

   Used by:

   PATCH /marketing/campaigns/:id

   All fields are optional.

   The service controls whether a campaign is allowed
   to be edited based on its current status.
============================================================ */

export class UpdateCampaignDto {
  /* ============================================================
     BASIC CAMPAIGN
  ============================================================ */

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsEnum(CampaignObjective)
  objective?: CampaignObjective;

  @IsOptional()
  @IsEnum(CampaignAdFormat)
  adFormat?: CampaignAdFormat;

  /* ============================================================
     AD CONTENT
  ============================================================ */

  @IsOptional()
  @IsString()
  @MaxLength(100)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @IsOptional()
  @IsUrl()
  appIconUrl?: string;

  /* ============================================================
     APP INSTALL INFORMATION
  ============================================================ */

  @IsOptional()
  @IsString()
  @MaxLength(150)
  appName?: string;

  @IsOptional()
  @IsUrl()
  appStoreUrl?: string;

  @IsOptional()
  @IsUrl()
  googlePlayUrl?: string;

  @IsOptional()
  @IsEnum(CampaignCTA)
  callToAction?: CampaignCTA;

  /* ============================================================
     TARGETING
  ============================================================ */

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  locations?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(100)
  minimumAge?: number;

  @IsOptional()
  @IsInt()
  @Min(13)
  @Max(100)
  maximumAge?: number;

  /* ============================================================
     BUDGET
  ============================================================ */

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dailyBudget?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalBudget?: number;

  /* ============================================================
     SCHEDULE
  ============================================================ */

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  /* ============================================================
     SELLER STORE

     Empty/null removal is handled by the service.
  ============================================================ */

  @IsOptional()
  @IsMongoId()
  storeId?: string;
}