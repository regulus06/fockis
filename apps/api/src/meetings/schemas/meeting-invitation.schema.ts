import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingInvitationDocument =
  HydratedDocument<MeetingInvitation>;

@Schema({
  timestamps: true,
  collection: "meeting_invitations",
})
export class MeetingInvitation {
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
  inviterId!: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    index: true,
  })
  inviteeId?: Types.ObjectId;

  @Prop({
    lowercase: true,
    trim: true,
  })
  email?: string;

  @Prop({
    enum: [
      "pending",
      "accepted",
      "declined",
      "expired",
    ],
    default: "pending",
  })
  status!: string;

  @Prop()
  expiresAt?: Date;

  @Prop()
  respondedAt?: Date;
}

export const MeetingInvitationSchema =
  SchemaFactory.createForClass(
    MeetingInvitation,
  );

MeetingInvitationSchema.index({
  meetingId: 1,
  email: 1,
});