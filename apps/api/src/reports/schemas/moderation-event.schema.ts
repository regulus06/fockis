import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema } from "mongoose";

/**
 * Append-only moderation history. Each entry stores the hash of the entry
 * before it, so any later edit or deletion breaks the chain and shows up
 * in GET /admin/moderation/history/verify. There are no update or delete
 * endpoints for this collection.
 */
@Schema({ collection: "moderation_events", timestamps: false, versionKey: false })
export class ModerationEvent {
  /** Position in the chain, starting at 1. */
  @Prop({ type: Number, required: true, unique: true })
  seq!: number;

  @Prop({ type: String, required: true, index: true })
  actorId!: string;

  @Prop({ type: String, required: true, index: true })
  action!: string;

  /** post | account | case */
  @Prop({ type: String, required: true, index: true })
  targetType!: string;

  @Prop({ type: String, required: true, index: true })
  targetId!: string;

  @Prop({ type: String, default: "" })
  reason!: string;

  @Prop({ type: String, default: null })
  previousState!: string | null;

  @Prop({ type: String, default: null })
  newState!: string | null;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Date, required: true, index: true })
  at!: Date;

  @Prop({ type: String, default: "" })
  prevHash!: string;

  @Prop({ type: String, required: true })
  hash!: string;
}

export type ModerationEventDocument = HydratedDocument<ModerationEvent>;
export const ModerationEventSchema = SchemaFactory.createForClass(ModerationEvent);
ModerationEventSchema.index({ at: -1 });

// Block in-place edits through Mongoose. (Direct database access is caught by the hash chain.)
for (const op of ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "deleteOne", "deleteMany", "findOneAndDelete"] as const) {
  ModerationEventSchema.pre(op, function () {
    throw new Error("Moderation history is append-only.");
  });
}
