// backend/admin-travel/models/TravelBooking.model.ts
//
// Same note as TravelListing.model.ts: if bookings already exist as a
// collection powering the public site/checkout flow, reuse it — this admin
// module only reads from it and updates status for disputes/refunds.

import mongoose, { Schema, Document } from "mongoose";
import type { TravelListingType } from "./TravelPartnerApplication.model";

export type TravelBookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "refunded"
  | "disputed";

export interface TravelBookingDoc extends Document {
  listingId: mongoose.Types.ObjectId;
  listingName: string;
  listingType: TravelListingType;
  partnerId: mongoose.Types.ObjectId;
  partnerName: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: TravelBookingStatus;
  amount: number;
  currency: string;
  checkIn?: Date;
  checkOut?: Date;
  createdAt: Date;
}

const travelBookingSchema = new Schema<TravelBookingDoc>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "TravelListing",
      required: true,
    },
    listingName: { type: String, required: true },
    listingType: { type: String, required: true },

    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "TravelPartner",
      required: true,
    },
    partnerName: { type: String, required: true },

    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "completed",
        "cancelled",
        "refunded",
        "disputed",
      ],
      default: "pending",
    },

    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    checkIn: Date,
    checkOut: Date,
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

travelBookingSchema.index({ status: 1, createdAt: -1 });
travelBookingSchema.index({ partnerId: 1 });

export const TravelBooking =
  mongoose.models.TravelBooking ||
  mongoose.model<TravelBookingDoc>("TravelBooking", travelBookingSchema);
