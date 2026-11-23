import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

// ============================================================================
// SECURITY INCIDENTS, RESTRICTIONS, LOGIN VERIFICATION AND RECOVERY CASES
//
// Nothing here stores passwords, codes or tokens in readable form:
// verification codes are kept only as keyed hashes, and unknown sign-in
// addresses only as hashes.
// ============================================================================

export const INCIDENT_STATUSES = [
  "detected",
  "monitoring",
  "high_risk",
  "verification_pending",
  "restricted",
  "verified",
  "under_review",
  "resolved",
  "expired",
] as const;

export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const CLOSED_INCIDENT_STATUSES: IncidentStatus[] = ["resolved", "expired"];

export const INCIDENT_KINDS = [
  "account_failed_logins",
  "unknown_account_failed_logins",
  "source_abuse",
  "suspicious_sign_in",
] as const;

export type IncidentKind = (typeof INCIDENT_KINDS)[number];

export type RiskLevel = "none" | "warning" | "high" | "critical";

export const RISK_RANK: Record<RiskLevel, number> = {
  none: 0,
  warning: 1,
  high: 2,
  critical: 3,
};

// ----------------------------------------------------------------------------
// Rolling failure counters (one per account / unknown address / source)
// ----------------------------------------------------------------------------

export interface CounterEvent {
  /** When it happened. */
  t: Date;
  /** Source network prefix (account counters) or null. */
  s: string | null;
  /** Targeted account key (source counters) or null. */
  g: string | null;
  /** Refused during a lockout. */
  b: boolean;
}

/**
 * Sliding-window failure counter. Updated with one atomic pipeline update
 * (old events dropped, new event appended), so parallel requests and
 * several API instances share one exact count.
 */
@Schema({ collection: "security_login_counters", timestamps: false })
export class LoginFailureCounter {
  @Prop({ required: true, unique: true, maxlength: 200 })
  key!: string;

  @Prop({ type: [Object], default: [] })
  events!: CounterEvent[];

  @Prop({ default: 0 })
  totalFailures!: number;

  @Prop({ type: Date, required: true })
  lastFailureAt!: Date;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export type LoginFailureCounterDocument = HydratedDocument<LoginFailureCounter>;
export const LoginFailureCounterSchema = SchemaFactory.createForClass(LoginFailureCounter);
LoginFailureCounterSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ----------------------------------------------------------------------------
// Incident
// ----------------------------------------------------------------------------

@Schema({ _id: false })
export class IncidentTimelineEntry {
  @Prop({ type: Date, required: true }) at!: Date;
  @Prop({ required: true, maxlength: 60 }) action!: string;
  @Prop({ type: String, default: null }) actorId!: string | null;
  @Prop({ type: String, default: null, maxlength: 120 }) actorName!: string | null;
  @Prop({ type: String, default: "", maxlength: 500 }) note!: string;
}

const IncidentTimelineEntrySchema = SchemaFactory.createForClass(IncidentTimelineEntry);

@Schema({ collection: "security_incidents", timestamps: true })
export class SecurityIncident {
  @Prop({ required: true, maxlength: 20 })
  number!: string;

  @Prop({ required: true, maxlength: 200 })
  groupKey!: string;

  /** True while the incident is not resolved/expired (one open per group). */
  @Prop({ default: true })
  open!: boolean;

  @Prop({ type: String, required: true, enum: INCIDENT_KINDS })
  kind!: IncidentKind;

  @Prop({ type: String, required: true, enum: INCIDENT_STATUSES, default: "detected" })
  status!: IncidentStatus;

  @Prop({ type: String, default: "warning" })
  level!: RiskLevel;

  @Prop({ default: 1 })
  levelRank!: number;

  @Prop({ default: 0 })
  riskScore!: number;

  @Prop({ type: [String], default: [] })
  reasonCodes!: string[];

  @Prop({ type: Types.ObjectId, default: null, index: true })
  subjectUserId!: Types.ObjectId | null;

  /** Username for accounts; hashed label for unknown addresses. */
  @Prop({ default: "", maxlength: 120 })
  subjectLabel!: string;

  @Prop({ default: false })
  privileged!: boolean;

  /** Source IP (source-abuse incidents) — never blocked automatically. */
  @Prop({ type: String, default: null })
  sourceIp!: string | null;

  @Prop({ default: 0 }) windowFailures!: number;
  @Prop({ default: 0 }) totalFailures!: number;
  @Prop({ default: 0 }) blockedAttempts!: number;
  @Prop({ default: 0 }) distinctSources!: number;
  @Prop({ default: 0 }) distinctTargets!: number;

  @Prop({ type: Date, required: true }) firstSeenAt!: Date;
  @Prop({ type: Date, required: true }) lastActivityAt!: Date;

  @Prop({ type: Types.ObjectId, default: null }) restrictionId!: Types.ObjectId | null;
  @Prop({ type: Date, default: null }) verifiedAt!: Date | null;
  @Prop({ type: Date, default: null }) sessionsRevokedAt!: Date | null;
  @Prop({ type: Date, default: null }) successAfterFailuresAt!: Date | null;

