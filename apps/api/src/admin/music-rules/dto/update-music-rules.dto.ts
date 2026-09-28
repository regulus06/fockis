import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

import { Type } from "class-transformer";

// ============================================================================
// RELEASE RULE DTO
// ============================================================================

export class MusicReleaseRuleDto {
  @IsString()
  id!: string;

  @IsString()
  type!: string;

  @IsString()
  label!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  minItems!: number;

  @IsNumber()
  @Min(0)
  maxItems!: number;

  @IsBoolean()
  enabled!: boolean;
}

// ============================================================================
// PREVIEW RULES DTO
// ============================================================================

export class MusicPreviewRulesDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(0)
  minSeconds!: number;

  @IsNumber()
  @Min(0)
  maxSeconds!: number;

  @IsNumber()
  @Min(0)
  defaultSeconds!: number;
}

// ============================================================================
// PRICING RULES DTO
// ============================================================================

export class MusicPricingRulesDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(0)
  minimumPrice!: number;

  @IsNumber()
  @Min(0)
  @Max(1000000)
  maximumPrice!: number;

  @IsNumber()
  @Min(0)
  defaultPrice!: number;

  @IsBoolean()
  allowFree!: boolean;

  @IsBoolean()
  allowPaid!: boolean;

  @IsBoolean()
  allowPreviewPaid!: boolean;

  @IsBoolean()
  allowPremium!: boolean;

  @IsBoolean()
  allowExclusive!: boolean;
}

// ============================================================================
// PUBLISHING RULES DTO
// ============================================================================

export class MusicPublishingRulesDto {
  @IsBoolean()
  allowDrafts!: boolean;

  @IsBoolean()
  allowScheduledReleases!: boolean;

  @IsBoolean()
  requireArtwork!: boolean;

  @IsBoolean()
  requireDescription!: boolean;

  @IsBoolean()
  requireGenre!: boolean;

  @IsBoolean()
  requireTags!: boolean;

  @IsBoolean()
  requireCreatorProfile!: boolean;

  @IsBoolean()
  requireCreatorApproval!: boolean;
}

// ============================================================================
// VIDEO RULES DTO
// ============================================================================

export class MusicVideoRulesDto {
  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(0)
  maxVideosPerRelease!: number;

  @IsNumber()
  @Min(0)
  maxDurationMinutes!: number;
}

// ============================================================================
// UPDATE MUSIC RULES DTO
// ============================================================================

export class UpdateMusicRulesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MusicReleaseRuleDto)
  releaseRules!: MusicReleaseRuleDto[];

  @ValidateNested()
  @Type(() => MusicPreviewRulesDto)
  preview!: MusicPreviewRulesDto;

  @ValidateNested()
  @Type(() => MusicPricingRulesDto)
  pricing!: MusicPricingRulesDto;

  @ValidateNested()
  @Type(() => MusicPublishingRulesDto)
  publishing!: MusicPublishingRulesDto;

  @ValidateNested()
  @Type(() => MusicVideoRulesDto)
  video!: MusicVideoRulesDto;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}