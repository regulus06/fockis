/**
 * church-giving.schemas.ts
 * -----------------------------------------------------------------------------
 * Online giving for a church (tithes, offerings, special gifts).
 *
 *   church_giving_settings  one per organization: on/off, currency, funds,
 *                           suggested amounts, message to givers.
 *   church_gifts            one per gift. Created "pending" before the card
 *                           payment starts; marked "paid" only after the
 *                           universal Fockis payment service has verified the
 *                           Stripe payment (amount, currency and giver match).
 *
 * No card data is stored here: card details go straight from the browser to
 * Stripe, and only the payment ID / PaymentIntent ID are kept.
 * -----------------------------------------------------------------------------
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
export class GivingFund {
  @Prop({ type: String, required: true, trim: true, maxlength: 40 })
  key!: string;

  @Prop({ type: String, required: true, trim: true, maxlength: 60 })
  label!: string;

  @Prop({ type: String, default: '', trim: true, maxlength: 200 })
  description!: string;

  @Prop({ type: Boolean, default: true })
  active!: boolean;
}
export const GivingFundSchema = SchemaFactory.createForClass(GivingFund);

export type ChurchGivingSettingsDocument = HydratedDocument<ChurchGivingSettings>;

@Schema({ timestamps: true, collection: 'church_giving_settings' })
export class ChurchGivingSettings {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, unique: true, index: true })
  organizationId!: Types.ObjectId;

  /** Off until a church administrator turns it on. */
  @Prop({ type: Boolean, default: false })
  enabled!: boolean;

  @Prop({ type: String, default: 'USD', uppercase: true, maxlength: 3 })
  currency!: string;

  @Prop({ type: [GivingFundSchema], default: [] })
  funds!: GivingFund[];

  @Prop({ type: [Number], default: [] })
  suggestedAmounts!: number[];

  @Prop({ type: String, default: '', maxlength: 600 })
  message!: string;

  @Prop({ type: String, default: '', maxlength: 400 })
  thankYouMessage!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedByUserId!: Types.ObjectId | null;
}
export const ChurchGivingSettingsSchema = SchemaFactory.createForClass(ChurchGivingSettings);

export type ChurchGiftDocument = HydratedDocument<ChurchGift>;

@Schema({ timestamps: true, collection: 'church_gifts' })
export class ChurchGift {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true, index: true })
  organizationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, default: null })
  membershipId!: Types.ObjectId | null;

  /** Kept even for anonymous gifts so the giver can see their own history; hidden from staff when anonymous. */
  @Prop({ type: String, default: '', maxlength: 120 })
  giverName!: string;

  @Prop({ type: Boolean, default: false })
  anonymous!: boolean;

  @Prop({ type: String, required: true, maxlength: 40 })
  fundKey!: string;

  @Prop({ type: String, required: true, maxlength: 60 })
  fundLabel!: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount!: number;

  /** Added by the giver so the church receives the full amount (same currency). */
  @Prop({ type: Number, default: 0, min: 0 })
  coverFee!: number;

  @Prop({ type: String, required: true, uppercase: true, maxlength: 3 })
  currency!: string;

  @Prop({ type: String, default: '', maxlength: 300 })
  note!: string;

  @Prop({ type: String, enum: ['pending', 'paid', 'failed'], default: 'pending', index: true })
  status!: 'pending' | 'paid' | 'failed';

  @Prop({ type: String, default: null })
  paymentId!: string | null;

  @Prop({ type: String, default: null, index: true })
  paymentIntentId!: string | null;

  @Prop({ type: Number, default: null })
  chargedAmount!: number | null;

  @Prop({ type: String, default: null })
  chargedCurrency!: string | null;

  @Prop({ type: String, default: '' })
  receiptNumber!: string;

  @Prop({ type: Date, default: null, index: true })
  paidAt!: Date | null;
}
export const ChurchGiftSchema = SchemaFactory.createForClass(ChurchGift);
ChurchGiftSchema.index({ organizationId: 1, status: 1, paidAt: -1 });
ChurchGiftSchema.index({ organizationId: 1, userId: 1, createdAt: -1 });
