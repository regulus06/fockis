import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
} from "mongoose";

export type LiveStreamDocument =
  HydratedDocument<LiveStream>;

export type LiveStatus =
  | "scheduled"
  | "live"
  | "ended"
  | "cancelled";

@Schema({
  _id: false,
})
export class LiveProduct {
  @Prop({
    required: true,
    trim: true,
    index: true,
    maxlength: 100,
  })
  productId!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 250,
  })
  name!: string;

  @Prop({
    default: "",
    trim: true,
    maxlength: 2000,
  })
  imageUrl!: string;

  @Prop({
    required: true,
    min: 0,
    max: 999999999,
  })
  price!: number;

  @Prop({
    min: 0,
    max: 999999999,
  })
  salePrice?: number;
}

export type LiveRecordingStatus =
  | "none"
  | "starting"
  | "recording"
  | "processing"
  | "ready"
  | "failed"
  | "deleted";

/**
 * Persistent recording metadata for a LIVE.
 *
 * The recording itself is produced by LiveKit Egress (room composite)
 * and written straight to the project's Google Cloud Storage bucket.
 * Only the private object key is stored here — never a public URL —
 * and playback/download URLs are signed on demand for the owner.
 */
@Schema({
  _id: false,
})
export class LiveRecording {
  @Prop({
    type: String,
    enum: [
      "none",
      "starting",
      "recording",
      "processing",
      "ready",
      "failed",
      "deleted",
    ],
    default: "none",
  })
  status!: LiveRecordingStatus;

  @Prop({ default: "" })
  provider!: string;

  @Prop({ default: "" })
  egressId!: string;

  /** Private GCS object key, e.g. live-recordings/<streamId>/<file>.mp4 */
  @Prop({ default: "" })
  objectKey!: string;

  @Prop({ default: "video/mp4" })
  contentType!: string;

  @Prop({ default: 0, min: 0 })
  sizeBytes!: number;

  @Prop({ default: 0, min: 0 })
  durationSeconds!: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop()
  readyAt?: Date;

  @Prop()
  processingSince?: Date;

  @Prop({ default: "", maxlength: 1000 })
  error!: string;

  @Prop({ default: 0, min: 0 })
  startAttempts!: number;

  /* ------------------------------------------------------------------
   * Feed publishing (idempotency)
   * ------------------------------------------------------------------ */

  @Prop({ default: "" })
  publishedPostId!: string;

  @Prop()
  publishedAt?: Date;

  @Prop({ default: false })
  publishing!: boolean;

  @Prop()
  publishLockAt?: Date;

  @Prop()
  deletedAt?: Date;
}

export const LiveRecordingSchema =
  SchemaFactory.createForClass(
    LiveRecording,
  );

@Schema({
  timestamps: true,
  collection: "live_streams",
})
export class LiveStream {
  @Prop({
    required: true,
    index: true,
  })
  hostId!: string;

  @Prop({
    required: true,
    unique: true,
    index: true,
    trim: true,
    maxlength: 200,
  })
  roomName!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 150,
  })
  title!: string;

  @Prop({
    default: "",
    trim: true,
    maxlength: 1000,
  })
  description!: string;

  @Prop({
    default: "",
    trim: true,
    maxlength: 2000,
  })
  thumbnailUrl!: string;

  @Prop({
    default: "General",
    trim: true,
    maxlength: 100,
    index: true,
  })
  category!: string;

  @Prop({
    type: String,
    enum: [
      "scheduled",
      "live",
      "ended",
      "cancelled",
    ],
    default: "live",
    index: true,
  })
  status!: LiveStatus;

  @Prop({
    type: [LiveProduct],
    default: [],
  })
  products!: LiveProduct[];

  @Prop({
    default: 0,
    min: 0,
  })
  viewerCount!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  peakViewerCount!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  likeCount!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  commentCount!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  shareCount!: number;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop({
    type: LiveRecordingSchema,
    default: () => ({}),
  })
  recording?: LiveRecording;
}

export const LiveStreamSchema =
  SchemaFactory.createForClass(
    LiveStream,
  );

LiveStreamSchema.index({
  status: 1,
  createdAt: -1,
});

LiveStreamSchema.index({
  status: 1,
  viewerCount: -1,
  createdAt: -1,
});

LiveStreamSchema.index({
  category: 1,
  status: 1,
  viewerCount: -1,
});

LiveStreamSchema.index({
  hostId: 1,
  createdAt: -1,
});

LiveStreamSchema.index({
  hostId: 1,
  status: 1,
});

LiveStreamSchema.index({
  status: 1,
  startedAt: -1,
});

LiveStreamSchema.index({
  "recording.egressId": 1,
});