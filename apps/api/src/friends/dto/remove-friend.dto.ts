import {
  IsMongoId,
} from "class-validator";


export class RemoveFriendDto {

  @IsMongoId()
  userId!: string;

}