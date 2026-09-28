import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketplaceRuleDocument = MarketplaceRule & Document;

@Schema({ timestamps: true })
export class MarketplaceRule {

  // =========================
  // RULE TYPE
  // =========================
  @Prop({ required: true, enum: ['country', 'city', 'state'] })
  type!: 'country' | 'city' | 'state';

  // =========================
  // VALUE (normalized lowercase)
  // =========================
  @Prop({ required: true, index: true })
  value!: string;

  // =========================
  // ACTION
  // =========================
  @Prop({ required: true, enum: ['block', 'allow'] })
  action!: 'block' | 'allow';

  // =========================
  // OPTIONAL MESSAGE
  // =========================
  @Prop({ default: '' })
  reason!: string;

  // =========================
  // STATUS
  // =========================
  @Prop({ default: true })
  active!: boolean;
}

export const MarketplaceRuleSchema =
  SchemaFactory.createForClass(MarketplaceRule);