import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
} from "mongoose";

export type LiveViewDocument =
  HydratedDocument<LiveView>;

@Schema({
  timestamps: true,
  collection: "live_views",
})
export class LiveView {
  @Prop({
    required: true,
    index: true,
    trim: true,
  })
  streamId!: string;

  @Prop({
    required: true,
    index: true,
    trim: true,
  })
  userId!: string;

  @Prop({
    default: 0,
    min: 0,
  })
  watchSeconds!: number;

  @Prop({
    default: false,
  })
  isFollowing!: boolean;

  @Prop({
    required: false,
  })
  joinedAt?: Date;

  @Prop({
    required: false,
  })
  leftAt?: Date;
}

export const LiveViewSchema =
  SchemaFactory.createForClass(
    LiveView,
  );

LiveViewSchema.index(
  {
    streamId: 1,
    userId: 1,
  },
  {
    unique: true,
  },
);

LiveViewSchema.index({
  streamId: 1,
  joinedAt: -1,
});

LiveViewSchema.index({
  streamId: 1,
  leftAt: 1,
});

LiveViewSchema.index({
  userId: 1,
  createdAt: -1,
});