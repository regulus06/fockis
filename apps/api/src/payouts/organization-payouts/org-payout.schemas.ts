/**
 * org-payout.schemas.ts
 * -----------------------------------------------------------------------------
 * Organization payouts: money given to an organization (church gifts, later
 * other income) is collected by Fockis, a Fockis fee is kept, and the rest is
 * transferred to the organization's Stripe Connect account on the schedule the
 * organization chose.
 *
 * Money is stored in integer cents. Percentages are basis points (300 = 3 %).
 * Every entry and account carries the Stripe mode (test / live) it belongs to,
 * because the local API and the live API can share one database.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type StripeMode = "test" | "live";
export type ScheduleInterval = "manual" | "daily" | "weekly" | "monthly";

/* ------------------------------------------------------------------ fee rules */

@Schema({ _id: false })
export class OrgFeeRules {
  /** Percentage of each gift, basis points (300 = 3 %). */
  @Prop({ type: Number, min: 0, max: 5000, default: 0 })
  percentBps!: number;

  /** Fixed amount per gift, in cents of the fee currency. */
  @Prop({ type: Number, min: 0, default: 0 })
  fixedCents!: number;

  @Prop({ type: Number, min: 0, default: 0 })
  minFeeCents!: number;

  /** null = no maximum. */
  @Prop({ type: Number, min: 0, default: null })
  maxFeeCents!: number | null;
}
export const OrgFeeRulesSchema = SchemaFactory.createForClass(OrgFeeRules);

/* ---------------------------------------------------- platform-wide settings */

/** One document (key "default"), edited in Admin Center → Finance → Organization payouts. */
@Schema({ timestamps: true, collection: "org_payout_config" })
export class OrgPayoutConfig {
  @Prop({ type: String, required: true, unique: true, default: "default" })
  key!: string;

  @Prop({ type: OrgFeeRulesSchema, default: () => ({}) })
  fee!: OrgFeeRules;

  /** Lowercase currency the fixed / min / max fee amounts are in. */
  @Prop({ type: String, lowercase: true, default: "usd" })
  feeCurrency!: string;

  /** Days after a gift is paid before it can be paid out. */
  @Prop({ type: Number, min: 0, max: 90, default: 7 })
  holdDays!: number;

  /** Givers may add the fee on top so the organization receives the full gift. */
  @Prop({ type: Boolean, default: true })
  coverFeeEnabled!: boolean;

  /** Smallest payout an organization may set as its minimum. */
  @Prop({ type: Number, min: 0, default: 100 })
  minPayoutFloorCents!: number;

  @Prop({ type: String, default: "" })
  updatedBy!: string;
}
export const OrgPayoutConfigSchema = SchemaFactory.createForClass(OrgPayoutConfig);
export type OrgPayoutConfigDocument = HydratedDocument<OrgPayoutConfig>;

/* ------------------------------------------------- per-organization settings */

@Schema({ _id: false })
export class OrgPayoutSchedule {
  @Prop({ type: String, enum: ["manual", "daily", "weekly", "monthly"], default: "weekly" })
  interval!: ScheduleInterval;

  /** 0 = Sunday … 6 = Saturday (weekly). */
  @Prop({ type: Number, min: 0, max: 6, default: 1 })
  weeklyDay!: number;

  /** 1 … 28 (monthly). */
  @Prop({ type: Number, min: 1, max: 28, default: 1 })
  monthlyDay!: number;
}
export const OrgPayoutScheduleSchema = SchemaFactory.createForClass(OrgPayoutSchedule);

@Schema({ timestamps: true, collection: "org_payout_accounts" })
export class OrgPayoutAccount {
  @Prop({ type: Types.ObjectId, ref: "Organization", required: true, unique: true, index: true })
  organizationId!: Types.ObjectId;

  /** Stripe Connect (Accounts v2 recipient) account. */
  @Prop({ type: String, default: "" })
  stripeAccountId!: string;

  @Prop({ type: String, enum: ["test", "live", ""], default: "" })
  stripeMode!: StripeMode | "";

  @Prop({ type: Boolean, default: false })
  transfersActive!: boolean;

  @Prop({ type: [String], default: [] })
  requirementsDue!: string[];

  @Prop({ type: OrgPayoutScheduleSchema, default: () => ({}) })
  schedule!: OrgPayoutSchedule;

  /** Payouts smaller than this wait for more gifts (cents). */
  @Prop({ type: Number, min: 0, default: 1000 })
  minPayoutCents!: number;

  /** Admin-set fee for this organization; null = platform default. */
  @Prop({ type: OrgFeeRulesSchema, default: null })
  feeOverride!: OrgFeeRules | null;

  @Prop({ type: Boolean, default: false })
  onHold!: boolean;

  @Prop({ type: String, default: "", maxlength: 300 })
  holdReason!: string;

