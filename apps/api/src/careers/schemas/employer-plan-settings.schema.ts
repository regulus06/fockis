import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes } from "mongoose";

export type EmployerPlanSettingsDocument = HydratedDocument<EmployerPlanSettings>;

/** One employer plan. Price and limits are set by Fockis admins. */
export interface EmployerPlanConfig {
  /** "free" | "growth" | "enterprise" */
  id: string;
  name: string;
  description: string;
  features: string[];
  /** Price per period. 0 = free. */
  price: number;
  /** Months one payment covers. 0 = one-time (lifetime). */
  periodMonths: number;
  /** Live (open) jobs allowed at the same time. 0 = unlimited. */
  maxActiveJobs: number;
}

export interface EmployerPlanChange {
  summary: string;
  byName?: string;
  at: Date;
}

/**
 * Employer plans for Fockis Careers — one document (key "default"), edited in
 * Admin Center → Careers → Employer plans. Nothing here is hard-coded.
 */
@Schema({ timestamps: true, collection: "employer_plan_settings" })
export class EmployerPlanSettings {
  @Prop({ required: true, unique: true, default: "default" })
  key!: string;

  /** Off = every plan is free (employers switch plans without paying). */
  @Prop({ default: false })
  enabled!: boolean;

  @Prop({ default: "USD", uppercase: true, trim: true })
  currency!: string;

  /** Days a lapsed paid plan keeps working before falling back to Free. */
  @Prop({ default: 7, min: 0, max: 180 })
  graceDays!: number;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  plans!: EmployerPlanConfig[];

  @Prop({ trim: true, maxlength: 600 })
  note?: string;

  @Prop({ type: [SchemaTypes.Mixed], default: [] })
  history!: EmployerPlanChange[];
}

export const EmployerPlanSettingsSchema = SchemaFactory.createForClass(EmployerPlanSettings);
