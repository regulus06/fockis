import {
  IsIn,
} from "class-validator";

export class ReactionDto {
  @IsIn([
    "❤️",
    "😂",
    "👍",
    "😮",
    "😢",
    "🙏",
  ])
  emoji!:
    | "❤️"
    | "😂"
    | "👍"
    | "😮"
    | "😢"
    | "🙏";
}