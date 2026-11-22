import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

/** Append-only record of every admin change to payout plans, assignments and holds, and every early payout. */
@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: "marketplace_finance_audit_log" })
export class FinanceAuditLog {
  @Prop({ required: true, index: true })
  action!: string;

  /** e.g. "payout_plan", "plan_assignment", "payout_hold", "early_payout", "commission". */
  @Prop({ required: true, index: true })
  entity!: string;

  @Prop({ type: String, default: "", index: true })
  entityId!: string;

  @Prop({ type: String, default: "", index: true })
  storeId!: string;

  @Prop({ type: String, required: true })
  actorUserId!: string;

  @Prop({ type: Object, default: {} })
  details!: Record<string, unknown>;
}

export type FinanceAuditLogDocument = HydratedDocument<FinanceAuditLog>;
export const FinanceAuditLogSchema = SchemaFactory.createForClass(FinanceAuditLog);
FinanceAuditLogSchema.index({ createdAt: -1 });
