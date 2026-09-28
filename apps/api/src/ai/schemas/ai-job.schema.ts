import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
  Schema as MongooseSchema,
  Types,
} from "mongoose";

export type AiJobDocument =
  HydratedDocument<AiJob>;

export type AiJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type AiJobType =
  | "video"
  | "music"
  | "image"
  | "design"
  | "voice"
  | "document"
  | "translation";

export type AiJobModel =
  | "auto"
  | "standard"
  | "quality";

@Schema({
  timestamps: true,
  collection: "ai_jobs",
})
export class AiJob {
  @Prop({
    type:
      MongooseSchema.Types.ObjectId,

    ref: "User",

    required: true,

    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: String,

    required: true,

    enum: [
      "video",
      "music",
      "image",
      "design",
      "voice",
      "document",
      "translation",
    ],

    index: true,
  })
  type!: AiJobType;

  @Prop({
    type: String,

    required: true,

    enum: [
      "queued",
      "processing",
      "completed",
      "failed",
      "cancelled",
    ],

    default:
      "queued",

    index: true,
  })
  status!: AiJobStatus;

  @Prop({
    type: String,

    required: true,

    trim: true,

    minlength: 3,

    maxlength: 10000,
  })
  prompt!: string;

  @Prop({
    type: String,

    required: true,

    enum: [
      "auto",
      "standard",
      "quality",
    ],

    default:
      "auto",

    trim: true,

    index: true,
  })
  model!: AiJobModel;

  @Prop({
    type:
      MongooseSchema.Types.Mixed,

    default: {},
  })
  options!: Record<
    string,
    unknown
  >;

  @Prop({
    type:
      MongooseSchema.Types.Mixed,

    default: {},
  })
  progress!: Record<
    string,
    unknown
  >;

  @Prop({
    type:
      MongooseSchema.Types.Mixed,

    default: {},
  })
  result!: Record<
    string,
    unknown
  >;

  @Prop({
    type: String,
  })
  resultUrl?: string;

  @Prop({
    type: String,
  })
  thumbnailUrl?: string;

  @Prop({
    type: String,
  })
  error?: string;

  @Prop({
    type: Number,

    default: 0,

    min: 0,
  })
  creditsReserved!: number;

  @Prop({
    type: Number,

    default: 0,

    min: 0,
  })
  creditsConsumed!: number;

  @Prop({
    type: Number,

    default: 0,

    min: 0,
  })
  attempts!: number;

  @Prop({
    type: String,
  })
  provider?: string;

  @Prop({
    type: String,
  })
  providerOperationId?: string;

  @Prop({
    type: Date,
  })
  startedAt?: Date;

  @Prop({
    type: Date,
  })
  completedAt?: Date;

  @Prop({
    type: Date,
  })
  cancelledAt?: Date;
}

export const AiJobSchema =
  SchemaFactory.createForClass(
    AiJob,
  );

AiJobSchema.index({
  userId: 1,
  createdAt: -1,
});

AiJobSchema.index({
  status: 1,
  createdAt: 1,
});

AiJobSchema.index(
  {
    providerOperationId: 1,
  },
  {
    sparse: true,
  },
);