import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
} from "mongoose";

export type LiveCommentDocument =
  HydratedDocument<LiveComment>;

@Schema({
  timestamps: true,
  collection: "live_comments",
})
export class LiveComment {
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
    required: true,
    trim: true,
    maxlength: 500,
  })
  message!: string;

  @Prop({
    default: "",
    trim: true,
    maxlength: 150,
  })
  userName!: string;

  @Prop({
    default: "",
    trim: true,
    maxlength: 2000,
  })
  userAvatar!: string;

  createdAt!: Date;

  updatedAt!: Date;
}

export const LiveCommentSchema =
  SchemaFactory.createForClass(
    LiveComment,
  );

LiveCommentSchema.index({
  streamId: 1,
  createdAt: -1,
});

LiveCommentSchema.index({
  userId: 1,
  createdAt: -1,
});