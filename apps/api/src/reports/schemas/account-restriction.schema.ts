import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

import { RestrictionType } from "../reports.constants";

export type AccountRestrictionDocument = HydratedDocument<AccountRestriction>;

/**
 * A moderation restriction on an account, tied to the case that caused it.
 *
 * - posting:    the user cannot create posts until `until` (enforced in
 *               PostsController.create via AccountRestrictionsService).
 * - suspension: mirrored onto the existing account-status fields
 *               (lockedUntil for temporary, isActive=false for permanent),
 *               which the JWT strategy already enforces at sign-in.
 *
 * Lifting a restriction keeps the record (active=false, liftedAt/By) for
 * the audit trail.
 */
@Schema({ collection: "account_restrictions", timestamps: true, versionKey: false })
export class AccountRestriction {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: Object.values(RestrictionType), required: true })
  type!: RestrictionType;

  /** Null = until lifted. */
  @Prop({ type: Date, default: null })
  until?: Date | null;

  @Prop({ type: Boolean, default: true })
  active!: boolean;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "ModerationCase", default: null })
  caseId?: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  reason!: string;

  @Prop({ type: String, default: "" })
  createdBy!: string;

  @Prop({ type: Date, default: null })
  liftedAt?: Date | null;

  @Prop({ type: String, default: null })
  liftedBy?: string | null;
}

export const AccountRestrictionSchema = SchemaFactory.createForClass(AccountRestriction);

AccountRestrictionSchema.index({ userId: 1, type: 1, active: 1, until: 1 });
AccountRestrictionSchema.index({ caseId: 1 });
