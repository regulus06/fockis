import {
  IsBoolean,
  IsMongoId,
} from "class-validator";

export class LiveLikeDto {
  @IsMongoId()
  streamId!: string;

  @IsBoolean()
  liked!: boolean;
}