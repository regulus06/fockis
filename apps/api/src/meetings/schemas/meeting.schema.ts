import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingDocument =
  HydratedDocument<Meeting>;

@Schema({
  timestamps: true,
  collection: "meetings",
})
export class Meeting {
  /* ==========================================================================
   * BASIC INFORMATION
   * ======================================================================== */

  @Prop({
    required: true,
    trim: true,
    index: true,
  })
  topic!: string;

  @Prop({
    trim: true,
  })
  description?: string;

  /* ==========================================================================
   * HOST
   * ======================================================================== */

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  hostId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  hostName!: string;

  /* ==========================================================================
   * SCHEDULE
   * ======================================================================== */

  /**
   * YYYY-MM-DD representation of the scheduled
   * meeting date.
   *
   * The actual scheduling source of truth is
   * startTime/endTime.
   */
  @Prop({
    required: true,
    index: true,
  })
  date!: string;

  /**
   * Exact scheduled start time.
   */
  @Prop({
    required: true,
    index: true,
  })
  startTime!: Date;

  /**
   * Calculated meeting end time.
   */
  @Prop({
    required: true,
    index: true,
  })
  endTime!: Date;

  @Prop({
    required: true,
    min: 1,
    max: 1440,
  })
  durationMinutes!: number;

  /**
   * IANA timezone supplied by the client.
   *
   * Example:
   * America/New_York
   * America/Chicago
   * UTC
   */
  @Prop({
    required: true,
    default: "UTC",
  })
  timezone!: string;

  /* ==========================================================================
   * MEETING ACCESS
   * ======================================================================== */

  /**
   * Controls who can access the meeting.
   */
  @Prop({
    required: true,
    enum: [
      "private",
      "invite_only",
      "members",
      "organization",
      "public",
    ],
    default: "private",
    index: true,
  })
  visibility!:
    | "private"
    | "invite_only"
    | "members"
    | "organization"
    | "public";

  /**
   * Whether the meeting requires approval before
   * an eligible participant can be admitted.
   */
  @Prop({
    default: true,
  })
  requireApproval!: boolean;

  /**
   * Whether non-invited guests may join.
   */
  @Prop({
    default: false,
  })
  allowGuests!: boolean;

  /**
   * Maximum number of participants in the room,
   * including the host.
   *
   * Undefined means there is no configured
   * participant limit.
   */
  @Prop({
    min: 1,
  })
  maxParticipants?: number;

  /**
   * Human-readable meeting number.
   *
   * Example:
   * 123 456 789
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  meetingCode!: string;

  /**
   * Optional meeting passcode.
   */
  @Prop({
    trim: true,
  })
  passcode?: string;

  /**
   * Private token used to generate the meeting
   * join URL.
   */
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  joinToken!: string;

  /* ==========================================================================
   * STATUS
   * ======================================================================== */

  @Prop({
    required: true,
    enum: [
      "scheduled",
      "starting_soon",
      "late",
      "live",
      "ended",
      "cancelled",
    ],
    default: "scheduled",
    index: true,
  })
  status!: string;

  /* ==========================================================================
   * SECURITY SETTINGS
   * ======================================================================== */

  @Prop({
    type: Object,
    default: () => ({
      waitingRoomEnabled: true,
      allowJoinBeforeHost: false,
      muteParticipantsOnEntry: true,
      screenShareWhoCanShare: "host_only",
      locked: false,
    }),
  })
  security!: {
    waitingRoomEnabled: boolean;

    allowJoinBeforeHost: boolean;

    muteParticipantsOnEntry: boolean;

    screenShareWhoCanShare:
      | "host_only"
      | "everyone";

    locked: boolean;
  };

  /* ==========================================================================
   * AI SECRETARY
   * ======================================================================== */

  @Prop({
    type: Object,
    default: () => ({
      enabled: true,
      takeNotes: true,
      generateTranscript: true,
      identifyMainPoints: true,
      identifyDecisions: true,
      identifyActionItems: true,
      identifyQuestions: true,
      generateSummary: true,
      generatePdfReport: true,
    }),
  })
  secretary!: {
    enabled: boolean;

    takeNotes: boolean;

    generateTranscript: boolean;

    identifyMainPoints: boolean;

    identifyDecisions: boolean;

    identifyActionItems: boolean;

    identifyQuestions: boolean;

    generateSummary: boolean;

    generatePdfReport: boolean;
  };

  /* ==========================================================================
   * RECORDING
   * ======================================================================== */

  @Prop({
    default: true,
  })
  recordingEnabled!: boolean;

  /* ==========================================================================
   * LIVE ROOM
   * ======================================================================== */

  /**
   * LiveKit / realtime room name.
   *
   * This should normally be populated when
   * the meeting actually starts.
   */
  @Prop({
    index: true,
  })
  liveRoomName?: string;

  /* ==========================================================================
   * LIFECYCLE
   * ======================================================================== */

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;
}

/* ============================================================================
 * SCHEMA
 * ========================================================================== */

export const MeetingSchema =
  SchemaFactory.createForClass(
    Meeting,
  );

/* ============================================================================
 * INDEXES
 * ========================================================================== */

/**
 * Host's meetings sorted by schedule.
 */
MeetingSchema.index({
  hostId: 1,
  status: 1,
  startTime: -1,
});

/**
 * Efficient date/time lookup.
 */
MeetingSchema.index({
  date: 1,
  startTime: 1,
});

/**
 * Efficient upcoming-meeting lookup.
 */
MeetingSchema.index({
  status: 1,
  startTime: 1,
});

/**
 * Efficient live/active meeting lookup.
 */
MeetingSchema.index({
  status: 1,
  startedAt: -1,
});

/**
 * Efficient visibility lookup.
 */
MeetingSchema.index({
  visibility: 1,
  status: 1,
  startTime: 1,
});
