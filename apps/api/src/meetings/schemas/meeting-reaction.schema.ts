import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingReactionDocument =
  HydratedDocument<MeetingReaction>;

@Schema({
  timestamps: true,
  collection: "meeting_reactions",
})
export class MeetingReaction {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  meetingId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  emoji!: string;
}

export const MeetingReactionSchema =
  SchemaFactory.createForClass(
    MeetingReaction,
  );