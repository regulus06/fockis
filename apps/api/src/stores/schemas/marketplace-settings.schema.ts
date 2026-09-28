import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketplaceSettingsDocument = MarketplaceSettings & Document;

@Schema({ timestamps: true })
export class MarketplaceSettings {

  // =========================
  // GLOBAL RULES
  // =========================

  @Prop({ type: [String], default: [] })
  allowedCountries!: string[];

  @Prop({ type: [String], default: [] })
  blockedCountries!: string[];

  @Prop({ type: [String], default: [] })
  blockedCities!: string[];

  @Prop({ type: [String], default: [] })
  blockedStates!: string[];

  // If true → only allowedCountries can sell
  @Prop({ default: false })
  strictCountryMode!: boolean;

  // =========================
  // SHIPPING RULES
  // =========================

  @Prop({ default: true })
  allowInternationalShipping!: boolean;

  @Prop({ type: [String], default: [] })
  supportedRegions!: string[];
}

export const MarketplaceSettingsSchema =
  SchemaFactory.createForClass(MarketplaceSettings);