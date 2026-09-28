/**
 * church-event.schema.ts
 * ---------------------------------------------------------------------------
 * Mongoose schemas for Church Events and Event RSVPs.
 *
 * Mirrors:
 * web/src/features/church/types/church.types.ts
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

import { EventType } from "../../enums/event-type.enum";

/* ============================================================================
   RSVP STATUS
   ========================================================================== */

export enum RsvpStatus {
  Going = "going",
  Maybe = "maybe",
  NotGoing = "not_going",
}

/* ============================================================================
   EVENT RSVP
   ========================================================================== */

export type EventRsvpDocument = EventRsvp & Document;

@Schema({
  _id: false,
  timestamps: false,
})
export class EventRsvp {
  @Prop({
    type: Types.ObjectId,
    ref: "Membership",
    required: true,
  })
  memberId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: RsvpStatus,
    required: true,
  })
  status!: RsvpStatus;

  @Prop({
    type: Date,
    default: Date.now,
  })
  respondedAt!: Date;
}

/* ============================================================================
   CHURCH EVENT
   ========================================================================== */

export type ChurchEventDocument = ChurchEvent & Document;

@Schema({
  timestamps: true,
  collection: "church_events",
})
export class ChurchEvent {
  @Prop({
    type: Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  })
  organizationId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "Branch",
    default: null,
  })
  branchId?: Types.ObjectId | null;

  @Prop({
    required: true,
    trim: true,
  })
  title!: string;

  @Prop({
    type: String,
    enum: EventType,
    required: true,
    index: true,
  })
  eventType!: EventType;

  @Prop({
    type: Date,
    required: true,
    index: true,
  })
  startsAt!: Date;

  @Prop({
    type: Date,
    default: null,
  })
  endsAt?: Date | null;

  @Prop({
    type: Types.ObjectId,
    ref: "Department",
    default: null,
  })
  departmentId?: Types.ObjectId | null;

  @Prop({
    type: Types.ObjectId,
    ref: "ChurchGroup",
    default: null,
  })
  groupId?: Types.ObjectId | null;

  @Prop({
    type: String,
    default: null,
  })
  description?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  location?: string | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  isOnline?: boolean;

  @Prop({
    type: String,
    default: null,
  })
  onlineUrl?: string | null;

  @Prop({
    type: String,
    default: null,
  })
  coverImageUrl?: string | null;

  @Prop({
    type: Number,
    default: null,
  })
  capacity?: number | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  requiresRsvp!: boolean;

  @Prop({
    type: [EventRsvp],
    default: [],
  })
  rsvps!: EventRsvp[];

  createdAt?: Date;

  updatedAt?: Date;
}

/* ============================================================================
   SCHEMA
   ========================================================================== */

export const ChurchEventSchema =
  SchemaFactory.createForClass(ChurchEvent);

/* ============================================================================
   INDEXES
   ========================================================================== */

ChurchEventSchema.index({
  organizationId: 1,
  startsAt: 1,
});

ChurchEventSchema.index({
  organizationId: 1,
  eventType: 1,
});

ChurchEventSchema.index({
  organizationId: 1,
  departmentId: 1,
});

ChurchEventSchema.index({
  organizationId: 1,
  groupId: 1,
});

ChurchEventSchema.index({
  organizationId: 1,
  branchId: 1,
});