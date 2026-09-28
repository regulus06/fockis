import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingMessageDocument =
  HydratedDocument<MeetingMessage>;

@Schema({
  timestamps: true,
  collection: "meeting_messages",
})
export class MeetingMessage {
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
  authorId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  authorName!: string;

  @Prop({
    required: true,
    maxlength: 5000,
  })
  body!: string;

  @Prop({
    type: [String],
    default: [],
  })
  mentions!: string[];

  @Prop()
  attachmentName?: string;
}

export const MeetingMessageSchema =
  SchemaFactory.createForClass(
    MeetingMessage,
  );

MeetingMessageSchema.index({
  meetingId: 1,
  createdAt: 1,
});