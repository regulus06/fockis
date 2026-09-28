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

/* ============================================================
   DOCUMENT
============================================================ */

export type AdTargetingDocument =
  HydratedDocument<AdTargeting>;

/* ============================================================
   GENDER
============================================================ */

export enum TargetGender {
  ALL = "ALL",
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

/* ============================================================
   TARGETING SCHEMA
============================================================ */

@Schema({
  timestamps: true,
  collection: "marketing_ad_targeting",
})
export class AdTargeting {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    unique: true,
    index: true,
  })
  campaignId!: Types.ObjectId;

  /* ============================================================
     AGE
  ============================================================ */

  @Prop({
    type: Number,
    default: 18,
    min: 13,
    max: 100,
  })
  minimumAge!: number;

  @Prop({
    type: Number,
    default: 65,
    min: 13,
    max: 100,
  })
  maximumAge!: number;

  /* ============================================================
     GENDER
  ============================================================ */

  @Prop({
    required: true,
    enum: TargetGender,
    default: TargetGender.ALL,
  })
  gender!: TargetGender;

  /* ============================================================
     LOCATION
  ============================================================ */

  @Prop({
    type: [String],
    default: [],
    index: true,
  })
  countries!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  states!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  cities!: string[];

  /* ============================================================
     INTERESTS
  ============================================================ */

  @Prop({
    type: [String],
    default: [],
    index: true,
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

  /* ============================================================
     BEHAVIOR
  ============================================================ */

  @Prop({
    type: [String],
    default: [],
  })
  behaviors!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  devices!: string[];

  @Prop({
    type: [String],
    default: [],
  })
  operatingSystems!: string[];

  /* ============================================================
     AUDIENCE EXPANSION
  ============================================================ */

  @Prop({
    type: Boolean,
    default: false,
  })
  audienceExpansion!: boolean;
}

/* ============================================================
   SCHEMA
============================================================ */

export const AdTargetingSchema =
  SchemaFactory.createForClass(
    AdTargeting,
  );