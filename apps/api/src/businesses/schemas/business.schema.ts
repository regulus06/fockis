import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

import {
  BusinessCategory,
} from "../enums/business-category.enum";

import {
  BusinessStatus,
} from "../enums/business-status.enum";


export type BusinessDocument =
  HydratedDocument<Business>;


/* ============================================================================
   SOCIAL LINKS
============================================================================ */

export interface BusinessSocialLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
}


/* ============================================================================
   BUSINESS IMAGE SOURCE
============================================================================ */

export enum BusinessImageSource {
  URL = "URL",
  UPLOAD = "UPLOAD",
}


/* ============================================================================
   BUSINESS SCHEMA
============================================================================ */

@Schema({
  timestamps: true,
  collection: "businesses",
})
export class Business {

  /* ==========================================================================
     OWNER
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  ownerId!: Types.ObjectId;


  /* ==========================================================================
     BUSINESS INFORMATION
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    maxlength: 120,
  })
  name!: string;


  @Prop({
    trim: true,
    maxlength: 500,
  })
  description?: string;


  @Prop({
    enum: BusinessCategory,
    required: true,
    index: true,
  })
  category!: BusinessCategory;


  /* ==========================================================================
     LOGO
  ========================================================================== */

  @Prop({
    trim: true,
  })
  logoUrl?: string;


  @Prop({
    enum: BusinessImageSource,
    default: BusinessImageSource.URL,
  })
  logoSource!: BusinessImageSource;


  /* ==========================================================================
     COVER IMAGE
  ========================================================================== */

  @Prop({
    trim: true,
  })
  coverImageUrl?: string;


  @Prop({
    enum: BusinessImageSource,
    default: BusinessImageSource.URL,
  })
  coverImageSource!: BusinessImageSource;


  /* ==========================================================================
     WEBSITE / CONTACT
  ========================================================================== */

  @Prop({
    trim: true,
  })
  websiteUrl?: string;


  @Prop({
    trim: true,
  })
  phone?: string;


  @Prop({
    trim: true,
    lowercase: true,
  })
  email?: string;


  /* ==========================================================================
     ADDRESS
  ========================================================================== */

  @Prop({
    trim: true,
  })
  address?: string;


  @Prop({
    trim: true,
  })
  city?: string;


  @Prop({
    trim: true,
  })
  state?: string;


  @Prop({
    trim: true,
    maxlength: 20,
  })
  zipCode?: string;


  @Prop({
    trim: true,
    maxlength: 20,
  })
  postalCode?: string;


  @Prop({
    trim: true,
  })
  country?: string;


  /* ==========================================================================
     LOCATION
  ========================================================================== */

  @Prop({
    type: Number,
  })
  latitude?: number;


  @Prop({
    type: Number,
  })
  longitude?: number;


  /* ==========================================================================
     SOCIAL LINKS
  ========================================================================== */

  @Prop({
    type: Object,
    default: {},
  })
  socialLinks!: BusinessSocialLinks;


  /* ==========================================================================
     STATUS
  ========================================================================== */

  @Prop({
    enum: BusinessStatus,
    default: BusinessStatus.DRAFT,
    index: true,
  })
  status!: BusinessStatus;


  /* ==========================================================================
     FOCKIS FEED PUBLISHING

     false:
     Business does NOT appear in FockisFeedRail.

     true:
     Business is published to the public Fockis Feed.
  ========================================================================== */

  @Prop({
    default: false,
    index: true,
  })
  feedEnabled!: boolean;


  /* ==========================================================================
     SPOTLIGHT
  ========================================================================== */

  @Prop({
    default: false,
    index: true,
  })
  spotlightEnabled!: boolean;


  @Prop({
    default: 0,
  })
  spotlightPriority!: number;


  /* ==========================================================================
     ANALYTICS
  ========================================================================== */

  @Prop({
    default: 0,
  })
  views!: number;


  @Prop({
    default: 0,
  })
  websiteClicks!: number;


  /* ==========================================================================
     VERIFICATION
  ========================================================================== */

  @Prop({
    default: false,
  })
  verified!: boolean;
}


/* ============================================================================
   SCHEMA
============================================================================ */

export const BusinessSchema =
  SchemaFactory.createForClass(Business);


/* ============================================================================
   INDEXES
============================================================================ */

BusinessSchema.index({
  status: 1,
  feedEnabled: 1,
  spotlightEnabled: 1,
  spotlightPriority: -1,
  createdAt: -1,
});


BusinessSchema.index({
  ownerId: 1,
});