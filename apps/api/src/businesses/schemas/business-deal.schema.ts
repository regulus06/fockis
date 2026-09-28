import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";


export type BusinessDealDocument =
  HydratedDocument<BusinessDeal>;


@Schema({
  timestamps: true,
  collection: "business_deals",
})
export class BusinessDeal {

  /* ==========================================================================
     BUSINESS
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  businessId!: Types.ObjectId;


  /* ==========================================================================
     DEAL INFORMATION
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
    maxlength: 150,
  })
  title!: string;


  @Prop({
    trim: true,
    maxlength: 500,
  })
  description?: string;


  @Prop({
    trim: true,
    maxlength: 80,
  })
  discount?: string;


  @Prop({
    trim: true,
    maxlength: 100,
  })
  couponCode?: string;


  /* ==========================================================================
     EXPIRATION
  ========================================================================== */

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  expiresAt!: Date;


  /* ==========================================================================
     STATUS
  ========================================================================== */

  @Prop({
    default: true,
    index: true,
  })
  active!: boolean;


  /* ==========================================================================
     ANALYTICS
  ========================================================================== */

  @Prop({
    default: 0,
  })
  clicks!: number;
}


/* ============================================================================
   SCHEMA
============================================================================ */

export const BusinessDealSchema =
  SchemaFactory.createForClass(
    BusinessDeal,
  );


/* ============================================================================
   INDEXES
============================================================================ */

BusinessDealSchema.index({
  businessId: 1,
  active: 1,
  expiresAt: 1,
});