import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingAttendanceDocument =
  HydratedDocument<MeetingAttendance>;

@Schema({
  timestamps: true,
  collection: "meeting_attendance",
})
export class MeetingAttendance {
  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  meetingId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  userName!: string;

  @Prop({
    enum: [
      "present",
      "late",
      "absent",
      "left_early",
      "host",
      "co_host",
    ],
    default: "present",
  })
  status!: string;

  @Prop()
  joinedAt?: Date;

  @Prop()
  leftAt?: Date;

  @Prop({
    default: 0,
  })
  minutesPresent!: number;

  @Prop()
  lateNotice?: string;
}

export const MeetingAttendanceSchema =
  SchemaFactory.createForClass(
    MeetingAttendance,
  );

MeetingAttendanceSchema.index({
  meetingId: 1,
  userId: 1,
});