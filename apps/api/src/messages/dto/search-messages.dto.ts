import {
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class SearchMessagesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  query!: string;

  @IsOptional()
  @IsMongoId()
  conversationId?: string;
}