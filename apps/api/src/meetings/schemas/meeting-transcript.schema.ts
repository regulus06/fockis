import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Types,
} from "mongoose";

export type MeetingTranscriptDocument =
  HydratedDocument<MeetingTranscript>;

@Schema({
  timestamps: true,
  collection: "meeting_transcripts",
})
export class MeetingTranscript {
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
  speakerId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  speakerName!: string;

  @Prop({
    required: true,
    maxlength: 20000,
  })
  text!: string;

  @Prop({
    required: true,
    index: true,
  })
  timestamp!: Date;

  @Prop({
    default: 0,
  })
  sequence!: number;
}

export const MeetingTranscriptSchema =
  SchemaFactory.createForClass(
    MeetingTranscript,
  );

MeetingTranscriptSchema.index({
  meetingId: 1,
  timestamp: 1,
});