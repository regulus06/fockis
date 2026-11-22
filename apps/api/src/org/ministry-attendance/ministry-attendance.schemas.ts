/**
 * ministry-attendance.schemas.ts
 * -----------------------------------------------------------------------------
 * ONE MEETING OCCURRENCE = ONE SESSION = ONE INDEPENDENT ATTENDANCE RECORD SET.
 *
 * MinistryAttendanceSession
 *   One per meeting date (or per ministry event). `occurrenceKey` is unique per
 *   ministry ("m:<meetingKey>:<YYYY-MM-DD>" or "e:<eventId>"), so creating a
 *   session is idempotent. The session keeps its own copy of the schedule
 *   (title, start, end, time zone, location): later schedule edits never
 *   rewrite a session that has records or is finalized.
 *
 * MinistryAttendanceRecord
 *   One per member per session (unique index). Stores the actual arrival time
 *   and the time the record was entered separately, the official status and
 *   late minutes computed by the server, how it was recorded, who recorded
 *   it, and every correction in `audit`.
 *
 * "Not Checked In" is the absence of a record — members are never marked
 * absent automatically before a manager finalizes the session.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export enum AttendanceSessionState {
  Scheduled = "scheduled",
  Finalized = "finalized",
  Canceled = "canceled",
  Archived = "archived",
}

export enum MinistryAttendanceStatus {
  Present = "present",
  Late = "late",
  Absent = "absent",
  Excused = "excused",
}

export enum AttendanceRecordingMethod {
  QrCode = "QR_CODE",
  MemberSelfCheckIn = "MEMBER_SELF_CHECKIN",
  Manual = "MANUAL",
  Import = "IMPORT",
  AdminCorrection = "ADMIN_CORRECTION",
  Finalization = "FINALIZATION",
}

/* ------------------------------------------------------------------ session */

@Schema({ collection: "ministry_attendance_sessions", timestamps: true })
export class MinistryAttendanceSession {
  @Prop({ type: Types.ObjectId, ref: "Organization", required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Department", required: true })
  ministryId!: Types.ObjectId;

  /** "m:<meetingKey>:<YYYY-MM-DD>" or "e:<eventId>". Unique per ministry. */
  @Prop({ type: String, required: true })
  occurrenceKey!: string;

  @Prop({ type: String, enum: ["meeting", "event", "manual"], required: true })
  sourceType!: "meeting" | "event" | "manual";

  /** Meeting key (from the ministry schedule) or ChurchEvent id. */
  @Prop({ type: String, default: null })
  sourceId!: string | null;

  /** Local calendar date of the occurrence in its time zone. */
  @Prop({ type: String, required: true })
  occurrenceDate!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 160 })
  title!: string;

  @Prop({ type: String, default: "", trim: true, maxlength: 300 })
  location!: string;

  @Prop({ type: Date, required: true })
  scheduledStartAt!: Date;

  @Prop({ type: Date, default: null })
  scheduledEndAt!: Date | null;

  @Prop({ type: String, required: true })
  timeZone!: string;

  @Prop({ type: Date, required: true })
  checkInOpensAt!: Date;

  @Prop({ type: Date, required: true })
  checkInClosesAt!: Date;

  @Prop({ type: String, enum: Object.values(AttendanceSessionState), default: AttendanceSessionState.Scheduled })
  state!: AttendanceSessionState;

  @Prop({ type: String, default: "" })
  cancelReason!: string;

  /** Secret in the QR code; only valid for this session. */
  @Prop({ type: String, required: true, select: false })
  checkInToken!: string;