  @Prop({ type: String, default: null }) acknowledgedBy!: string | null;
  @Prop({ type: Date, default: null }) acknowledgedAt!: Date | null;
  @Prop({ type: String, default: null }) resolvedBy!: string | null;
  @Prop({ type: Date, default: null }) resolvedAt!: Date | null;
  @Prop({ type: String, default: "", maxlength: 1000 }) resolutionNote!: string;

  @Prop({ type: [IncidentTimelineEntrySchema], default: [] })
  timeline!: IncidentTimelineEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type SecurityIncidentDocument = HydratedDocument<SecurityIncident>;
export const SecurityIncidentSchema = SchemaFactory.createForClass(SecurityIncident);

SecurityIncidentSchema.index(
  { groupKey: 1 },
  { unique: true, partialFilterExpression: { open: true } },
);
SecurityIncidentSchema.index({ open: 1, lastActivityAt: -1 });
SecurityIncidentSchema.index({ status: 1, lastActivityAt: -1 });
SecurityIncidentSchema.index({ number: 1 }, { unique: true });

// ----------------------------------------------------------------------------
// Restriction (step-up verification at sign-in)
// ----------------------------------------------------------------------------

export const RESTRICTION_STATUSES = ["verification_pending", "verified", "lifted", "expired"] as const;
export type RestrictionStatus = (typeof RESTRICTION_STATUSES)[number];

@Schema({ collection: "security_auth_restrictions", timestamps: true })
export class AuthRestriction {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  incidentId!: Types.ObjectId | null;

  /** step_up: verify at next sign-in. critical: sessions were also revoked. */
  @Prop({ type: String, required: true, enum: ["step_up", "critical"] })
  level!: "step_up" | "critical";

  @Prop({ type: String, required: true, enum: RESTRICTION_STATUSES, default: "verification_pending" })
  status!: RestrictionStatus;

  /** True while verification is pending (one active per account). */
  @Prop({ default: true })
  active!: boolean;

  @Prop({ type: [String], default: [] })
  reasonCodes!: string[];

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: String, default: null }) verifiedMethod!: string | null;
  @Prop({ type: Date, default: null }) verifiedAt!: Date | null;
  @Prop({ type: String, default: null }) liftedBy!: string | null;
  @Prop({ type: Date, default: null }) liftedAt!: Date | null;
  @Prop({ type: String, default: "", maxlength: 1000 }) reviewNote!: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export type AuthRestrictionDocument = HydratedDocument<AuthRestriction>;
export const AuthRestrictionSchema = SchemaFactory.createForClass(AuthRestriction);

AuthRestrictionSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
AuthRestrictionSchema.index({ active: 1, expiresAt: 1 });

// ----------------------------------------------------------------------------
// Email verification challenge (code stored as keyed hash, single use)
// ----------------------------------------------------------------------------

@Schema({ collection: "security_login_challenges", timestamps: true })
export class LoginVerificationChallenge {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  restrictionId!: Types.ObjectId;

  @Prop({ required: true })
  codeHash!: string;

  @Prop({ default: 0 })
  attempts!: number;

  @Prop({ type: Date, default: null })
  usedAt!: Date | null;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  createdAt?: Date;
}

export type LoginVerificationChallengeDocument = HydratedDocument<LoginVerificationChallenge>;
export const LoginVerificationChallengeSchema = SchemaFactory.createForClass(
  LoginVerificationChallenge,
);
// Removed shortly after expiry.
LoginVerificationChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

// ----------------------------------------------------------------------------
// Account recovery case
// ----------------------------------------------------------------------------

export const RECOVERY_STATUSES = ["open", "in_review", "approved", "rejected", "closed"] as const;
export type RecoveryStatus = (typeof RECOVERY_STATUSES)[number];

@Schema({ collection: "security_recovery_cases", timestamps: true })
export class RecoveryCase {
  @Prop({ required: true, maxlength: 20 })
  number!: string;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: ["public_form", "login_verification"] })
  source!: "public_form" | "login_verification";

  @Prop({ type: String, required: true, enum: RECOVERY_STATUSES, default: "open" })
  status!: RecoveryStatus;

  /** What the requester wrote (no passwords: the form tells them not to). */
  @Prop({ default: "", maxlength: 1000 })
  message!: string;

  @Prop({ type: Types.ObjectId, default: null }) restrictionId!: Types.ObjectId | null;
  @Prop({ type: Types.ObjectId, default: null }) incidentId!: Types.ObjectId | null;

  /** Coarse request details for reviewers. */
  @Prop({ type: String, default: null }) requestIp!: string | null;
  @Prop({ type: String, default: null, maxlength: 120 }) requestDevice!: string | null;

  @Prop({ type: String, default: null }) assignedTo!: string | null;
  @Prop({ type: String, default: null }) decidedBy!: string | null;
  @Prop({ type: Date, default: null }) decidedAt!: Date | null;

  @Prop({ type: [IncidentTimelineEntrySchema], default: [] })
  timeline!: IncidentTimelineEntry[];

  createdAt?: Date;
  updatedAt?: Date;
}

export type RecoveryCaseDocument = HydratedDocument<RecoveryCase>;
export const RecoveryCaseSchema = SchemaFactory.createForClass(RecoveryCase);
RecoveryCaseSchema.index({ status: 1, createdAt: -1 });
RecoveryCaseSchema.index({ number: 1 }, { unique: true });
