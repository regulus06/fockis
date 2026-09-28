import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import {
  HydratedDocument,
} from "mongoose";

export type LiveGuestDocument =
  HydratedDocument<LiveGuest>;

export type LiveGuestStatus =
  | "invited"
  | "accepted"
  | "declined"
  | "connected"
  | "removed"
  | "left";

@Schema({
  timestamps: true,
  collection: "live_guests",
})
export class LiveGuest {
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
  hostId!: string;

  @Prop({
    required: true,
    index: true,
    trim: true,
  })
  guestUserId!: string;

  @Prop({
    type: String,
    enum: [
      "invited",
      "accepted",
      "declined",
      "connected",
      "removed",
      "left",
    ],
    default: "invited",
    index: true,
  })
  status!: LiveGuestStatus;

  @Prop({
    default: "",
    trim: true,
    maxlength: 500,
  })
  message!: string;

  @Prop({
    default: null,
  })
  invitedAt?: Date;

  @Prop({
    default: null,
  })
  respondedAt?: Date;

  @Prop({
    default: null,
  })
  connectedAt?: Date;

  @Prop({
    default: null,
  })
  disconnectedAt?: Date;

  @Prop({
    default: null,
  })
  removedAt?: Date;
}

export const LiveGuestSchema =
  SchemaFactory.createForClass(
    LiveGuest,
  );

LiveGuestSchema.index({
  streamId: 1,
  guestUserId: 1,
});

LiveGuestSchema.index({
  guestUserId: 1,
  status: 1,
  createdAt: -1,
});

LiveGuestSchema.index({
  hostId: 1,
  streamId: 1,
  status: 1,
});