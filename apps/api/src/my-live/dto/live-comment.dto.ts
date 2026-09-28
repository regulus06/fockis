import {
  IsMongoId,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class LiveCommentDto {
  @IsMongoId()
  streamId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  message!: string;
}