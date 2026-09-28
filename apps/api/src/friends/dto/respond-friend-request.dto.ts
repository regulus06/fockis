import {
  IsMongoId,
} from "class-validator";


export class RespondFriendRequestDto {

  @IsMongoId()
  requestId!: string;

}