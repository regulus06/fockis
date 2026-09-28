import {
  IsString,
} from "class-validator";

export class PurchaseDownloadDto {
  @IsString()
  contentId!: string;
}