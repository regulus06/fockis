import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from "mongoose";


/* ============================================================================
   DOCUMENT
============================================================================ */

export type AdvertisementDocument =
  HydratedDocument<Advertisement>;


/* ============================================================================
   AD STATUS
============================================================================ */

export enum AdvertisementStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  REJECTED = "REJECTED",
  COMPLETED = "COMPLETED",
}


/* ============================================================================
   AD TYPE
============================================================================ */

export enum AdvertisementType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  CAROUSEL = "CAROUSEL",
}


/* ============================================================================
   DESTINATION TYPE
============================================================================ */

export enum AdvertisementDestination {
  APP = "APP",
  PRODUCT = "PRODUCT",
  STORE = "STORE",
  WEBSITE = "WEBSITE",
  PROFILE = "PROFILE",
  POST = "POST",
}


/* ============================================================================
   ADVERTISEMENT PLACEMENT
============================================================================ */

export enum AdvertisementPlacement {
  FEED = "FEED",
  FEED_RAIL = "FEED_RAIL",
  FEED_VIDEO_END = "FEED_VIDEO_END",
  STORY = "STORY",
  MARKETPLACE_BANNER = "MARKETPLACE_BANNER",
  PRODUCT = "PRODUCT",
  STORE = "STORE",
  REAL_ESTATE = "REAL_ESTATE",
  PROFILE = "PROFILE",
}


/* ============================================================================
   CAROUSEL ITEM
============================================================================ */

@Schema({
  _id: false,
})
export class AdvertisementCarouselItem {

  @Prop({
    required: true,
  })
  mediaUrl!: string;


  @Prop({
    required: false,
  })
  title?: string;


  @Prop({
    required: false,
  })
  description?: string;


  @Prop({
    required: false,
  })
  destinationUrl?: string;
}


export const AdvertisementCarouselItemSchema =
  SchemaFactory.createForClass(
    AdvertisementCarouselItem,
  );


/* ============================================================================
   ADVERTISEMENT
============================================================================ */

@Schema({
  timestamps: true,
  collection: "marketing_advertisements",
})
export class Advertisement {

  /* ==========================================================================
     OWNERSHIP
  ========================================================================== */

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  advertiserId!: Types.ObjectId;


  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    index: true,
  })
  campaignId!: Types.ObjectId;


  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    maxlength: 150,
  })
  name!: string;


  @Prop({
    required: true,
    enum: AdvertisementType,
  })
  type!: AdvertisementType;


  @Prop({
    required: true,
    trim: true,
    maxlength: 120,
  })
  headline!: string;


  @Prop({
    required: false,
    trim: true,
    maxlength: 500,
  })
  description?: string;


  /* ==========================================================================
     MEDIA
  ========================================================================== */

  @Prop({
    required: false,
  })
  mediaUrl?: string;


  @Prop({
    required: false,
  })
  thumbnailUrl?: string;


  @Prop({
    required: false,
  })
  appIconUrl?: string;


  @Prop({
    type: [AdvertisementCarouselItemSchema],
    default: [],
  })
  carouselItems!: AdvertisementCarouselItem[];


  /* ==========================================================================
     DESTINATION
  ========================================================================== */

  @Prop({
    required: true,
    enum: AdvertisementDestination,
    default: AdvertisementDestination.WEBSITE,
  })
  destinationType!: AdvertisementDestination;


  @Prop({
    required: false,
  })
  destinationUrl?: string;


  @Prop({
    type: MongooseSchema.Types.ObjectId,
    required: false,
  })
  destinationId?: Types.ObjectId;


  /* ==========================================================================
     PLACEMENTS
  ========================================================================== */

  @Prop({
    type: [String],
    enum: AdvertisementPlacement,
    default: [
      AdvertisementPlacement.FEED,
    ],
    index: true,
  })
  placements!: AdvertisementPlacement[];


  /* ==========================================================================
     CTA
  ========================================================================== */

  @Prop({
    required: false,
    trim: true,
    maxlength: 50,
  })
  callToAction?: string;


  /* ==========================================================================
     AD-LEVEL SCHEDULE

     Optional.

     If empty, the ad follows the campaign schedule.

     If present, the ad must also be inside this date range.
  ========================================================================== */

  @Prop({
    type: Date,
    required: false,
    default: null,
    index: true,
  })
  startDate?: Date | null;


  @Prop({
    type: Date,
    required: false,
    default: null,
    index: true,
  })
  endDate?: Date | null;


  /* ==========================================================================
     STATUS
  ========================================================================== */

  @Prop({
    required: true,
    enum: AdvertisementStatus,
    default: AdvertisementStatus.DRAFT,
    index: true,
  })
  status!: AdvertisementStatus;


  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isActive!: boolean;


  /* ==========================================================================
     PERFORMANCE
  ========================================================================== */

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  impressions!: number;


  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  clicks!: number;


  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  videoViews!: number;


  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  conversions!: number;


  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  spend!: number;


  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  revenue!: number;


  /* ==========================================================================
     RANKING
  ========================================================================== */

  @Prop({
    type: Number,
    default: 0,
  })
  qualityScore!: number;


  @Prop({
    type: Number,
    default: 0,
  })
  relevanceScore!: number;


  @Prop({
    type: Number,
    default: 0,
  })
  deliveryScore!: number;


  @Prop({
    type: Number,
    default: 0,
  })
  rankingScore!: number;
}


/* ============================================================================
   SCHEMA
============================================================================ */

export const AdvertisementSchema =
  SchemaFactory.createForClass(
    Advertisement,
  );


/* ============================================================================
   INDEXES
============================================================================ */

AdvertisementSchema.index({
  advertiserId: 1,
  createdAt: -1,
});


AdvertisementSchema.index({
  campaignId: 1,
  createdAt: -1,
});


AdvertisementSchema.index({
  status: 1,
  isActive: 1,
});


AdvertisementSchema.index({
  isActive: 1,
  status: 1,
  rankingScore: -1,
});


AdvertisementSchema.index({
  destinationType: 1,
  destinationId: 1,
});


AdvertisementSchema.index({
  placements: 1,
  isActive: 1,
  status: 1,
  rankingScore: -1,
});


/* ============================================================================
   SCHEDULE DELIVERY INDEX
============================================================================ */

AdvertisementSchema.index({
  status: 1,
  isActive: 1,
  startDate: 1,
  endDate: 1,
});