  /** Expected members frozen at finalization (Membership IDs). */
  @Prop({ type: [Types.ObjectId], default: undefined })
  expectedSnapshot?: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, default: null })
  createdByMembershipId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  finalizedAt!: Date | null;

  @Prop({ type: Types.ObjectId, default: null })
  finalizedByMembershipId!: Types.ObjectId | null;

  /** Session-level history: finalize, reopen, cancel, restore, open/close check-in. */
  @Prop({
    type: [
      {
        _id: false,
        at: { type: Date, required: true },
        byMembershipId: { type: Types.ObjectId, default: null },
        byName: { type: String, default: "" },
        action: { type: String, required: true },
        note: { type: String, default: "" },
      },
    ],
    default: [],
  })
  log!: { at: Date; byMembershipId: Types.ObjectId | null; byName: string; action: string; note: string }[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type MinistryAttendanceSessionDocument = HydratedDocument<MinistryAttendanceSession>;
export const MinistryAttendanceSessionSchema = SchemaFactory.createForClass(MinistryAttendanceSession);
MinistryAttendanceSessionSchema.index({ ministryId: 1, occurrenceKey: 1 }, { unique: true });
MinistryAttendanceSessionSchema.index({ organizationId: 1, ministryId: 1, scheduledStartAt: -1 });

/* ---------------------------------------------------------- record + audit */

@Schema({ _id: false })
export class AttendanceAuditEntry {
  @Prop({ type: Date, required: true })
  at!: Date;

  @Prop({ type: Types.ObjectId, default: null })
  byMembershipId!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  byName!: string;

  @Prop({ type: String, default: null })
  previousStatus!: string | null;

  @Prop({ type: String, required: true })
  newStatus!: string;

  @Prop({ type: Date, default: null })
  previousArrivalAt!: Date | null;

  @Prop({ type: Date, default: null })
  newArrivalAt!: Date | null;

  @Prop({ type: Number, default: null })
  previousLateMinutes!: number | null;

  @Prop({ type: Number, default: null })
  newLateMinutes!: number | null;

  @Prop({ type: String, required: true })
  method!: string;

  @Prop({ type: String, default: "" })
  reason!: string;

  @Prop({ type: Boolean, default: false })
  afterFinalization!: boolean;
}
export const AttendanceAuditEntrySchema = SchemaFactory.createForClass(AttendanceAuditEntry);

@Schema({ collection: "ministry_attendance_records", timestamps: true })
export class MinistryAttendanceRecord {
  @Prop({ type: Types.ObjectId, ref: "MinistryAttendanceSession", required: true })
  sessionId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Organization", required: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Department", required: true })
  ministryId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Membership", required: true })
  membershipId!: Types.ObjectId;

  /** Copy of the session start, for member history sorting. */
  @Prop({ type: Date, required: true })
  scheduledStartAt!: Date;

  @Prop({ type: String, enum: Object.values(MinistryAttendanceStatus), required: true })
  status!: MinistryAttendanceStatus;

  /** When the member actually arrived. Null when unknown. */
  @Prop({ type: Date, default: null })
  actualArrivalAt!: Date | null;

  /** When the record was entered or last changed. Never used for lateness. */
  @Prop({ type: Date, required: true })
  recordedAt!: Date;

  /** Server-computed. Null for late-without-known-time, absent, excused. */
  @Prop({ type: Number, default: null })
  lateMinutes!: number | null;

  @Prop({ type: String, enum: Object.values(AttendanceRecordingMethod), required: true })
  recordingMethod!: AttendanceRecordingMethod;

  @Prop({ type: Types.ObjectId, default: null })
  recordedByMembershipId!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  correctionReason!: string;

  @Prop({ type: [AttendanceAuditEntrySchema], default: [] })
  audit!: AttendanceAuditEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type MinistryAttendanceRecordDocument = HydratedDocument<MinistryAttendanceRecord>;
export const MinistryAttendanceRecordSchema = SchemaFactory.createForClass(MinistryAttendanceRecord);
MinistryAttendanceRecordSchema.index({ sessionId: 1, membershipId: 1 }, { unique: true });
MinistryAttendanceRecordSchema.index({ organizationId: 1, ministryId: 1, recordedAt: -1 });
MinistryAttendanceRecordSchema.index({ membershipId: 1, scheduledStartAt: -1 });

/* ---------------------------------------------------------------- settings */

/** Stored on the ministry (Department.attendanceSettings). */
export interface MinistryAttendanceSettings {
  qrCheckIn: boolean;
  selfCheckIn: boolean;
  manualAttendance: boolean;
  /** Minutes before the start that check-in opens. */
  opensMinutesBefore: number;
  /** Minutes after the scheduled end (or start when no end) that check-in closes. */
  closesMinutesAfter: number;
  allowCorrections: boolean;
  requireCorrectionReason: boolean;
  allowCorrectionsAfterFinalize: boolean;
  allowReopen: boolean;
  allowVisitors: boolean;
  membersSeeOwnHistory: boolean;
  /** Default time zone for new meetings and the dashboard. */
  timeZone: string;
}

export const DEFAULT_ATTENDANCE_SETTINGS: MinistryAttendanceSettings = {
  qrCheckIn: true,
  selfCheckIn: true,
  manualAttendance: true,
  opensMinutesBefore: 30,
  closesMinutesAfter: 60,
  allowCorrections: true,
  requireCorrectionReason: true,
  allowCorrectionsAfterFinalize: true,
  allowReopen: true,
  allowVisitors: false,
  membersSeeOwnHistory: true,
  timeZone: "America/New_York",
};
