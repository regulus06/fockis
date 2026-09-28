import {
  IsString,
  MaxLength,
} from "class-validator";

export class CreateReactionDto {
  @IsString()
  @MaxLength(20)
  emoji!: string;
}