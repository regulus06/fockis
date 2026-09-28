
import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

import type {
  Carrier,
  ShipmentStatus,
} from "../interfaces/carrier.interface";

@Schema({
  timestamps: true,
})
export class Shipment extends Document {
  // ============================================================
  // ORDER
  // ============================================================

  @Prop({
    type: Types.ObjectId,
    ref: "Order",
    required: true,
    index: true,
  })
  order!: Types.ObjectId;

  // ============================================================
  // CARRIER
  // ============================================================

  @Prop({
    type: String,
    enum: [
      "usps",
      "ups",
      "fedex",
      "dhl",
    ],
    required: true,
    index: true,
  })
  carrier!: Carrier;

  // ============================================================
  // TRACKING NUMBER
  // ============================================================

  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  trackingNumber!: string;

  // ============================================================
  // STATUS
  // ============================================================

  @Prop({
    type: String,
    enum: [
      "pending",
      "processing",
      "label_created",
      "shipped",
      "in_transit",
      "out_for_delivery",
      "delivered",
      "delayed",
      "failed",
      "cancelled",
    ],
    default: "pending",
    index: true,
  })
  status!: ShipmentStatus;

  // ============================================================
  // ESTIMATED DELIVERY
  // ============================================================

  @Prop({
    type: Date,
  })
  estimatedDelivery?: Date;

  // ============================================================
  // SHIPPED DATE
  // ============================================================

  @Prop({
    type: Date,
  })
  shippedAt?: Date;

  // ============================================================
  // DELIVERED DATE
  // ============================================================

  @Prop({
    type: Date,
  })
  deliveredAt?: Date;

  // ============================================================
  // PACKAGE WEIGHT
  // ============================================================

  @Prop({
    type: Number,
    min: 0,
  })
  weight?: number;

  // ============================================================
  // WEIGHT UNIT
  // ============================================================

  @Prop({
    type: String,
    enum: [
      "lb",
      "kg",
    ],
    default: "lb",
  })
  weightUnit?: "lb" | "kg";

  // ============================================================
  // SHIPPING COUNTRY
  // ============================================================

  @Prop({
    type: String,
    trim: true,
    lowercase: true,
  })
  country?: string;

  // ============================================================
  // SHIPPING CITY
  // ============================================================

  @Prop({
    type: String,
    trim: true,
  })
  city?: string;

  // ============================================================
  // SHIPPING STATE
  // ============================================================

  @Prop({
    type: String,
    trim: true,
  })
  state?: string;

  // ============================================================
  // POSTAL CODE
  // ============================================================

  @Prop({
    type: String,
    trim: true,
  })
  postalCode?: string;

  // ============================================================
  // CURRENT LOCATION
  // ============================================================

  @Prop({
    type: String,
    trim: true,
  })
  location?: string;

  // ============================================================
  // SHIPPING LABEL URL
  // ============================================================

  @Prop({
    type: String,
    trim: true,
  })
  labelUrl?: string;

  // ============================================================
  // TRACKING HISTORY
  // ============================================================

  @Prop({
    type: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "processing",
            "label_created",
            "shipped",
            "in_transit",
            "out_for_delivery",
            "delivered",
            "delayed",
            "failed",
            "cancelled",
          ],
          required: true,
        },

        location: {
          type: String,
        },

        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    default: [],
  })
  history!: {
    status: ShipmentStatus;
    location?: string;
    date?: Date;
  }[];
}

export const ShipmentSchema =
  SchemaFactory.createForClass(
    Shipment,
  );
