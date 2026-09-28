import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingParticipantDocument =
  HydratedDocument<MeetingParticipant>;

@Schema({
  timestamps: true,
  collection: "meeting_participants",
})
export class MeetingParticipant {
  /* ==========================================================================
   * RELATIONSHIP
   * ======================================================================== */

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  meetingId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* ==========================================================================
   * USER INFORMATION
   * ======================================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  displayName!: string;

  @Prop({
    trim: true,
  })
  email?: string;

  @Prop({
    trim: true,
  })
  avatarUrl?: string;

  /* ==========================================================================
   * ROLE
   * ======================================================================== */

  @Prop({
    enum: [
      "host",
      "co-host",
      "participant",
    ],
    default: "participant",
    index: true,
  })
  role!: string;

  /* ==========================================================================
   * INVITATION
   * ======================================================================== */

  /**
   * Whether the participant was explicitly
   * invited to the meeting.
   *
   * Host = false
   * Invitee = true
   */
  @Prop({
    default: false,
    index: true,
  })
  invited!: boolean;

  /**
   * Invitation lifecycle.
   *
   * pending:
   *   Meeting was scheduled and user was invited.
   *
   * accepted:
   *   User joined/accepted the invitation.
   *
   * declined:
   *   User declined the invitation.
   *
   * waiting:
   *   User is waiting for host admission.
   */
  @Prop({
    enum: [
      "pending",
      "accepted",
      "declined",
      "waiting",
    ],
    default: "pending",
    index: true,
  })
  invitationStatus!: string;

  /* ==========================================================================
   * MEDIA STATE
   * ======================================================================== */

  @Prop({
    default: false,
  })
  micOn!: boolean;

  @Prop({
    default: false,
  })
  cameraOn!: boolean;

  @Prop({
    default: false,
  })
  handRaised!: boolean;

  @Prop({
    default: false,
  })
  screenSharing!: boolean;

  @Prop({
    default: false,
  })
  isSpeaking!: boolean;

  /* ==========================================================================
   * ADMISSION / WAITING ROOM
   * ======================================================================== */

  @Prop({
    default: false,
    index: true,
  })
  admitted!: boolean;

  @Prop({
    default: false,
    index: true,
  })
  waiting!: boolean;

  /* ==========================================================================
   * CONNECTION
   * ======================================================================== */

  @Prop({
    enum: [
      "good",
      "weak",
      "poor",
      "reconnecting",
    ],
    default: "good",
  })
  connectionQuality!: string;

  /* ==========================================================================
   * PARTICIPATION TIMES
   * ======================================================================== */

  @Prop()
  joinedAt?: Date;

  @Prop()
  leftAt?: Date;

  /* ==========================================================================
   * TIMESTAMPS
   *
   * timestamps: true automatically creates
   * createdAt and updatedAt.
   * ======================================================================== */

  createdAt!: Date;

  updatedAt!: Date;
}

/* ============================================================================
 * SCHEMA
 * ========================================================================== */

export const MeetingParticipantSchema =
  SchemaFactory.createForClass(
    MeetingParticipant,
  );

/* ============================================================================
 * INDEXES
 * ========================================================================== */

/**
 * A user can only have one participant record
 * per meeting.
 */
MeetingParticipantSchema.index(
  {
    meetingId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

/**
 * Quickly find all meetings for a user.
 */
MeetingParticipantSchema.index({
  userId: 1,
  invitationStatus: 1,
});

/**
 * Quickly find pending invitations.
 */
MeetingParticipantSchema.index({
  userId: 1,
  invited: 1,
  invitationStatus: 1,
});

/**
 * Quickly find participants in a meeting.
 */
MeetingParticipantSchema.index({
  meetingId: 1,
  role: 1,
});