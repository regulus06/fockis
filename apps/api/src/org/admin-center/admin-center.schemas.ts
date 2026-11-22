/**
 * admin-center.schemas.ts
 * -----------------------------------------------------------------------------
 * Settings & Roles (Organization Administration Center).
 *
 *   organization_preferences  one per organization: time zone, language,
 *                             date/time format, currencies, notification
 *                             switches and public-visibility switches.
 *                             (Name, type, status, discoverability and
 *                             approval stay on the Organization document.)
 *   organization_audit_logs   append-only administrative history. There is no
 *                             API to edit or delete entries, and update
 *                             queries on the model are refused.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class CurrencyPreferences {
  /** ISO 4217 code. */
  @Prop({ type: String, default: 'USD', uppercase: true, maxlength: 3 })
  defaultCurrency!: string;

  @Prop({ type: [String], default: [] })
  acceptedCurrencies!: string[];

  @Prop({ type: Boolean, default: false })
  multiCurrency!: boolean;

  /** Show converted amounts (next to the original) in reports. */
  @Prop({ type: Boolean, default: true })
  showConverted!: boolean;
}
export const CurrencyPreferencesSchema = SchemaFactory.createForClass(CurrencyPreferences);

@Schema({ _id: false })
export class ExchangeRateSnapshot {
  @Prop({ type: String, uppercase: true, maxlength: 3 })
  base!: string;

  /** target code → units of target per 1 base. */
  @Prop({ type: Object, default: {} })
  rates!: Record<string, number>;

  @Prop({ type: Date })
  fetchedAt!: Date;

  @Prop({ type: String, default: '' })
  provider!: string;
}
export const ExchangeRateSnapshotSchema = SchemaFactory.createForClass(ExchangeRateSnapshot);

export const NOTIFICATION_KEYS = [
  'email',
  'members',
  'eventReminders',
  'ministryAnnouncements',
  'donations',
  'financialApprovals',
  'security',
  'admin',
] as const;
export type NotificationKey = (typeof NOTIFICATION_KEYS)[number];

export type OrganizationPreferencesDocument = HydratedDocument<OrganizationPreferences>;

@Schema({ timestamps: true, collection: 'organization_preferences' })
export class OrganizationPreferences {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true })
  organizationId!: Types.ObjectId;

  /** IANA time zone, e.g. America/Port-au-Prince. */
  @Prop({ type: String, default: '' })
  timeZone!: string;

  /** BCP 47 language tag, e.g. fr, ht, en. */
  @Prop({ type: String, default: '' })
  language!: string;

  @Prop({ type: String, enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'D MMM YYYY'], default: 'DD/MM/YYYY' })
  dateFormat!: string;

  @Prop({ type: String, enum: ['24h', '12h'], default: '24h' })
  timeFormat!: string;

  @Prop({ type: CurrencyPreferencesSchema, default: () => ({}) })
  currency!: CurrencyPreferences;

  @Prop({ type: ExchangeRateSnapshotSchema, default: null })
  exchangeRates!: ExchangeRateSnapshot | null;

  /** Public-visibility switches (Quick Settings). */
  @Prop({ type: Boolean, default: true })
  allowMembershipRequests!: boolean;

  @Prop({ type: Boolean, default: true })
  showLocationsPublicly!: boolean;

  @Prop({ type: Boolean, default: true })
  publicEvents!: boolean;

  @Prop({ type: Boolean, default: true })
  memberDirectory!: boolean;

  /** Organization-level notification switches. */
  @Prop({ type: Object, default: {} })
  notifications!: Partial<Record<NotificationKey, boolean>>;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedByUserId!: Types.ObjectId | null;
}
export const OrganizationPreferencesSchema = SchemaFactory.createForClass(OrganizationPreferences);

export type OrganizationAuditLogDocument = HydratedDocument<OrganizationAuditLog>;

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'organization_audit_logs' })
export class OrganizationAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorUserId!: Types.ObjectId | null;

  @Prop({ type: String, default: '' })
  actorName!: string;

  /** e.g. settings.updated, role.changed, permissions.changed, ownership.transferred */
  @Prop({ type: String, required: true, index: true })
  action!: string;

  /** settings | team | permissions | security | finance | profile | organization */
  @Prop({ type: String, required: true, index: true })
  category!: string;

  @Prop({ type: String, default: '' })
  targetType!: string;

  @Prop({ type: String, default: '' })
  targetId!: string;

  @Prop({ type: String, default: '' })
  targetLabel!: string;

  @Prop({ type: Object, default: null })
  before!: Record<string, unknown> | null;

  @Prop({ type: Object, default: null })
  after!: Record<string, unknown> | null;

  @Prop({ type: String, default: '' })
  details!: string;

  createdAt?: Date;
}
export const OrganizationAuditLogSchema = SchemaFactory.createForClass(OrganizationAuditLog);
OrganizationAuditLogSchema.index({ organizationId: 1, createdAt: -1 });
OrganizationAuditLogSchema.index({ organizationId: 1, category: 1, createdAt: -1 });

// Audit history is append-only.
for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne', 'findOneAndReplace'] as const) {
  OrganizationAuditLogSchema.pre(op, function () {
    throw new Error('Audit log entries cannot be modified.');
  });
}
