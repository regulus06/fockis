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
  ValidateIf,
} from "class-validator";

import {
  CampaignAdFormat,
  CampaignCTA,
  CampaignObjective,
  CampaignPlacement,
} from "../schemas/campaign.schema";


/* ============================================================
   CREATE CAMPAIGN DTO
============================================================ */

export class CreateCampaignDto {

  @IsString()
  @MaxLength(150)
  name!: string;


  @IsEnum(CampaignObjective)
  objective!: CampaignObjective;


  @IsEnum(CampaignAdFormat)
  adFormat!: CampaignAdFormat;


  /* ============================================================
     PLACEMENTS
  ============================================================ */

  @IsArray()
  @IsEnum(CampaignPlacement, {
    each: true,
  })
  placements!: CampaignPlacement[];


  /* ============================================================
     AD CONTENT
  ============================================================ */

  @IsString()
  @MaxLength(100)
  headline!: string;


  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;


  /* ============================================================
     MEDIA
  ============================================================ */

  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
  })
  mediaUrl?: string;


  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
  })
  thumbnailUrl?: string;


  @IsOptional()
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
  })
  appIconUrl?: string;


  /* ============================================================
     APP INSTALL
  ============================================================ */

  @ValidateIf(
    (dto) =>
      dto.objective ===
      CampaignObjective.APP_INSTALL,
  )
  @IsString()
  @MaxLength(150)
  appName?: string;


  @ValidateIf(
    (dto) =>
      dto.objective ===
      CampaignObjective.APP_INSTALL,
  )
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
  })
  appStoreUrl?: string;


  @ValidateIf(
    (dto) =>
      dto.objective ===
      CampaignObjective.APP_INSTALL,
  )
  @IsUrl({
    protocols: ["http", "https"],
    require_protocol: true,
  })
  googlePlayUrl?: string;


  @IsOptional()
  @IsEnum(CampaignCTA)
  callToAction?: CampaignCTA;


  /* ============================================================
     TARGETING
  ============================================================ */

  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  locations?: string[];


  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  interests?: string[];


  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
  categories?: string[];


  @IsOptional()
  @IsArray()
  @IsString({
    each: true,
  })
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

  @IsNumber()
  @Min(0.01)
  dailyBudget!: number;


  @IsNumber()
  @Min(0.01)
  totalBudget!: number;


  /* ============================================================
     SCHEDULE

     Example:

     startDate:
       2026-08-16T00:00:00.000Z

     endDate:
       2026-08-20T23:59:59.999Z

     After endDate, delivery automatically stops.
  ============================================================ */

  @IsDateString()
  startDate!: string;


  @IsOptional()
  @IsDateString()
  endDate?: string;


  /* ============================================================
     SELLER STORE
  ============================================================ */

  @IsOptional()
  @IsMongoId()
  storeId?: string;
}