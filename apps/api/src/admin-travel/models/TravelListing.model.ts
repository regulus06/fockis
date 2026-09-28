// backend/admin-travel/models/TravelListing.model.ts
//
// If you already have a TravelListing collection powering the public
// features/fockis-travel front end, point this file at that same collection
// instead of creating a second one — the admin routes below only need
// read/status-update access, they don't need to own the schema.

import mongoose, { Schema, Document } from "mongoose";
import type { TravelListingType } from "./TravelPartnerApplication.model";

export type TravelListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "suspended"
  | "archived"
  | "rejected";

export interface TravelListingDoc extends Document {
  name: string;
  type: TravelListingType;
  status: TravelListingStatus;
  partnerId: mongoose.Types.ObjectId;
  partnerName: string;
  city?: string;
  country?: string;
  price?: number;
  currency?: string;
  priceUnit?: string;
  images?: string[];
  rating?: number;
  reviewCount?: number;
  bookingCount?: number;
  flagged?: boolean;
  flagReason?: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const travelListingSchema = new Schema<TravelListingDoc>(
  {
    name: { type: String, required: true },
    type: { type: String, required: true },

    status: {
      type: String,
      enum: [
        "draft",
        "pending_review",
        "published",
        "suspended",
        "archived",
        "rejected",
      ],
      default: "draft",
    },

    partnerId: {
      type: Schema.Types.ObjectId,
      ref: "TravelPartner",
      required: true,
    },
    partnerName: { type: String, required: true },

    city: String,
    country: String,
    price: Number,
    currency: String,
    priceUnit: String,
    images: [String],
    rating: Number,
    reviewCount: { type: Number, default: 0 },
    bookingCount: { type: Number, default: 0 },

    flagged: { type: Boolean, default: false },
    flagReason: String,
    publishedAt: Date,
  },
  { timestamps: true },
);

travelListingSchema.index({ status: 1, type: 1 });
travelListingSchema.index({ flagged: 1 });
travelListingSchema.index({ name: "text", partnerName: "text" });

export const TravelListing =
  mongoose.models.TravelListing ||
  mongoose.model<TravelListingDoc>("TravelListing", travelListingSchema);
