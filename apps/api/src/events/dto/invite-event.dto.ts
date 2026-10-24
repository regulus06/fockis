import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId } from "class-validator";

export class InviteEventDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Choose at least one person to invite." })
  @ArrayMaxSize(100, { message: "You can invite at most 100 people at once." })
  @IsMongoId({ each: true, message: "Invalid user ID." })
  userIds!: string[];
}
