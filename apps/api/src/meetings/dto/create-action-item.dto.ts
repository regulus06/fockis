import {
  IsISO8601,
  IsOptional,
  IsString,
  IsMongoId,
} from "class-validator";

export class CreateActionItemDto {
  @IsString()
  task!: string;

  @IsOptional()
  @IsMongoId()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  assigneeName?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;
}