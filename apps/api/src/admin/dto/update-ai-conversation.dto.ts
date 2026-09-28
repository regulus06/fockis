import { IsIn, IsOptional, IsString } from "class-validator";

export class UpdateAiConversationDto {
  @IsOptional()
  @IsIn(["active", "completed", "blocked", "flagged", "archived"])
  status?: string;

  @IsOptional()
  @IsString()
  moderationNote?: string;

  @IsOptional()
  @IsString()
  summary?: string;
}
