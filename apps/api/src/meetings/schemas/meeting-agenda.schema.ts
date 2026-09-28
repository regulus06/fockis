import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingAgendaDocument =
  HydratedDocument<MeetingAgenda>;

@Schema({
  timestamps: true,
  collection: "meeting_agenda",
})
export class MeetingAgenda {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  meetingId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  title!: string;

  @Prop({
    required: true,
  })
  order!: number;

  @Prop({
    default: false,
  })
  completed!: boolean;
}

export const MeetingAgendaSchema =
  SchemaFactory.createForClass(
    MeetingAgenda,
  );

MeetingAgendaSchema.index({
  meetingId: 1,
  order: 1,
});