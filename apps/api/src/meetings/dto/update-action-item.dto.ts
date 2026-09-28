import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
} from "class-validator";

export class UpdateActionItemDto {
  @IsOptional()
  @IsString()
  task?: string;

  @IsOptional()
  @IsString()
  assigneeName?: string;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}