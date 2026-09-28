import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateAiSettingsDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emergencyDisabled?: boolean;

  @IsOptional()
  @IsBoolean()
  allowChat?: boolean;

  @IsOptional()
  @IsBoolean()
  allowVoice?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPhoneCalls?: boolean;

  @IsOptional()
  @IsBoolean()
  allowRecommendations?: boolean;

  @IsOptional()
  @IsBoolean()
  allowSpecialAds?: boolean;

  @IsOptional()
  @IsNumber()
  defaultDailyCredits?: number;

  @IsOptional()
  @IsNumber()
  defaultMonthlyCredits?: number;

  @IsOptional()
  @IsString()
  vapiAssistantId?: string;

  @IsOptional()
  @IsString()
  vapiPhoneNumberId?: string;
}
