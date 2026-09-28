import {
  IsMongoId,
} from "class-validator";


export class SendFriendRequestDto {

  @IsMongoId()
  userId!: string;

}