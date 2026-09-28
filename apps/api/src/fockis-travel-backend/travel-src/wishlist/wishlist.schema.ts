import {
  Prop,
  Schema,
  SchemaFactory,
} from '@nestjs/mongoose';

import {
  HydratedDocument,
  Types,
} from 'mongoose';

export type WishlistDocument =
  HydratedDocument<Wishlist>;

@Schema({
  timestamps: true,
})
export class Wishlist {
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
     NOTE
  ========================================================================== */

  @Prop({
    type: String,
    default: '',
    trim: true,
  })
  note!: string;
}

/* ============================================================================
   SCHEMA
============================================================================ */

export const WishlistSchema =
  SchemaFactory.createForClass(Wishlist);

/* ============================================================================
   INDEXES
============================================================================ */

/**
 * Prevent the same user from saving
 * the same listing more than once.
 */
WishlistSchema.index(
  {
    userId: 1,
    listingId: 1,
  },
  {
    unique: true,
  },
);

/**
 * Fast wishlist loading for a user.
 */
WishlistSchema.index({
  userId: 1,
  createdAt: -1,
});