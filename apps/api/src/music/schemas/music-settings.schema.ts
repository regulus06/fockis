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

export type MusicSettingsDocument =
  HydratedDocument<MusicSettings>;

@Schema({
  timestamps: true,
  collection: "music_settings",
})
export class MusicSettings {
  @Prop({
    required: true,
    unique: true,
    default: "global",
    index: true,
  })
  key!: string;

  @Prop({
    required: true,
    default: false,
  })
  creatorAutoApproval!: boolean;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    default: null,
  })
  updatedBy!: Types.ObjectId | null;

  /**
   * Automatically managed by Mongoose timestamps.
   */
  createdAt!: Date;

  /**
   * Automatically managed by Mongoose timestamps.
   */
  updatedAt!: Date;
}

export const MusicSettingsSchema =
  SchemaFactory.createForClass(
    MusicSettings,
  );