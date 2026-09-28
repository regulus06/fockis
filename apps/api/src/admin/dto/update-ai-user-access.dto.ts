import { IsDateString, IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class UpdateAiUserAccessDto {
  @IsOptional()
  @IsIn(["INHERIT", "CUSTOM", "GRANTED", "BLOCKED"])
  mode?: "INHERIT" | "CUSTOM" | "GRANTED" | "BLOCKED";

  @IsOptional()
  @IsObject()
  features?: Record<string, boolean>;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  updatedBy?: string;
}
