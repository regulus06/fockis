import {
  Prop,
  Schema,
  SchemaFactory,
} from "@nestjs/mongoose";

import { Document } from "mongoose";

export type RepostDocument =
  Repost & Document;

@Schema({
  timestamps: true,
})
export class Repost {
  // ==========================================================================
  // WHO REPOSTED
  // ==========================================================================

  @Prop({
    required: true,
  })
  userId!: string;

  @Prop({
    default: "",
  })
  username!: string;

  // ==========================================================================
  // ORIGINAL CONTENT
  // ==========================================================================

  @Prop({
    required: true,
  })
  targetId!: string;

  @Prop({
    required: true,
    enum: [
      "post",
      "wave",
      "reel",
    ],
  })
  targetType!: string;

  // ==========================================================================
  // REPOST DESTINATION
  // ==========================================================================

  @Prop({
    enum: [
      "profile",
      "group",
      "feed",
    ],
    default: "profile",
  })
  destination!: string;

  // ==========================================================================
  // OPTIONAL GROUP
  //
  // Explicitly declare String because the previous
  // `string | null` type cannot be inferred by
  // @nestjs/mongoose.
  // ==========================================================================

  @Prop({
    type: String,
    default: null,
    required: false,
  })
  groupId!: string | null;

  // ==========================================================================
  // QUOTE
  // ==========================================================================

  @Prop({
    default: "",
  })
  quote!: string;
}

export const RepostSchema =
  SchemaFactory.createForClass(
    Repost,
  );