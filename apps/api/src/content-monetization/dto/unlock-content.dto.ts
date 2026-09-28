import {
  IsEnum,
  IsString,
} from "class-validator";

import {
  PurchaseType,
} from "../types/content-monetization.types";

export class UnlockContentDto {
  @IsString()
  contentId!: string;

  @IsEnum(PurchaseType)
  purchaseType!: PurchaseType;
}