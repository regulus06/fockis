import {
  IsMongoId,
} from "class-validator";

export class JoinLiveDto {
  @IsMongoId()
  streamId!: string;
}