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

/**
 * Allow HTTP and HTTPS URLs, including localhost URLs during development.
 *
 * Examples:
 *   http://localhost:3000/uploads/ads/example.jpg
 *   https://fockis.com/uploads/ads/example.jpg
 *
 * Only HTTP and HTTPS protocols are allowed.
 */
const HTTP_URL_OPTIONS = {
  protocols: ["http", "https"],
  require_protocol: true,
  require_tld: false,
};

export class CreateCampaignDto {
  // Campaign information
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsEnum(CampaignObjective)
  objective!: CampaignObjective;

  @IsEnum(CampaignAdFormat)
  adFormat!: CampaignAdFormat;

  // Placements
  @IsArray()
  @IsEnum(CampaignPlacement, { each: true })
  placements!: CampaignPlacement[];

  // Ad content
  @IsString()
  @MaxLength(100)
  headline!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  // Media URLs: uploaded media or externally hosted media
  @IsOptional()
  @IsUrl(HTTP_URL_OPTIONS)
  mediaUrl?: string;

  @IsOptional()
  @IsUrl(HTTP_URL_OPTIONS)
  thumbnailUrl?: string;

  @IsOptional()
  @IsUrl(HTTP_URL_OPTIONS)
  appIconUrl?: string;

  // App-install campaign fields
  @ValidateIf(
    (dto: CreateCampaignDto) =>
      dto.objective === CampaignObjective.APP_INSTALL,
  )
  @IsString()
  @MaxLength(150)
  appName?: string;

  @ValidateIf(
    (dto: CreateCampaignDto) =>
      dto.objective === CampaignObjective.APP_INSTALL,
  )
  @IsUrl(HTTP_URL_OPTIONS)
  appStoreUrl?: string;

  @ValidateIf(
    (dto: CreateCampaignDto) =>
      dto.objective === CampaignObjective.APP_INSTALL,
  )
  @IsUrl(HTTP_URL_OPTIONS)
  googlePlayUrl?: string;

  @IsOptional()
  @IsEnum(CampaignCTA)
  callToAction?: CampaignCTA;

  // Audience targeting
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

  // Budget
  @IsNumber()
  @Min(0.01)
  dailyBudget!: number;

  @IsNumber()
  @Min(0.01)
  totalBudget!: number;

  // Schedule
  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  // Optional seller store
  @IsOptional()
  @IsMongoId()
  storeId?: string;
}