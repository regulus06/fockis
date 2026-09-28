import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

// ============================================================================
// DOCUMENT TYPE
// ============================================================================

export type MusicPlatformRulesDocument =
  HydratedDocument<MusicPlatformRules>;

// ============================================================================
// RELEASE RULE
// ============================================================================

@Schema({ _id: false })
export class MusicReleaseRule {
  @Prop({
    required: true,
    enum: [
      "single",
      "ep",
      "album",
      "series",
      "video",
    ],
  })
  type!: string;

  @Prop({
    required: true,
  })
  label!: string;

  @Prop({
    required: true,
  })
  description!: string;

  @Prop({
    required: true,
    min: 0,
    default: 1,
  })
  minItems!: number;

  @Prop({
    required: true,
    min: 0,
    default: 1,
  })
  maxItems!: number;

  @Prop({
    required: true,
    default: true,
  })
  enabled!: boolean;
}

export const MusicReleaseRuleSchema =
  SchemaFactory.createForClass(MusicReleaseRule);

// ============================================================================
// PREVIEW RULES
// ============================================================================

@Schema({ _id: false })
export class MusicPreviewRules {
  @Prop({
    required: true,
    default: true,
  })
  enabled!: boolean;

  @Prop({
    required: true,
    min: 0,
    default: 10,
  })
  minSeconds!: number;

  @Prop({
    required: true,
    min: 0,
    default: 120,
  })
  maxSeconds!: number;

  @Prop({
    required: true,
    min: 0,
    default: 30,
  })
  defaultSeconds!: number;
}

export const MusicPreviewRulesSchema =
  SchemaFactory.createForClass(MusicPreviewRules);

// ============================================================================
// PRICING RULES
// ============================================================================

@Schema({ _id: false })
export class MusicPricingRules {
  @Prop({
    required: true,
    default: true,
  })
  enabled!: boolean;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  minimumPrice!: number;

  @Prop({
    required: true,
    min: 0,
    default: 999.99,
  })
  maximumPrice!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  defaultPrice!: number;

  @Prop({
    required: true,
    default: true,
  })
  allowFree!: boolean;

  @Prop({
    required: true,
    default: true,
  })
  allowPaid!: boolean;

  @Prop({
    required: true,
    default: true,
  })
  allowPreviewPaid!: boolean;

  @Prop({
    required: true,
    default: true,
  })
  allowPremium!: boolean;

  @Prop({
    required: true,
    default: true,
  })
  allowExclusive!: boolean;
}

export const MusicPricingRulesSchema =
  SchemaFactory.createForClass(MusicPricingRules);

// ============================================================================
// PUBLISHING RULES
// ============================================================================

@Schema({ _id: false })
export class MusicPublishingRules {
  @Prop({
    required: true,
    default: true,
  })
  allowDrafts!: boolean;

  @Prop({
    required: true,
    default: true,
  })
  allowScheduledReleases!: boolean;

  @Prop({
    required: true,
    default: false,
  })
  requireArtwork!: boolean;

  @Prop({
    required: true,
    default: false,
  })
  requireDescription!: boolean;

  @Prop({
    required: true,
    default: false,
  })
  requireGenre!: boolean;

  @Prop({
    required: true,
    default: false,
  })
  requireTags!: boolean;

  @Prop({
    required: true,
    default: true,
  })
  requireCreatorProfile!: boolean;

  @Prop({
    required: true,
    default: false,
  })
  requireCreatorApproval!: boolean;
}

export const MusicPublishingRulesSchema =
  SchemaFactory.createForClass(MusicPublishingRules);

// ============================================================================
// VIDEO RULES
// ============================================================================

@Schema({ _id: false })
export class MusicVideoRules {
  @Prop({
    required: true,
    default: true,
  })
  enabled!: boolean;

  @Prop({
    required: true,
    min: 0,
    default: 1,
  })
  maxVideosPerRelease!: number;

  @Prop({
    required: true,
    min: 0,
    default: 180,
  })
  maxDurationMinutes!: number;
}

export const MusicVideoRulesSchema =
  SchemaFactory.createForClass(MusicVideoRules);

// ============================================================================
// MUSIC PLATFORM RULES
// ============================================================================

@Schema({
  collection: "music_platform_rules",
  timestamps: true,
})
export class MusicPlatformRules {
  @Prop({
    required: true,
    default: 1,
  })
  version!: number;

  @Prop({
    type: [MusicReleaseRuleSchema],
    required: true,
  })
  releaseRules!: MusicReleaseRule[];

  @Prop({
    type: MusicPreviewRulesSchema,
    required: true,
  })
  preview!: MusicPreviewRules;

  @Prop({
    type: MusicPricingRulesSchema,
    required: true,
  })
  pricing!: MusicPricingRules;

  @Prop({
    type: MusicPublishingRulesSchema,
    required: true,
  })
  publishing!: MusicPublishingRules;

  @Prop({
    type: MusicVideoRulesSchema,
    required: true,
  })
  video!: MusicVideoRules;

  @Prop()
  updatedBy?: string;
}

export const MusicPlatformRulesSchema =
  SchemaFactory.createForClass(MusicPlatformRules);