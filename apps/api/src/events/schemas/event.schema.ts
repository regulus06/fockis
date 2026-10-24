import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

export enum EventCategory {
  GENERAL = "general", MUSIC = "music", SPORTS = "sports", BUSINESS = "business",
  EDUCATION = "education", FOOD = "food", COMMUNITY = "community", PARTY = "party",
  CONFERENCE = "conference", RELIGIOUS = "religious", SCHOOL = "school", ACADEMIC = "academic",
  FUNDRAISER = "fundraiser", WORKSHOP = "workshop", MEETING = "meeting", NETWORKING = "networking",
  CULTURAL = "cultural", HEALTH = "health", YOUTH = "youth", TECHNOLOGY = "technology",
  ENVIRONMENT = "environment", POLITICAL = "political", CIVIC = "civic", ARTS = "arts", OTHER = "other",
}
export enum EventVisibility { PUBLIC = "public", FRIENDS = "friends", PRIVATE = "private", ORGANIZATION = "organization" }
export enum EventCoverMediaType { IMAGE = "image", VIDEO = "video" }
export enum EventStatus { UPCOMING = "upcoming", LIVE = "live", ENDED = "ended", CANCELLED = "cancelled" }
export enum EventRsvpStatus { GOING = "going", INTERESTED = "interested" }
export type EventDocument = HydratedDocument<Event>;

/*
 * Schema notes
 *
 * - All dates are stored as UTC instants. `endDate` is the source of truth
 *   for expiry (see utils/event-lifecycle.ts); nothing is deleted when an
 *   event ends.
 * - `attendeeIds` = Going. `interestedIds` = Interested. A user is in at
 *   most one of the two lists; the service enforces that with atomic
 *   $addToSet/$pull updates. Documents created before `interestedIds`
 *   existed simply read it as an empty list (default []).
 * - `timeZone` is the IANA zone the creator scheduled the event in. It is
 *   used only for display ("8:00 PM EDT"); comparisons always use the
 *   stored instants.
 */
@Schema({ timestamps: true, collection: "events", versionKey: false })
export class Event {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true, ref: "User" })
  creatorId!: Types.ObjectId;

  @Prop({ required: true, trim: true, minlength: 2, maxlength: 150 })
  title!: string;

  @Prop({ default: "", trim: true, maxlength: 5000 })
  description!: string;

  @Prop({ type: String, enum: Object.values(EventCategory), default: EventCategory.GENERAL, index: true })
  category!: EventCategory;

  @Prop({ type: String, enum: Object.values(EventVisibility), default: EventVisibility.PUBLIC, index: true })
  visibility!: EventVisibility;

  @Prop({ required: true, type: Date, index: true })
  startDate!: Date;

  @Prop({ required: true, type: Date, index: true })
  endDate!: Date;

  @Prop({ default: "", trim: true, maxlength: 64 })
  timeZone!: string;

  @Prop({ default: "", trim: true, maxlength: 255 })
  locationName!: string;

  @Prop({ default: "", trim: true, maxlength: 500 })
  address!: string;

  @Prop({ type: Number, min: -90, max: 90 })
  latitude?: number;

  @Prop({ type: Number, min: -180, max: 180 })
  longitude?: number;

  @Prop({ type: Boolean, default: false })
  isOnline!: boolean;

  @Prop({ default: "", trim: true, maxlength: 2000 })
  onlineUrl!: string;

  @Prop({ default: "", maxlength: 2000 })
  coverImageUrl!: string;

  @Prop({ default: "", maxlength: 2000 })
  coverVideoUrl!: string;

  @Prop({ type: String, enum: Object.values(EventCoverMediaType), default: EventCoverMediaType.IMAGE })
  coverMediaType!: EventCoverMediaType;

  /** Going. The creator is added on creation and cannot leave. */
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "User" }], default: [] })
  attendeeIds!: Types.ObjectId[];

  /** Interested (distinct from Going). */
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "User" }], default: [] })
  interestedIds!: Types.ObjectId[];

  /** Invited by the organizer. Grants access to private events. */
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: "User" }], default: [] })
  invitedIds!: Types.ObjectId[];

  /** Optional maximum number of Going attendees. Null = unlimited. */
  @Prop({ type: Number, min: 1, max: 1_000_000, default: null })
  capacity?: number | null;

  @Prop({ type: Boolean, default: false, index: true })
  isCancelled!: boolean;

  @Prop({ type: Date, default: null })
  cancelledAt?: Date | null;

  @Prop({ default: "", maxlength: 1000 })
  cancellationReason!: string;
}

export const EventSchema = SchemaFactory.createForClass(Event);

/*
 * Indexes
 *
 * Active discovery always filters on { isCancelled, endDate > now } and
 * usually sorts by startDate, so those lead the compound indexes.
 */
EventSchema.index({ visibility: 1, isCancelled: 1, startDate: 1 });
EventSchema.index({ isCancelled: 1, endDate: 1, startDate: 1 });
EventSchema.index({ category: 1, isCancelled: 1, endDate: 1, startDate: 1 });
EventSchema.index({ isOnline: 1, isCancelled: 1, endDate: 1, startDate: 1 });
EventSchema.index({ latitude: 1, longitude: 1, endDate: 1 });
EventSchema.index({ creatorId: 1, startDate: -1 });
EventSchema.index({ attendeeIds: 1, startDate: 1 });
EventSchema.index({ interestedIds: 1, startDate: 1 });
EventSchema.index({ invitedIds: 1, startDate: 1 });
EventSchema.index({ title: "text", description: "text", locationName: "text", address: "text" });
