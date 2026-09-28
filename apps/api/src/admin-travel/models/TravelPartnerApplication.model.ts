// backend/admin-travel/models/TravelPartnerApplication.model.ts
//
// Mirrors features/admin/travel/types/travelAdmin.types.ts on the frontend.
// Adjust the `require("mongoose")` import style if your codebase uses
// ESM ("import mongoose from 'mongoose'") — written as CommonJS-friendly
// TS here since I don't know your tsconfig's module setting.

import mongoose, { Schema, Document } from "mongoose";

export type TravelListingType =
  | "stay"
  | "rental"
  | "meeting"
  | "event"
  | "restaurant"
  | "car"
  | "flight"
  | "transfer"
  | "experience"
  | "attraction"
  | "thing";

export type TravelPartnerApplicationStatus =
  | "pending"
  | "under_review"
  | "more_info_requested"
  | "approved"
  | "rejected";

export type VerificationStage = "submitted" | "under_review" | "verified";

export interface TravelPartnerApplicationDoc extends Document {
  businessName: string;
  contactName: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  primaryCategory: TravelListingType;
  services: TravelListingType[];
  message?: string;
  documents: { name: string; url: string; uploadedAt: Date }[];
  status: TravelPartnerApplicationStatus;
  verificationStage: VerificationStage;
  submittedAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  rejectionReason?: string;
  // Set once the application is approved and a Partner record is created.
  partnerId?: mongoose.Types.ObjectId;
}

const CATEGORY_ENUM: TravelListingType[] = [
  "stay",
  "rental",
  "meeting",
  "event",
  "restaurant",
  "car",
  "flight",
  "transfer",
  "experience",
  "attraction",
  "thing",
];

const travelPartnerApplicationSchema = new Schema<TravelPartnerApplicationDoc>(
  {
    businessName: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: String,
    website: String,
    description: String,
    address: String,
    city: String,
    country: String,

    primaryCategory: {
      type: String,
      enum: CATEGORY_ENUM,
      required: true,
    },

    services: {
      type: [{ type: String, enum: CATEGORY_ENUM }],
      default: [],
    },

    message: String,

    documents: {
      type: [
        {
          name: String,
          url: String,
          uploadedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "under_review",
        "more_info_requested",
        "approved",
        "rejected",
      ],
      default: "pending",
    },

    verificationStage: {
      type: String,
      enum: ["submitted", "under_review", "verified"],
      default: "submitted",
    },

    submittedAt: { type: Date, default: Date.now },
    reviewedAt: Date,
    reviewedBy: String,
    reviewNotes: String,
    rejectionReason: String,

    partnerId: { type: Schema.Types.ObjectId, ref: "TravelPartner" },
  },
  { timestamps: { createdAt: false, updatedAt: "updatedAt" } },
);

travelPartnerApplicationSchema.index({ status: 1, submittedAt: -1 });
travelPartnerApplicationSchema.index({ businessName: "text", email: "text" });

export const TravelPartnerApplication =
  mongoose.models.TravelPartnerApplication ||
  mongoose.model<TravelPartnerApplicationDoc>(
    "TravelPartnerApplication",
    travelPartnerApplicationSchema,
  );
