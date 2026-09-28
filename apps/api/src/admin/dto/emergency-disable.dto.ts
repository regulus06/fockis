import { IsBoolean, IsOptional, IsString } from "class-validator";

export class EmergencyDisableDto {
  @IsBoolean()
  disabled!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}
