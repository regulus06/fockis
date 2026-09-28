import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingActionItemDocument =
  HydratedDocument<MeetingActionItem>;

@Schema({
  timestamps: true,
  collection: "meeting_action_items",
})
export class MeetingActionItem {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  meetingId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
  })
  assigneeId?: Types.ObjectId;

  @Prop()
  assigneeName?: string;

  @Prop({
    required: true,
    maxlength: 5000,
  })
  task!: string;

  @Prop()
  dueDate?: Date;

  @Prop({
    default: false,
  })
  completed!: boolean;

  @Prop({
    type: Types.ObjectId,
  })
  createdBy?: Types.ObjectId;
}

export const MeetingActionItemSchema =
  SchemaFactory.createForClass(
    MeetingActionItem,
  );

MeetingActionItemSchema.index({
  meetingId: 1,
  completed: 1,
});