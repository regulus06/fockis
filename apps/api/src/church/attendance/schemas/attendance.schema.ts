/**
 * attendance.schema.ts
 * -----------------------------------------------------------------------------
 * Unified Mongoose schema for:
 *
 *   1. Attendance check-ins
 *   2. Absence reports
 *
 * Both are stored in the same collection and differentiated by `kind`.
 * -----------------------------------------------------------------------------
 */

import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  Types,
} from "mongoose";

import {
  AttendanceType,
} from "../../enums/attendance-type.enum";

/* ============================================================================
   ABSENCE REASONS
   ============================================================================ */

export enum AbsenceReasonCategory {
  Illness = "illness",
  Travel = "travel",
  Family = "family",
  Work = "work",
  Other = "other",
}

/* ============================================================================
   ATTENDANCE ENTRY KIND
   ============================================================================ */

export enum AttendanceEntryKind {
  CheckIn = "check_in",
  AbsenceReport = "absence_report",
}

/* ============================================================================
   DOCUMENT TYPE
   ============================================================================ */

export type AttendanceEntryDocument =
  AttendanceEntry & Document;

/* ============================================================================
   SCHEMA
   ============================================================================ */

@Schema({
  timestamps: true,
  collection: "church_attendance",
})
export class AttendanceEntry {
  /* ==========================================================================
     ORGANIZATION
     ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /* ==========================================================================
     EVENT
     ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "ChurchEvent",
    required: true,
    index: true,
  })
  eventId!: Types.ObjectId;

  /* ==========================================================================
     MEMBER
     ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: "Membership",
    required: true,
    index: true,
  })
  memberId!: Types.ObjectId;

  /* ==========================================================================
     ENTRY KIND
     ========================================================================== */

  @Prop({
    type: String,
    enum: AttendanceEntryKind,
    required: true,
    index: true,
  })
  kind!: AttendanceEntryKind;

  /* ==========================================================================
     ATTENDANCE TYPE
     ========================================================================== */

  /**
   * Set when:
   *
   *   kind === AttendanceEntryKind.CheckIn
   *
   * Examples depend on AttendanceType enum.
   */
  @Prop({
    type: String,
    enum: AttendanceType,
    default: null,
  })
  attendanceType?: AttendanceType | null;

  /* ==========================================================================
     ABSENCE REASON
     ========================================================================== */

  /**
   * Set when:
   *
   *   kind === AttendanceEntryKind.AbsenceReport
   */
  @Prop({
    type: String,
    enum: AbsenceReasonCategory,
    default: null,
  })
  reasonCategory?: AbsenceReasonCategory | null;

  /* ==========================================================================
     NOTE
     ========================================================================== */

  @Prop()
  note?: string;

  /* ==========================================================================
     RECORDED BY
     ========================================================================== */

  /**
   * The membership that recorded a check-in on behalf of another member.
   *
   * This is normally used by a:
   *
   *   - Leader
   *   - Admin
   *   - Manager
   *
   * It remains null for normal self-reported attendance and absence reports.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Membership",
    default: null,
  })
  recordedById?: Types.ObjectId | null;

  /* ==========================================================================
     OCCURRED AT
     ========================================================================== */

  @Prop({
    type: Date,
    default: () => new Date(),
  })
  occurredAt!: Date;

  /* ==========================================================================
     MONGOOSE TIMESTAMPS
     ========================================================================== */

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA FACTORY
   ============================================================================ */

export const AttendanceEntrySchema =
  SchemaFactory.createForClass(
    AttendanceEntry,
  );

/* ============================================================================
   UNIQUE ATTENDANCE INDEX
   ============================================================================ */

/**
 * Prevents duplicate entries for the same:
 *
 *   event + member + kind
 *
 * This allows a member to have one check-in and one absence report for the
 * same event, while preventing duplicate records of the same kind.
 */
AttendanceEntrySchema.index(
  {
    eventId: 1,
    memberId: 1,
    kind: 1,
  },
  {
    unique: true,
  },
);