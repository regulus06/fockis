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

export type AdEventDocument =
  HydratedDocument<AdEvent>;

/* ============================================================
   EVENT TYPES
============================================================ */

export enum AdEventType {
  IMPRESSION = "IMPRESSION",
  CLICK = "CLICK",
  VIDEO_VIEW = "VIDEO_VIEW",
  VIDEO_COMPLETE = "VIDEO_COMPLETE",
  LIKE = "LIKE",
  SHARE = "SHARE",
  SAVE = "SAVE",
  INSTALL = "INSTALL",
  CONVERSION = "CONVERSION",
}

/* ============================================================
   AD EVENT
============================================================ */

@Schema({
  timestamps: true,
  collection: "marketing_ad_events",
})
export class AdEvent {
  /* ==========================================================
     ADVERTISEMENT
  ========================================================== */

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Advertisement",
    required: true,
    index: true,
  })
  adId!: Types.ObjectId;

  /* ==========================================================
     CAMPAIGN
  ========================================================== */

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Campaign",
    required: true,
    index: true,
  })
  campaignId!: Types.ObjectId;

  /* ==========================================================
     USER

     Fockis authentication IDs may be strings such as:

       user_6a2e3f6bd600b007fca5c19a

     Therefore this must NOT be forced into ObjectId.
  ========================================================== */

  @Prop({
    type: String,
    required: false,
    index: true,
  })
  userId?: string;

  /* ==========================================================
     EVENT TYPE
  ========================================================== */

  @Prop({
    required: true,
    enum: AdEventType,
    index: true,
  })
  type!: AdEventType;

  /* ==========================================================
     SESSION
  ========================================================== */

  @Prop({
    required: false,
  })
  sessionId?: string;

  /* ==========================================================
     REQUEST
  ========================================================== */

  @Prop({
    required: false,
  })
  requestId?: string;

  /* ==========================================================
     PLACEMENT
  ========================================================== */

  @Prop({
    required: false,
  })
  placement?: string;

  /* ==========================================================
     SOURCE
  ========================================================== */

  @Prop({
    required: false,
  })
  source?: string;

  /* ==========================================================
     DEVICE
  ========================================================== */

  @Prop({
    required: false,
  })
  deviceType?: string;

  /* ==========================================================
     LOCATION
  ========================================================== */

  @Prop({
    required: false,
  })
  country?: string;

  @Prop({
    required: false,
  })
  state?: string;

  @Prop({
    required: false,
  })
  city?: string;

  /* ==========================================================
     COST
  ========================================================== */

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  cost!: number;

  /* ==========================================================
     REVENUE
  ========================================================== */

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  revenue!: number;

  /* ==========================================================
     METADATA
  ========================================================== */

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: {},
  })
  metadata!: Record<string, unknown>;
}

/* ============================================================
   SCHEMA
============================================================ */

export const AdEventSchema =
  SchemaFactory.createForClass(
    AdEvent,
  );

/* ============================================================
   INDEXES
============================================================ */

AdEventSchema.index({
  campaignId: 1,
  createdAt: -1,
});

AdEventSchema.index({
  adId: 1,
  createdAt: -1,
});

AdEventSchema.index({
  type: 1,
  createdAt: -1,
});

AdEventSchema.index({
  userId: 1,
  createdAt: -1,
});