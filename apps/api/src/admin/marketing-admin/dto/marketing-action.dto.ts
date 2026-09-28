import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class MarketingActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsBoolean()
  notifyAdvertiser?: boolean;

  @IsOptional()
  @IsBoolean()
  stopAllCampaignDelivery?: boolean;
}
