/**
 * department.schema.ts
 * ---------------------------------------------------------------------------
 * Mongoose schema for a Church Department.
 *
 * Department membership:
 * - Membership.departmentIds contains department IDs.
 *
 * Department leaders:
 * - leaderIds contains Membership IDs.
 *
 * Ownership:
 * - createdByUserId permanently records the user who created the department.
 *
 * Archive:
 * - isArchived is a soft-delete flag.
 * - archivedAt records when the department was archived.
 * - archivedByUserId records who archived it.
 *
 * IMPORTANT:
 * Archiving NEVER removes department IDs from Membership documents.
 * This preserves membership history and allows the department to be restored.
 * ---------------------------------------------------------------------------
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

import { DepartmentType } from "../../enums/department-type.enum";

/**
 * One recurring ministry meeting shown on the ministry page
 * ("Youth Service — Sundays, 10:00 AM – 11:30 AM").
 */
@Schema({ _id: false })
export class MinistryMeeting {
  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name!: string;

  /** Free text such as "Sundays" or "Every other Friday". */
  @Prop({ type: String, default: "", trim: true, maxlength: 80 })
  day!: string;

  /** "10:00 AM", kept as typed by the administrator. */
  @Prop({ type: String, default: "", trim: true, maxlength: 20 })
  startTime!: string;

  @Prop({ type: String, default: "", trim: true, maxlength: 20 })
  endTime!: string;

  /** Room, address or an online meeting link. */
  @Prop({ type: String, default: "", trim: true, maxlength: 300 })
  location!: string;

  /* ---- Structured schedule (used to create one attendance session per date).
          Rows saved before these existed keep working as display-only text. */

  /** Stable ID of this meeting; part of every session's occurrence key. */
  @Prop({ type: String, default: "" })
  key!: string;

  @Prop({ type: String, enum: ["", "once", "weekly", "biweekly", "monthly"], default: "" })
  frequency!: "" | "once" | "weekly" | "biweekly" | "monthly";

  /** 0 = Sunday … 6 = Saturday. */
  @Prop({ type: [Number], default: [] })
  weekdays!: number[];

  /** First date (YYYY-MM-DD) in the meeting's time zone. */
  @Prop({ type: String, default: "" })
  anchorDate!: string;

  /** Optional last date (YYYY-MM-DD). */
  @Prop({ type: String, default: "" })
  endDate!: string;

  /** 24-hour "HH:mm" in the meeting's time zone. */
  @Prop({ type: String, default: "" })
  startClock!: string;

  @Prop({ type: String, default: "" })
  endClock!: string;

  /** IANA time zone, e.g. "America/New_York". */
  @Prop({ type: String, default: "" })
  timeZone!: string;

  /** Create attendance sessions for this meeting automatically. */
  @Prop({ type: Boolean, default: true })
  attendance!: boolean;
}

export const MinistryMeetingSchema = SchemaFactory.createForClass(MinistryMeeting);

export type DepartmentDocument =
  Department & Document;

@Schema({
  timestamps: true,
  collection: "church_departments",
})
export class Department {
  /**
   * Organization that owns this department.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  /**
   * User who originally created this department.
   *
   * This is intentionally preserved forever, including after archive.
   *
   * Optional at the database level so existing departments created before
   * this field existed do not break.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  })
  createdByUserId?: Types.ObjectId | null;

  /**
   * Optional branch association.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "Branch",
    default: null,
  })
  branchId?: Types.ObjectId | null;

  /**
   * Department name.
   */
  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  name!: string;

  /**
   * Department type.
   */
  @Prop({
    type: String,
    enum: DepartmentType,
    required: true,
    index: true,
  })
  departmentType!: DepartmentType;

  /**
   * Department description.
   */
  @Prop({
    type: String,
  })
  description?: string;

  /**
   * Optional department photo.
   */
  @Prop({
    type: String,
    default: null,
  })
  photoUrl?: string | null;

  /**
   * Membership IDs that are department leaders.
   */
  @Prop({
    type: [Types.ObjectId],
    ref: "Membership",
    default: [],
  })
  leaderIds!: Types.ObjectId[];

  /**
   * Position shown for each leader on the ministry page, keyed by
   * Membership ID ("Youth Director", "Assistant Director"…). Optional.
   */
  @Prop({
    type: Map,
    of: String,
    default: {},
  })
  leaderTitles?: Map<string, string>;

  /** Regular meetings shown in "Meeting Schedule". Optional. */
  @Prop({
    type: [MinistryMeetingSchema],
    default: [],
  })
  meetingSchedule?: MinistryMeeting[];

  /**
   * Attendance settings for this ministry (see ministry-attendance.schemas.ts
   * DEFAULT_ATTENDANCE_SETTINGS). Missing keys fall back to the defaults.
   */
  @Prop({ type: Object, default: undefined })
  attendanceSettings?: Record<string, unknown>;

  /* ---- Ministries management (see org/ministries). All optional, so
          departments saved before these existed keep working. */

  /** Ministry category (worship, youth, ushers…). Empty = derived from departmentType. */
  @Prop({ type: String, default: "", index: true })
  category?: string;

  /** active | inactive | pending_approval | draft. Archived stays isArchived. */
  @Prop({ type: String, default: "active", index: true })
  ministryStatus?: string;

  /** Visibility, join rules, budget, contact… (MinistrySettings). */
  @Prop({ type: Object, default: undefined })
  ministrySettings?: Record<string, unknown>;

  /**
   * Soft archive flag.
   *
   * false = active
   * true  = archived
   */
  @Prop({
    type: Boolean,
    default: false,
    index: true,
  })
  isArchived!: boolean;

  /**
   * Time the department was archived.
   */
  @Prop({
    type: Date,
    default: null,
  })
  archivedAt?: Date | null;

  /**
   * User who archived the department.
   */
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    default: null,
  })
  archivedByUserId?: Types.ObjectId | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const DepartmentSchema =
  SchemaFactory.createForClass(
    Department,
  );

/**
 * Normal organization lookup.
 */
DepartmentSchema.index({
  organizationId: 1,
  name: 1,
});

/**
 * Efficient active/archived filtering.
 */
DepartmentSchema.index({
  organizationId: 1,
  isArchived: 1,
});

/**
 * Useful when displaying departments by branch.
 */
DepartmentSchema.index({
  organizationId: 1,
  branchId: 1,
  isArchived: 1,
});