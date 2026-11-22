import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

/**
 * One sign-in attempt on a Fockis account. Shown only to the account owner
 * (GET /users/me/login-history). Entries expire after 180 days.
 */
@Schema({ collection: "user_login_events", timestamps: false, versionKey: false })
export class LoginEvent {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Date, required: true, default: () => new Date() })
  at!: Date;

  @Prop({ type: Boolean, required: true })
  success!: boolean;

  /** wrong_password | locked — only for failed attempts. */
  @Prop({ type: String, default: null })
  reason!: string | null;

  @Prop({ type: String, default: null })
  ip!: string | null;

  @Prop({ type: String, default: null, maxlength: 512 })
  userAgent!: string | null;
}

export type LoginEventDocument = HydratedDocument<LoginEvent>;
export const LoginEventSchema = SchemaFactory.createForClass(LoginEvent);
LoginEventSchema.index({ userId: 1, at: -1 });
LoginEventSchema.index({ at: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
