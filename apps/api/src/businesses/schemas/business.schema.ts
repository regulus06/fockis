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
   PRIMARY BUSINESS CARD ACTION

   Which destination button is emphasised on business cards and the
   business profile. Both destinations are always kept when configured;
   this only controls the button hierarchy.
============================================================================ */

export enum BusinessPrimaryAction {
  WEBSITE = "WEBSITE",
  STORE = "STORE",
}


/* ============================================================================
   BUSINESS SIZE
============================================================================ */

export enum BusinessSize {
  SOLO = "SOLO",
  SMALL = "SMALL", //    2 - 10
  MEDIUM = "MEDIUM", //  11 - 50
  LARGE = "LARGE", //    51 - 200
  ENTERPRISE = "ENTERPRISE", // 200+
}


/* ============================================================================
   OPENING HOURS

   day:   0 = Sunday ... 6 = Saturday
   open:  "HH:mm" (24h)
   close: "HH:mm" (24h)
============================================================================ */

export interface BusinessHoursEntry {
  day: number;
  open?: string;
  close?: string;
  closed: boolean;
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


  /*
   * Optional short one-line pitch shown in the business hero.
   */
  @Prop({
    trim: true,
    maxlength: 160,
  })
  tagline?: string;


  @Prop({
    type: Number,
    min: 1800,
    max: 2100,
  })
  foundedYear?: number;


  @Prop({
    type: String,
    enum: Object.values(BusinessSize),
  })
  businessSize?: BusinessSize;


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
     FOCKIS SHOP CONNECTION

     storeId points at a Fockis Shop Store owned by the same user. Ownership
     is verified by BusinessesService before it is saved.
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "Store",
    index: true,
  })
  storeId?: Types.ObjectId;


  @Prop({
    type: String,
    enum: Object.values(BusinessPrimaryAction),
  })
  primaryAction?: BusinessPrimaryAction;


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
     OPENING HOURS
  ========================================================================== */

  @Prop({
    type: [
      {
        _id: false,
        day: {
          type: Number,
          min: 0,
          max: 6,
          required: true,
        },
        open: {
          type: String,
          trim: true,
        },
        close: {
          type: String,
          trim: true,
        },
        closed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    default: undefined,
  })
  hours?: BusinessHoursEntry[];


  @Prop({
    default: false,
  })
  byAppointmentOnly?: boolean;


  @Prop({
    trim: true,
    maxlength: 64,
  })
  timeZone?: string;


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


  /*
   * Only super admins may change the priority (see BusinessesService).
   */
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


  @Prop({
    default: 0,
  })
  storeClicks!: number;


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
