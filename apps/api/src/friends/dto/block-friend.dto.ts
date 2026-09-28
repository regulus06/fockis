import {
  IsMongoId,
} from "class-validator";


export class BlockFriendDto {

  @IsMongoId()
  userId!: string;

}