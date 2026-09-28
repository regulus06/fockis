import {
  IsString,
} from "class-validator";


export class SearchFriendsDto {

  @IsString()
  q!: string;

}