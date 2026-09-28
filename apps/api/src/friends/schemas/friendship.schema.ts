import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  Document,
  HydratedDocument,
  Types,
} from "mongoose";

/* ============================================================================
   FRIENDSHIP TYPES
============================================================================ */

export type FriendshipStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "blocked";

export type FriendshipDocument =
  HydratedDocument<Friendship>;

/* ============================================================================
   FRIENDSHIP SCHEMA
============================================================================ */

@Schema({
  timestamps: true,
})
export class Friendship {
  /*
   * Canonical unordered pair key.
   *
   * Example:
   *   A + B -> "A:B"
   *
   * The key is sorted, so:
   *   A -> B
   *   B -> A
   *
   * always resolve to the same pairKey.
   *
   * This gives the database a single unique relationship record per
   * user pair while requester/receiver remain directional.
   */
  @Prop({
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  })
  pairKey!: string;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  requester!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  receiver!: Types.ObjectId;

  @Prop({
    type: String,
    enum: [
      "pending",
      "accepted",
      "rejected",
      "blocked",
    ],
    default: "pending",
    index: true,
  })
  status!: FriendshipStatus;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: false,
  })
  blockedBy?: Types.ObjectId;
}

/* ============================================================================
   SCHEMA
============================================================================ */

export const FriendshipSchema =
  SchemaFactory.createForClass(Friendship);

/* ============================================================================
   INDEXES
============================================================================ */

FriendshipSchema.index({
  requester: 1,
  receiver: 1,
});

FriendshipSchema.index({
  receiver: 1,
  status: 1,
});

FriendshipSchema.index({
  requester: 1,
  status: 1,
});

FriendshipSchema.index({
  blockedBy: 1,
  status: 1,
});

/*
 * pairKey is intentionally unique.
 *
 * This is the database-level protection against:
 *
 *   A -> B pending
 *   B -> A pending
 *
 * or multiple repeated:
 *
 *   A -> B pending
 *
 * records.
 *
 * Existing duplicate records must be cleaned before MongoDB can build
 * this unique index successfully.
 */
FriendshipSchema.index(
  { pairKey: 1 },
  { unique: true, name: "friendship_pairKey_unique" },
);
