// backend/admin-travel/models/TravelPartner.model.ts

import mongoose, { Schema, Document } from "mongoose";
import type { TravelListingType } from "./TravelPartnerApplication.model";

export type TravelPartnerStatus =
  | "active"
  | "suspended"
  | "deactivated"
  | "pending";

export interface TravelPartnerDoc extends Document {
  businessName: string;
  categories: TravelListingType[];
  email: string;
  phone?: string;
  city?: string;
  country?: string;
  logo?: string;
  status: TravelPartnerStatus;
  verified: boolean;
  acceptingBookings: boolean;
  rating?: number;
  createdAt: Date;
  suspendedAt?: Date;
  suspendedReason?: string;
  applicationId?: mongoose.Types.ObjectId;
}

const travelPartnerSchema = new Schema<TravelPartnerDoc>(
  {
    businessName: { type: String, required: true, trim: true },
    categories: { type: [String], default: [] },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: String,
    city: String,
    country: String,
    logo: String,

    status: {
      type: String,
      enum: ["active", "suspended", "deactivated", "pending"],
      default: "pending",
    },

    verified: { type: Boolean, default: false },
    acceptingBookings: { type: Boolean, default: true },
    rating: Number,

    suspendedAt: Date,
    suspendedReason: String,

    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "TravelPartnerApplication",
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

travelPartnerSchema.index({ status: 1 });
travelPartnerSchema.index({ businessName: "text", email: "text" });

export const TravelPartner =
  mongoose.models.TravelPartner ||
  mongoose.model<TravelPartnerDoc>("TravelPartner", travelPartnerSchema);
