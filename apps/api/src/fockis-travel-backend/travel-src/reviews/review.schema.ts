import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type ReviewDocument =
  HydratedDocument<Review>;

@Schema({
  timestamps: true,
})
export class Review {
  /* ==========================================================================
     USER
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  /* ==========================================================================
     LISTING
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: 'Listing',
    required: true,
    index: true,
  })
  listingId!: Types.ObjectId;

  /* ==========================================================================
     BOOKING

     One review per booking.
  ========================================================================== */

  @Prop({
    type: Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true,
    index: true,
  })
  bookingId!: Types.ObjectId;

  /* ==========================================================================
     RATING
  ========================================================================== */

  @Prop({
    required: true,
    min: 1,
    max: 5,
  })
  rating!: number;

  /* ==========================================================================
     REVIEW TEXT
  ========================================================================== */

  @Prop({
    required: true,
    trim: true,
  })
  text!: string;

  /* ==========================================================================
     IMAGES
  ========================================================================== */

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  /* ==========================================================================
     VERIFIED
  ========================================================================== */

  @Prop({
    default: false,
    index: true,
  })
  verified!: boolean;
}

export const ReviewSchema =
  SchemaFactory.createForClass(Review);

/* ============================================================================
   INDEXES
============================================================================ */

ReviewSchema.index({
  listingId: 1,
  createdAt: -1,
});

ReviewSchema.index({
  userId: 1,
  createdAt: -1,
});

/*
 * A booking can only receive one review.
 */
ReviewSchema.index(
  {
    bookingId: 1,
  },
  {
    unique: true,
  },
);