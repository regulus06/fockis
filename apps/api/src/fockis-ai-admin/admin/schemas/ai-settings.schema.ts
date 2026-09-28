import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type AiSettingsDocument = HydratedDocument<AiSettings>;

@Schema({ timestamps: true, collection: "ai_settings" })
export class AiSettings {
  @Prop({ default: true })
  enabled!: boolean;

  @Prop({ default: false })
  emergencyDisabled!: boolean;

  @Prop({ default: "" })
  emergencyReason!: string;

  @Prop({ type: Date, default: null })
  emergencyDisabledAt?: Date | null;

  @Prop({ default: true })
  allowChat!: boolean;

  @Prop({ default: true })
  allowVoice!: boolean;

  @Prop({ default: true })
  allowPhoneCalls!: boolean;

  @Prop({ default: true })
  allowRecommendations!: boolean;

  @Prop({ default: true })
  allowSpecialAds!: boolean;

  @Prop({ default: 100 })
  defaultDailyCredits!: number;

  @Prop({ default: 3000 })
  defaultMonthlyCredits!: number;

  @Prop({ default: "" })
  vapiAssistantId!: string;

  @Prop({ default: "" })
  vapiPhoneNumberId!: string;
}

export const AiSettingsSchema =
  SchemaFactory.createForClass(AiSettings);
