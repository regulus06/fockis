import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type TripDocument =
  HydratedDocument<Trip>;

@Schema({
  timestamps: true,
})
export class Trip {
  /* ==========================================================================
     OWNER
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* ==========================================================================
     BASIC INFORMATION
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    trim: true,
  })
  title?: string;

  @Prop({
    trim: true,
  })
  destination?: string;

  @Prop({
    trim: true,
  })
  description?: string;

  /* ==========================================================================
     DATES
  ========================================================================== */

  @Prop()
  startDate?: Date;

  @Prop()
  endDate?: Date;

  /* ==========================================================================
     STATUS

     Keep both planning/booked and upcoming/completed/cancelled compatible
     with the frontend.
  ========================================================================== */

  @Prop({
    enum: [
      'planning',
      'booked',
      'upcoming',
      'completed',
      'cancelled',
      'canceled',
    ],
    default: 'planning',
    index: true,
  })
  status!: string;

  /* ==========================================================================
     BOOKINGS
  ========================================================================== */

  @Prop({
    type: [Types.ObjectId],
    ref: 'Booking',
    default: [],
  })
  bookingIds!: Types.ObjectId[];

  /* ==========================================================================
     ITINERARY ITEMS

     Kept flexible because different Travel listing types can contribute
     different information.
  ========================================================================== */

  @Prop({
    type: [Object],
    default: [],
  })
  items!: Record<string, any>[];

  /* ==========================================================================
     EXTRA METADATA

     Preserves future frontend/backend travel information without forcing
     every trip type into a rigid schema.
  ========================================================================== */

  @Prop({
    type: Object,
    default: {},
  })
  metadata!: Record<string, any>;
}

export const TripSchema =
  SchemaFactory.createForClass(Trip);

/* ============================================================================
   INDEXES
============================================================================ */

TripSchema.index({
  userId: 1,
  startDate: 1,
});

TripSchema.index({
  userId: 1,
  status: 1,
});