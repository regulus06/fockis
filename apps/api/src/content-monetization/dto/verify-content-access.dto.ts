import {
  IsString,
} from "class-validator";

export class VerifyContentAccessDto {
  @IsString()
  contentId!: string;
}