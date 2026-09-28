import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class ModerationActionDto {
  @IsIn(["approve", "reject", "changes_requested", "flag", "suspend", "restore", "hide", "block", "delete"])
  action!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
