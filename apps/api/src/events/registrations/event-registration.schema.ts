/**
 * event-registration.schema.ts
 * -----------------------------------------------------------------------------
 * One registration for an event: the person who registered (signed-in user or
 * guest), how many people they bring, their answers, the ticket and price,
 * payment, status and check-in.
 *
 * Duplicate rule: `activeKey` is "<eventId>:u:<userId>" (or ":e:<email>" for
 * guests) while the registration is active, and null once it is cancelled,
 * rejected or expired. A unique partial index on it makes a second active
 * registration for the same person impossible, even with double clicks or
 * parallel requests.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

import type { AttendanceOption, StoredAnswer } from "./registration-settings";

export enum RegistrationStatus {
  PENDING_PAYMENT = "pending_payment",
  PENDING_APPROVAL = "pending_approval",
  CONFIRMED = "confirmed",
  WAITLISTED = "waitlisted",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
  /** Payment was not completed in time; the held places were released. */
  EXPIRED = "expired",
}

export enum RegistrationPaymentStatus {
  NOT_REQUIRED = "not_required",
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum AttendanceStatus {
  NOT_CHECKED_IN = "not_checked_in",
  PARTIALLY_CHECKED_IN = "partially_checked_in",
  CHECKED_IN = "checked_in",
}

/** Statuses that keep a person "registered" (and block a duplicate). */
export const ACTIVE_STATUSES = [
  RegistrationStatus.PENDING_PAYMENT,
  RegistrationStatus.PENDING_APPROVAL,
  RegistrationStatus.CONFIRMED,
  RegistrationStatus.WAITLISTED,
];

/** Statuses that hold places against the capacity. */
export const SEAT_HOLDING_STATUSES = [
  RegistrationStatus.PENDING_PAYMENT,
  RegistrationStatus.PENDING_APPROVAL,
  RegistrationStatus.CONFIRMED,
];

export interface RegistrationAttendee {
  name: string;
  checkedInAt: Date | null;
  checkedInBy: Types.ObjectId | null;
}

@Schema({ collection: "event_registrations", timestamps: true, versionKey: false })
export class EventRegistration {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Event", required: true, index: true })
  eventId!: Types.ObjectId;

  /** Organizer at the time of registration (for organizer queries). */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true, index: true })
  organizerId!: Types.ObjectId;

  /** Null for guest registrations. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", default: null, index: true })
  userId!: Types.ObjectId | null;

  @Prop({ type: String, required: true, unique: true })
  registrationNumber!: string;

  @Prop({ type: String, default: null })
  activeKey!: string | null;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  attendeeName!: string;

  @Prop({ type: String, required: true, trim: true, lowercase: true, maxlength: 254 })
  attendeeEmail!: string;

  @Prop({ type: String, default: "", trim: true, maxlength: 40 })
  phone!: string;

  /** Number of people on this registration (= tickets). */
  @Prop({ type: Number, required: true, min: 1, max: 20 })
  attendeeCount!: number;

  @Prop({
    type: [{ name: String, checkedInAt: { type: Date, default: null }, checkedInBy: { type: MongooseSchema.Types.ObjectId, default: null } }],
    default: [],
    _id: false,
  })
  attendees!: RegistrationAttendee[];

  @Prop({ type: String, enum: ["in_person", "online"], default: "in_person" })
  attendanceMode!: AttendanceOption;

  @Prop({ type: [Object], default: [] })
  customAnswers!: StoredAnswer[];

  @Prop({ type: String, default: "", maxlength: 500 })
  accessibilityNeeds!: string;

  @Prop({ type: String, default: "", maxlength: 500 })
  specialRequests!: string;

  @Prop({ type: Date, default: null })
  agreedToTermsAt!: Date | null;

  /* ------------------------------------------------------------ ticket */

  @Prop({ type: String, required: true })
  ticketTypeId!: string;

  @Prop({ type: String, required: true })
  ticketName!: string;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice!: number;

  @Prop({ type: Number, required: true, min: 0 })
  subtotal!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  fees!: number;

  @Prop({ type: Number, default: 0, min: 0 })
  tax!: number;

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount!: number;

  @Prop({ type: String, required: true, uppercase: true })
  currency!: string;

  /* ------------------------------------------------------------ payment */

  @Prop({ type: String, enum: Object.values(RegistrationPaymentStatus), required: true, index: true })
  paymentStatus!: RegistrationPaymentStatus;

  /** Fockis payment id (payments collection, purpose "event"). */
  @Prop({ type: String, default: null })
  paymentId!: string | null;

  @Prop({ type: String, default: null })
  paymentIntentId!: string | null;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  /** Paid after the hold expired and the event was full: organizer must resolve. */
  @Prop({ type: Boolean, default: false })
  needsAttention!: boolean;

  /* ------------------------------------------------------------ status */

  @Prop({ type: String, enum: Object.values(RegistrationStatus), required: true, index: true })
  status!: RegistrationStatus;

  /** Places counted against capacity right now. */
  @Prop({ type: Boolean, default: false })
  holdsSeats!: boolean;

  /** Unpaid holds are released after this time. */
  @Prop({ type: Date, default: null, index: true })
  holdExpiresAt!: Date | null;

  @Prop({ type: String, enum: Object.values(AttendanceStatus), default: AttendanceStatus.NOT_CHECKED_IN })
  attendanceStatus!: AttendanceStatus;

  @Prop({ type: Date, default: Date.now })
  registeredAt!: Date;

  @Prop({ type: Date, default: null })
  confirmedAt!: Date | null;

  @Prop({ type: Date, default: null })
  checkedInAt!: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  checkedInBy!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  cancelledAt!: Date | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  cancelledBy!: Types.ObjectId | null;

  @Prop({ type: String, default: "", maxlength: 500 })
  cancellationReason!: string;

  @Prop({ type: Date, default: null })
  decidedAt!: Date | null;

  /* ------------------------------------------------------------ QR / access */

  /** Bumped to invalidate every QR code issued so far (e.g. after cancelling). */
  @Prop({ type: Number, default: 1 })
  qrVersion!: number;

  /** sha256 of the guest access key (guests have no account to sign in with). */
  @Prop({ type: String, default: null })
  accessKeyHash!: string | null;

  /* ------------------------------------------------------------ messaging */

  @Prop({ type: Date, required: true, index: true })
  eventStartDate!: Date;

  @Prop({ type: Date, required: true })
  eventEndDate!: Date;

  @Prop({ type: Date, default: null })
  reminderSentAt!: Date | null;

  @Prop({ type: Date, default: null })
  confirmationSentAt!: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type EventRegistrationDocument = HydratedDocument<EventRegistration>;
export const EventRegistrationSchema = SchemaFactory.createForClass(EventRegistration);

// One active registration per person per event.
EventRegistrationSchema.index(
  { activeKey: 1 },
  { unique: true, partialFilterExpression: { activeKey: { $type: "string" } } },
);
// Organizer table: newest first, filters by status.
EventRegistrationSchema.index({ eventId: 1, registeredAt: -1 });
EventRegistrationSchema.index({ eventId: 1, status: 1, registeredAt: 1 });
// My Events.
EventRegistrationSchema.index({ userId: 1, eventStartDate: -1 });
// Reminder sweep.
EventRegistrationSchema.index({ status: 1, reminderSentAt: 1, eventStartDate: 1 });
// Unpaid hold sweep.
EventRegistrationSchema.index({ status: 1, holdExpiresAt: 1 });
