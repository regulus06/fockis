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
   DOCUMENT TYPE
============================================================================ */

export type CampaignDocument =
  HydratedDocument<Campaign>;


/* ============================================================================
   CAMPAIGN OBJECTIVE
============================================================================ */

export enum CampaignObjective {
  APP_INSTALL = "APP_INSTALL",
  PRODUCT_SALES = "PRODUCT_SALES",
  WEBSITE_TRAFFIC = "WEBSITE_TRAFFIC",
  ENGAGEMENT = "ENGAGEMENT",
  BRAND_AWARENESS = "BRAND_AWARENESS",
}


/* ============================================================================
   CAMPAIGN AD FORMAT
============================================================================ */

export enum CampaignAdFormat {
  VIDEO = "VIDEO",
  IMAGE = "IMAGE",
  CAROUSEL = "CAROUSEL",
}


/* ============================================================================
   CAMPAIGN STATUS
============================================================================ */

export enum CampaignStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  ACTIVE = "ACTIVE",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}


/* ============================================================================
   CAMPAIGN CTA
============================================================================ */

export enum CampaignCTA {
  INSTALL_NOW = "INSTALL_NOW",
  DOWNLOAD = "DOWNLOAD",
  SHOP_NOW = "SHOP_NOW",
  LEARN_MORE = "LEARN_MORE",
  SIGN_UP = "SIGN_UP",
  GET_STARTED = "GET_STARTED",
}


/* ============================================================================
   CAMPAIGN PLACEMENT
============================================================================ */

export enum CampaignPlacement {
  FEED = "FEED",
  FEED_RAIL = "FEED_RAIL",
  STORY = "STORY",
  MARKETPLACE_BANNER = "MARKETPLACE_BANNER",
  PRODUCT = "PRODUCT",
  STORE = "STORE",
  REAL_ESTATE = "REAL_ESTATE",
  PROFILE = "PROFILE",
  FEED_VIDEO_END = "FEED_VIDEO_END",
}


/* ============================================================================
   CAMPAIGN SCHEMA
============================================================================ */

@Schema({
  timestamps: true,
  collection: "marketing_campaigns",
})
export class Campaign {

  createdAt!: Date;

  updatedAt!: Date;


  /* ==========================================================================
     ADVERTISER
  ========================================================================== */

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  advertiserId!: Types.ObjectId;


  /* ==========================================================================
     SELLER STORE
  ========================================================================== */

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "SellerStore",
    required: false,
    index: true,
  })
  storeId?: Types.ObjectId;


  /* ==========================================================================
     BASIC CAMPAIGN
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    maxlength: 150,
  })
  name!: string;


  @Prop({
    required: true,
    enum: CampaignObjective,
    index: true,
  })
  objective!: CampaignObjective;


  @Prop({
    required: true,
    enum: CampaignAdFormat,
  })
  adFormat!: CampaignAdFormat;


  /* ==========================================================================
     PLACEMENTS
  ========================================================================== */

  @Prop({
    type: [String],
    enum: CampaignPlacement,
    default: [],
    index: true,
  })
  placements!: CampaignPlacement[];


  /* ==========================================================================
     AD CONTENT
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  headline!: string;


  @Prop({
    required: false,
    trim: true,
    maxlength: 500,
  })
  description?: string;


  @Prop({
    required: false,
    trim: true,
  })
  mediaUrl?: string;


  @Prop({
    required: false,
    trim: true,
  })
  thumbnailUrl?: string;


  @Prop({
    required: false,
    trim: true,
  })
  appIconUrl?: string;


  /* ==========================================================================
     APP INSTALL
  ========================================================================== */

  @Prop({
    required: false,
    trim: true,
    maxlength: 150,
  })
  appName?: string;


  @Prop({
    required: false,
    trim: true,
  })
  appStoreUrl?: string;


  @Prop({
    required: false,
    trim: true,
  })
  googlePlayUrl?: string;


  @Prop({
    required: false,
    enum: CampaignCTA,
    default: CampaignCTA.LEARN_MORE,
  })
  callToAction!: CampaignCTA;


  /* ==========================================================================
     TARGETING
  ========================================================================== */

  @Prop({
    type: [String],
    default: [],
  })
  locations!: string[];


  @Prop({
    type: [String],
    default: [],
  })
  interests!: string[];


  @Prop({
    type: [String],
    default: [],
  })
  categories!: string[];


  @Prop({
    type: [String],
    default: [],
  })
  keywords!: string[];


  @Prop({
    type: Number,
    min: 13,
    max: 100,
    default: 18,
  })
  minimumAge!: number;


  @Prop({
    type: Number,
    min: 13,
    max: 100,
    default: 65,
  })
  maximumAge!: number;


  /* ==========================================================================
     BUDGET
  ========================================================================== */

  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  dailyBudget!: number;


  @Prop({
    type: Number,
    required: true,
    min: 0.01,
  })
  totalBudget!: number;


  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  spent!: number;


  /* ==========================================================================
     SCHEDULE

     IMPORTANT:

     endDate is the exact time after which the campaign is no longer
     deliverable.

     Example:

       startDate = Aug 1
       endDate   = Aug 10

     On Aug 10 after the end time, the campaign disappears from
     all placements.

     The document remains in MongoDB so the advertiser can edit
     the date and reactivate it.
  ========================================================================== */

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  startDate!: Date;


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
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
    index: true,
  })
  status!: CampaignStatus;


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
  installs!: number;


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
  revenue!: number;


  /* ==========================================================================
     DELIVERY
  ========================================================================== */

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  frequency!: number;


  /* ==========================================================================
     ACTIVE DELIVERY FLAG

     This controls whether the campaign is allowed to deliver.

     IMPORTANT:

     isActive alone is NOT enough.

     AdDeliveryService also checks startDate/endDate.
  ========================================================================== */

  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isActive!: boolean;
}


/* ============================================================================
   SCHEMA FACTORY
============================================================================ */

export const CampaignSchema =
  SchemaFactory.createForClass(Campaign);


/* ============================================================================
   INDEXES
============================================================================ */

CampaignSchema.index({
  advertiserId: 1,
  createdAt: -1,
});


CampaignSchema.index({
  status: 1,
  createdAt: -1,
});


CampaignSchema.index({
  isActive: 1,
  status: 1,
  startDate: 1,
  endDate: 1,
});


CampaignSchema.index({
  placements: 1,
  status: 1,
  isActive: 1,
  startDate: 1,
  endDate: 1,
});


CampaignSchema.index({
  objective: 1,
  status: 1,
  isActive: 1,
});


CampaignSchema.index({
  storeId: 1,
  createdAt: -1,
});