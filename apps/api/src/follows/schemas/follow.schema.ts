import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type FollowDocument = HydratedDocument<Follow>;

@Schema({
  timestamps: true,
  collection: "follows",
})
export class Follow {
  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  followerId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  })
  followingId!: Types.ObjectId;
}

export const FollowSchema =
  SchemaFactory.createForClass(Follow);

/*
 * Directional unique index.
 *
 * A -> B is unique.
 * B -> A is a DIFFERENT valid follow.
 *
 * Do NOT replace this with a sorted/pair index.
 */
FollowSchema.index(
  {
    followerId: 1,
    followingId: 1,
  },
  {
    unique: true,
    name: "follow_direction_unique",
  },
);

FollowSchema.index({
  followingId: 1,
  createdAt: -1,
});

FollowSchema.index({
  followerId: 1,
  createdAt: -1,
});
