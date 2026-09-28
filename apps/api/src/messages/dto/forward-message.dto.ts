import {
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  ArrayMinSize,
  MaxLength,
} from "class-validator";

export class ForwardMessageDto {
  @IsMongoId()
  messageId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsMongoId({
    each: true,
  })
  conversationIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  caption?: string;
}