import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/* ============================================================================
   PUBLIC PLACES — places anyone can add to Fockis Maps
   A shop, church, school, clinic, market or landmark that isn't on the map
   yet. Anyone signed in can drop a pin and describe it. It stays visible only
   to the person who added it until a Fockis reviewer approves it; then it is
   shown on the map and in search for everyone.

   This is separate from Smart Addresses (map_saved_locations), which are
   private to their owner.
============================================================================ */

export const PUBLIC_PLACE_CATEGORIES = [
  "restaurant",
  "shop",
  "market",
  "hospital",
  "pharmacy",
  "school",
  "church",
  "bank",
  "hotel",
  "gas",
  "transport",
  "government",
  "office",
  "landmark",
  "other",
] as const;
export type PublicPlaceCategory = (typeof PUBLIC_PLACE_CATEGORIES)[number];

export const PUBLIC_PLACE_STATUSES = ["pending", "approved", "rejected", "removed"] as const;
export type PublicPlaceStatus = (typeof PUBLIC_PLACE_STATUSES)[number];

@Schema({ _id: false })
export class PublicPlaceEvent {
  @Prop({ type: String, required: true })
  action!: "submitted" | "edited" | "approved" | "rejected" | "removed" | "withdrawn";

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  by!: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  at!: Date;

  @Prop({ type: String, default: "", maxlength: 500 })
  note!: string;
}
const PublicPlaceEventSchema = SchemaFactory.createForClass(PublicPlaceEvent);

@Schema({ collection: "map_public_places", timestamps: true })
export class PublicPlace {
  @Prop({ type: String, required: true, trim: true, maxlength: 100 })
  name!: string;

  @Prop({ type: String, enum: PUBLIC_PLACE_CATEGORIES, default: "other", index: true })
  category!: PublicPlaceCategory;

  @Prop({ type: String, default: "", maxlength: 600 })
  description!: string;

  @Prop({ type: String, default: "", maxlength: 40 })
  phone!: string;

  @Prop({ type: String, default: "", maxlength: 200 })
  website!: string;

  @Prop({ type: String, default: "", maxlength: 200 })
  openingHours!: string;

  /** Street, number, or how people describe where it is. */
  @Prop({ type: String, default: "", maxlength: 200 })
  addressText!: string;

  @Prop({ type: String, default: "", maxlength: 2, index: true })
  countryCode!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  department!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  commune!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  neighborhood!: string;

  /** GeoJSON point: [longitude, latitude]. */
  @Prop({
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
    _id: false,
  })
  location!: { type: "Point"; coordinates: [number, number] };

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  createdBy!: Types.ObjectId;

  @Prop({ type: String, enum: PUBLIC_PLACE_STATUSES, default: "pending", index: true })
  status!: PublicPlaceStatus;

  /** Reviewer's message to the person who added the place. */
  @Prop({ type: String, default: "", maxlength: 500 })
  reviewNote!: string;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  reviewedBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt!: Date | null;

  @Prop({ type: Date, default: () => new Date() })
  submittedAt!: Date;

  @Prop({ type: [PublicPlaceEventSchema], default: [] })
  history!: PublicPlaceEvent[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type PublicPlaceDocument = HydratedDocument<PublicPlace>;
export const PublicPlaceSchema = SchemaFactory.createForClass(PublicPlace);
PublicPlaceSchema.index({ location: "2dsphere" });
PublicPlaceSchema.index({ status: 1, submittedAt: 1 });
PublicPlaceSchema.index({ name: "text", description: "text", addressText: "text", neighborhood: "text" });
