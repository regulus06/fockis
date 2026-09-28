import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type FockisIdSettingsDocument =
  HydratedDocument<FockisIdSettings>;

@Schema({
  collection: 'fockis_id_settings',
  timestamps: true,
})
export class FockisIdSettings {
  // ============================================================
  // REGISTRATION
  // ============================================================

  @Prop({
    type: Boolean,
    default: true,
  })
  registrationEnabled!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  uniquenessRequired!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  caseInsensitive!: boolean;

  // ============================================================
  // ID FORMAT
  // ============================================================

  @Prop({
    type: Number,
    default: 3,
    min: 1,
  })
  minimumLength!: number;

  @Prop({
    type: Number,
    default: 30,
    min: 1,
  })
  maximumLength!: number;

  @Prop({
    type: String,
    default: '^[a-zA-Z0-9._-]+$',
  })
  allowedCharactersPattern!: string;

  // ============================================================
  // FOCKIS ID PRICING
  // ============================================================

  /**
   * Price is controlled by the administrator.
   *
   * There is intentionally NO hard-coded $9.99 default.
   *
   * The admin pricing page must configure this value.
   */
  @Prop({
    type: Number,
    required: false,
    default: null,
    min: 0,
  })
  price!: number | null;

  @Prop({
    type: String,
    default: 'USD',
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 3,
  })
  currency!: string;

  /**
   * One-time Fockis ID access payment.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  oneTime!: boolean;

  /**
   * Recurring payment option.
   *
   * Your current User schema uses permanent
   * fockisIdAccessPaid access, so recurring billing
   * requires additional subscription/webhook handling
   * before it should be enabled in production.
   */
  @Prop({
    type: Boolean,
    default: false,
  })
  recurring!: boolean;

  /**
   * If false, users can access their Fockis ID
   * without payment.
   */
  @Prop({
    type: Boolean,
    default: true,
  })
  requirePayment!: boolean;

  // ============================================================
  // RESERVATION
  // ============================================================

  @Prop({
    type: Number,
    default: 0,
    min: 0,
  })
  reservationDays!: number;

  // ============================================================
  // USER ID OPTIONS
  // ============================================================

  @Prop({
    type: Boolean,
    default: true,
  })
  allowUserChange!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  allowUsernameStyleIds!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  allowNumbers!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  allowUnderscore!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  allowHyphen!: boolean;

  @Prop({
    type: Boolean,
    default: true,
  })
  allowPeriod!: boolean;
}

// ============================================================
// CREATE SCHEMA
// ============================================================

export const FockisIdSettingsSchema =
  SchemaFactory.createForClass(FockisIdSettings);