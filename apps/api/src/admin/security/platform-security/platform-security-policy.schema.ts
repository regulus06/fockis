import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Schema as MongooseSchema, Types } from "mongoose";

// ============================================================================
// PLATFORM SECURITY POLICY
//
// One document (key = "platform") holds the platform-wide policy:
//   accounts         applies to every Fockis account
//   managed          the baseline (floor + default) for organization-managed
//                    identities; organizations may only make delegated fields
//                    stricter
//   delegatedFields  which managed fields organization administrators may
//                    override
//
// `version` increases on every change and is used for cache invalidation
// across API instances and for the change history.
// ============================================================================

export type PlatformSecurityPolicyDocument =
  HydratedDocument<PlatformSecurityPolicy>;

@Schema({
  collection: "platform_security_policies",
  timestamps: true,
  minimize: false,
})
export class PlatformSecurityPolicy {
  @Prop({ required: true, unique: true, default: "platform" })
  key!: string;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  accounts!: Record<string, boolean | number>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  managed!: Record<string, boolean | number>;

  @Prop({ type: [String], default: [] })
  delegatedFields!: string[];

  @Prop({ type: Number, default: 1, min: 1 })
  version!: number;

  @Prop({ type: Types.ObjectId, ref: "User", default: null })
  updatedBy!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  updatedByName!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlatformSecurityPolicySchema = SchemaFactory.createForClass(
  PlatformSecurityPolicy,
);

// ============================================================================
// POLICY REVISION (change history)
//
// Append-only. The schema refuses updates and deletes through Mongoose.
// ============================================================================

export type SecurityPolicyRevisionDocument =
  HydratedDocument<SecurityPolicyRevision>;

@Schema({
  collection: "security_policy_revisions",
  timestamps: { createdAt: true, updatedAt: false },
  minimize: false,
})
export class SecurityPolicyRevision {
  /** "platform" or "organization". */
  @Prop({ required: true, index: true })
  scope!: string;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  organizationId!: Types.ObjectId | null;

  @Prop({ type: Number, required: true })
  version!: number;

  /** [{ profile, field, from, to }] */
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  changes!: Array<{
    profile: string;
    field: string;
    from: unknown;
    to: unknown;
  }>;

  @Prop({ type: Types.ObjectId, default: null })
  actorId!: Types.ObjectId | null;

  @Prop({ type: String, default: "" })
  actorName!: string;

  @Prop({ type: String, default: "", maxlength: 500 })
  reason!: string;

  @Prop({ type: Boolean, default: false })
  highRisk!: boolean;

  createdAt?: Date;
}

export const SecurityPolicyRevisionSchema = SchemaFactory.createForClass(
  SecurityPolicyRevision,
);

SecurityPolicyRevisionSchema.index({ scope: 1, createdAt: -1 });

const IMMUTABLE_OPS = [
  "updateOne",
  "updateMany",
  "findOneAndUpdate",
  "findOneAndReplace",
  "replaceOne",
  "deleteOne",
  "deleteMany",
  "findOneAndDelete",
] as const;

for (const op of IMMUTABLE_OPS) {
  SecurityPolicyRevisionSchema.pre(op as any, function () {
    throw new Error("Security policy revisions are append-only.");
  });
}

// ============================================================================
// LOGIN THROTTLE (unknown email addresses)
//
// Failed sign-ins for email addresses with no account are tracked here, keyed
// by a SHA-256 of the normalized address, so unknown and existing accounts
// behave the same way and lockouts do not reveal which accounts exist.
// Documents expire automatically.
// ============================================================================

export type LoginThrottleDocument = HydratedDocument<LoginThrottle>;

@Schema({ collection: "security_login_throttles", versionKey: false })
export class LoginThrottle {
  @Prop({ required: true, unique: true })
  keyHash!: string;

  @Prop({ type: Number, default: 0 })
  failures!: number;

  @Prop({ type: Date, default: null })
  lastFailedAt!: Date | null;

  @Prop({ type: Date, default: null })
  lockedUntil!: Date | null;

  @Prop({ type: Number, default: 0 })
  lockoutCount!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const LoginThrottleSchema = SchemaFactory.createForClass(LoginThrottle);

LoginThrottleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
