import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/* ============================================================================
   SAVED LOCATIONS — Fockis Smart Address
   A user's own pinned places (home, work, saved). No street address or house
   number is required: the GPS pin, Plus Code, landmarks and written
   directions identify the place. Precise coordinates are visible only to the
   owner, and to people the owner sends a share link to.
============================================================================ */

export const LOCATION_KINDS = ["home", "work", "saved", "family", "business"] as const;
export type LocationKind = (typeof LOCATION_KINDS)[number];

export const LANDMARK_RELATIONS = ["near", "next_to", "across_from", "behind", "after", "before"] as const;

export const VERIFICATION_STATUSES = ["pending", "verified", "needs_info", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** One step of an address's review: submitted, changed, decided. */
@Schema({ _id: false })
export class VerificationEvent {
  @Prop({ type: String, required: true })
  action!: "submitted" | "resubmitted" | "changed" | "verified" | "needs_info" | "rejected";

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  by!: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  at!: Date;

  @Prop({ type: String, default: "", maxlength: 500 })
  note!: string;
}
const VerificationEventSchema = SchemaFactory.createForClass(VerificationEvent);

@Schema({ _id: false })
export class Landmark {
  @Prop({ type: String, required: true, maxlength: 80 })
  name!: string;

  @Prop({ type: String, enum: LANDMARK_RELATIONS, default: "near" })
  relation!: (typeof LANDMARK_RELATIONS)[number];
}
const LandmarkSchema = SchemaFactory.createForClass(Landmark);

@Schema({ _id: false })
export class BuildingRef {
  /** "osm" when the user picked a building footprint, "pin" otherwise. */
  @Prop({ type: String, enum: ["osm", "pin"], default: "pin" })
  source!: "osm" | "pin";

  @Prop({ type: String, default: "" })
  osmId!: string;

  /** GeoJSON Polygon of the selected footprint (as drawn in the map tiles). */
  @Prop({ type: Object, default: null })
  footprint?: { type: "Polygon"; coordinates: number[][][] } | null;
}
const BuildingRefSchema = SchemaFactory.createForClass(BuildingRef);

@Schema({ collection: "map_saved_locations", timestamps: true })
export class SavedLocation {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: LOCATION_KINDS, default: "saved", index: true })
  kind!: LocationKind;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  label!: string;

  /** e.g. FSA-HT-000124. Unique and never reused. */
  @Prop({ type: String, required: true, unique: true })
  smartAddressId!: string;

  /** Open Location Code (11 characters ≈ 3 m precision). */
  @Prop({ type: String, required: true, index: true })
  plusCode!: string;

  /** GeoJSON point: [longitude, latitude]. */
  @Prop({ type: { type: String, enum: ["Point"], default: "Point" }, coordinates: { type: [Number], required: true } })
  location!: { type: "Point"; coordinates: [number, number] };

  /** Reported GPS accuracy in metres when captured from the device (0 = placed by hand). */
  @Prop({ type: Number, default: 0 })
  accuracyM!: number;

  @Prop({ type: String, enum: ["gps", "pin", "search", "building"], default: "pin" })
  captureMethod!: "gps" | "pin" | "search" | "building";

  @Prop({ type: BuildingRefSchema, default: () => ({ source: "pin" }) })
  building!: BuildingRef;

  @Prop({ type: String, default: "Haiti", maxlength: 80 })
  country!: string;

  @Prop({ type: String, default: "HT", maxlength: 2 })
  countryCode!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  department!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  commune!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  communalSection!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  neighborhood!: string;

  @Prop({ type: String, default: "", maxlength: 80 })
  locality!: string;

  /** Optional street and number when one exists. */
  @Prop({ type: String, default: "", maxlength: 160 })
  streetAddress!: string;

  @Prop({ type: [LandmarkSchema], default: [] })
  landmarks!: Landmark[];

  /** Searchable copy of the landmark names. */
  @Prop({ type: String, default: "" })
  landmarkText!: string;

  /** e.g. "Second house after the school, on the left. Blue gate." */
  @Prop({ type: String, default: "", maxlength: 500 })
  directions!: string;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;

  /** Share link (random token). Anyone with the link sees this place. */
  @Prop({ type: String, default: null, index: true, sparse: true })
  shareToken?: string | null;

  @Prop({ type: Date, default: null })
  shareExpiresAt?: Date | null;

  /* ---- Verification by Fockis staff. Every new address starts "pending";
     moving the pin or changing the address sends it back for review. A
     missing status (addresses saved before review existed) means pending. */

  @Prop({ type: String, enum: VERIFICATION_STATUSES, default: "pending", index: true })
  verificationStatus!: VerificationStatus;

  @Prop({ type: Date, default: null })
  verificationRequestedAt!: Date | null;

  @Prop({ type: Date, default: null })
  verificationReviewedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  verificationReviewedBy!: Types.ObjectId | null;

  /** Message from the reviewer to the owner (why rejected, what's missing). */
  @Prop({ type: String, default: "", maxlength: 500 })
  verificationNote!: string;

  @Prop({ type: [VerificationEventSchema], default: [] })
  verificationHistory!: VerificationEvent[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type SavedLocationDocument = HydratedDocument<SavedLocation>;
export const SavedLocationSchema = SchemaFactory.createForClass(SavedLocation);
SavedLocationSchema.index({ location: "2dsphere" });
SavedLocationSchema.index({ userId: 1, kind: 1, updatedAt: -1 });
SavedLocationSchema.index({ verificationStatus: 1, verificationRequestedAt: 1 });

/* ---------------------------------------------------------------------------
   COUNTERS (Smart Address numbering, per country)
--------------------------------------------------------------------------- */

@Schema({ collection: "map_counters" })
export class MapCounter {
  @Prop({ type: String, required: true })
  _id!: string;

  @Prop({ type: Number, default: 0 })
  seq!: number;
}
export type MapCounterDocument = HydratedDocument<MapCounter>;
export const MapCounterSchema = SchemaFactory.createForClass(MapCounter);

/* ---------------------------------------------------------------------------
   SAVED ROUTES
--------------------------------------------------------------------------- */

export const ROUTE_MODES = ["driving", "motorcycle", "walking", "bicycle"] as const;

@Schema({ _id: false })
export class RouteEnd {
  @Prop({ type: String, default: "", maxlength: 120 })
  label!: string;

  @Prop({ type: Number, required: true })
  lat!: number;

  @Prop({ type: Number, required: true })
  lon!: number;
}
const RouteEndSchema = SchemaFactory.createForClass(RouteEnd);

@Schema({ collection: "map_saved_routes", timestamps: true })
export class SavedRoute {
  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 80 })
  name!: string;

  @Prop({ type: RouteEndSchema, required: true })
  origin!: RouteEnd;

  @Prop({ type: RouteEndSchema, required: true })
  destination!: RouteEnd;

  @Prop({ type: String, enum: ROUTE_MODES, default: "driving" })
  mode!: (typeof ROUTE_MODES)[number];

  @Prop({ type: Number, default: 0 })
  distanceM!: number;

  @Prop({ type: Number, default: 0 })
  durationS!: number;

  @Prop({ type: String, default: "", maxlength: 160 })
  summary!: string;

  createdAt?: Date;
  updatedAt?: Date;
}
export type SavedRouteDocument = HydratedDocument<SavedRoute>;
export const SavedRouteSchema = SchemaFactory.createForClass(SavedRoute);