  @Prop({ type: Date, default: null, index: true })
  nextRunAt!: Date | null;

  @Prop({ type: Date, default: null })
  lastRunAt!: Date | null;

  /** Prevents two API instances from paying the same organization at once. */
  @Prop({ type: Date, default: null })
  runLockUntil!: Date | null;
}
export const OrgPayoutAccountSchema = SchemaFactory.createForClass(OrgPayoutAccount);
export type OrgPayoutAccountDocument = HydratedDocument<OrgPayoutAccount>;

/* ---------------------------------------------------------------- the ledger */

export type LedgerKind = "income" | "refund";
export type LedgerStatus = "pending" | "in_payout" | "paid";

/**
 * One line of money owed to an organization.
 *   income: a paid gift (gross − Fockis fee = net)
 *   refund: money taken back after a refund (negative net)
 * "pending" lines become payable once availableAt has passed.
 */
@Schema({ timestamps: true, collection: "org_payout_ledger" })
export class OrgLedgerEntry {
  @Prop({ type: Types.ObjectId, ref: "Organization", required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: String, enum: ["income", "refund"], required: true })
  kind!: LedgerKind;

  /** What the money came from, e.g. "church_gift". */
  @Prop({ type: String, required: true })
  sourceType!: string;

  @Prop({ type: String, required: true })
  sourceId!: string;

  /** Fockis payment record id (payments collection). */
  @Prop({ type: String, required: true, index: true })
  paymentId!: string;

  /** Unique per entry: "income:<paymentId>" or "refund:<paymentId>:<refundedCents>". */
  @Prop({ type: String, required: true, unique: true })
  dedupeKey!: string;

  @Prop({ type: String, enum: ["test", "live"], required: true })
  stripeMode!: StripeMode;

  /** Currency of the money in Fockis' Stripe balance (lowercase). */
  @Prop({ type: String, required: true, lowercase: true })
  currency!: string;

  @Prop({ type: Number, required: true })
  grossCents!: number;

  @Prop({ type: Number, required: true })
  feeCents!: number;

  /** Part of gross the giver added to cover the fee. */
  @Prop({ type: Number, default: 0 })
  coveredFeeCents!: number;

  /** Stripe's own processing fee (for reporting; paid by Fockis). */
  @Prop({ type: Number, default: 0 })
  stripeFeeCents!: number;

  @Prop({ type: Number, required: true })
  netCents!: number;

  /** Fee rule used, frozen when the money arrived. */
  @Prop({ type: Object, default: {} })
  feeRule!: Record<string, unknown>;

  @Prop({ type: String, enum: ["pending", "in_payout", "paid"], default: "pending", index: true })
  status!: LedgerStatus;

  @Prop({ type: Date, required: true, index: true })
  availableAt!: Date;

  @Prop({ type: Types.ObjectId, default: null, index: true })
  payoutId!: Types.ObjectId | null;

  @Prop({ type: String, default: "", maxlength: 200 })
  description!: string;
}
export const OrgLedgerEntrySchema = SchemaFactory.createForClass(OrgLedgerEntry);
OrgLedgerEntrySchema.index({ organizationId: 1, stripeMode: 1, status: 1, availableAt: 1 });
export type OrgLedgerEntryDocument = HydratedDocument<OrgLedgerEntry>;

/* ------------------------------------------------------------------ payouts */

export type OrgPayoutStatus = "processing" | "paid" | "failed";

@Schema({ timestamps: true, collection: "org_payouts" })
export class OrgPayout {
  @Prop({ type: Types.ObjectId, ref: "Organization", required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: String, enum: ["test", "live"], required: true })
  stripeMode!: StripeMode;

  @Prop({ type: String, required: true, lowercase: true })
  currency!: string;

  @Prop({ type: Number, required: true, min: 0 })
  amountCents!: number;

  @Prop({ type: Number, default: 0 })
  grossCents!: number;

  @Prop({ type: Number, default: 0 })
  feeCents!: number;

  @Prop({ type: Number, default: 0 })
  entryCount!: number;

  @Prop({ type: String, enum: ["processing", "paid", "failed"], default: "processing", index: true })
  status!: OrgPayoutStatus;

  @Prop({ type: String, enum: ["schedule", "manual"], required: true })
  trigger!: "schedule" | "manual";

  @Prop({ type: String, default: "" })
  requestedBy!: string;

  @Prop({ type: String, default: "" })
  stripeAccountId!: string;

  @Prop({ type: String, default: "" })
  stripeTransferId!: string;

  @Prop({ type: String, default: "", maxlength: 500 })
  failureMessage!: string;

  @Prop({ type: Date, default: null })
  paidAt!: Date | null;
}
export const OrgPayoutSchema = SchemaFactory.createForClass(OrgPayout);
export type OrgPayoutDocument = HydratedDocument<OrgPayout>;
