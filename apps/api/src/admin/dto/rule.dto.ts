import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ShopRuleDto {
  @IsString()
  @MaxLength(120)
  key!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  value?: unknown;
}
